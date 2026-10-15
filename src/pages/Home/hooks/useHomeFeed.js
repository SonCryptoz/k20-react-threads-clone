import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router";
import postService from "@/services/postService";
import useInfiniteScroll from "@/hooks/useInfiniteScroll";
import userCache from "@/utils/userCache";

/**
 * useHomeFeed
 * Custom hook quản lý toàn bộ dữ liệu danh sách bài viết trang Home:
 * - Chuyển đổi giữa các tab (for_you, following, ghost)
 * - Tải bài viết theo trang (Pagination)
 * - Cuộn vô tận (Infinite Scroll)
 * - Xử lý Race Condition khi đổi tab nhanh
 * - Trạng thái loading, error, reload
 * - Tự động chèn bài viết mới tạo & cuộn mượt lên đầu trang
 */
export const useHomeFeed = ({ cardRef: externalCardRef, initialTab = "for_you" } = {}) => {
    const internalCardRef = useRef(null);
    const cardRef = externalCardRef || internalCardRef;
    const location = useLocation();

    // Tab đang chọn: "for_you" | "following" | "ghost"
    const [activeTab, setActiveTab] = useState(initialTab);

    // Dữ liệu bài viết và phân trang
    const [posts, setPosts] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Trạng thái tải
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState(null);

    // Ref lưu tab hiện tại để tránh race condition khi người dùng chuyển tab nhanh
    const currentTabRef = useRef(activeTab);

    useEffect(() => {
        currentTabRef.current = activeTab;
    }, [activeTab]);

    // Ref lưu các bài viết mới tạo trong phiên để đảm bảo không bị ghi đè khi tải trang 1
    const newlyCreatedPostsRef = useRef([]);
    // Ref lưu các ID bài viết đã xóa trong phiên để đảm bảo không bị hiện lại do cache API hoặc ref
    const deletedPostIdsRef = useRef(new Set());

    // Chèn bài viết mới tạo vào đầu bảng tin (chuyển sang tab "Dành cho bạn", bảo toàn bài viết trong newlyCreatedPostsRef)
    const addNewPost = useCallback((newPost) => {
        if (!newPost) return;
        const postKey = String(newPost.id);
        // Bỏ khỏi danh sách đã xóa nếu tình cờ trùng ID
        deletedPostIdsRef.current.delete(postKey);
        // Lưu vào ref các bài viết mới tạo để không bị mất khi refetch trang 1
        newlyCreatedPostsRef.current = [
            newPost,
            ...newlyCreatedPostsRef.current.filter((p) => String(p.id) !== postKey),
        ];
        // Chuyển về tab For You để người dùng thấy bài viết vừa tạo ngay trên đầu
        setActiveTab("for_you");
        // Cập nhật state posts
        setPosts((prev) => [
            newPost,
            ...prev.filter((p) => String(p.id) !== postKey),
        ]);
    }, []);

    // Xóa bài viết khỏi cả ref bài mới tạo, ref đã xóa và state posts
    const removePost = useCallback((deletedPostId) => {
        if (!deletedPostId) return;
        const idStr = String(deletedPostId);
        deletedPostIdsRef.current.add(idStr);
        userCache.markPostDeleted(idStr);
        const filterFn = (p) => {
            const pid = String(p.id);
            const origId = String(p.original_post_id || p.original_post?.id || "");
            return pid !== idStr && origId !== idStr;
        };
        newlyCreatedPostsRef.current = newlyCreatedPostsRef.current.filter(filterFn);
        setPosts((prev) => prev.filter(filterFn));
    }, []);

    // Cập nhật bài viết trong cả ref bài mới tạo và state posts khi có chỉnh sửa (Edit)
    const updatePost = useCallback((updatedPost) => {
        if (!updatedPost?.id) return;
        const updatedIdStr = String(updatedPost.id);
        newlyCreatedPostsRef.current = newlyCreatedPostsRef.current.map((p) =>
            String(p.id) === updatedIdStr ? { ...p, ...updatedPost } : p,
        );
        setPosts((prev) =>
            prev.map((p) => (String(p.id) === updatedIdStr ? { ...p, ...updatedPost } : p)),
        );
    }, []);

    // Hàm gọi API lấy danh sách bài viết theo trang và tab
    const fetchFeed = useCallback(async (tabKey, pageNum, isInitial = false) => {
        if (isInitial) {
            setIsLoading(true);
            setError(null);
        } else {
            setIsLoadingMore(true);
        }

        try {
            const response = await postService.getFeed({
                type: tabKey,
                page: pageNum,
                per_page: 10,
            });

            // 1. Chống Race Condition: Nếu người dùng đã chuyển tab khác trong lúc request đang gửi -> hủy kết quả
            if (currentTabRef.current !== tabKey) return;

            // 2. Chuẩn hóa dữ liệu bài viết từ server thành mảng hợp lệ
            const rawData = response?.data;
            const rawPosts = Array.isArray(rawData)
                ? rawData
                : Array.isArray(rawData?.data)
                  ? rawData.data
                  : [];

            // 3. Lọc bỏ các bài viết đã bị xóa trong phiên làm việc hoặc trong cache
            const newPosts = rawPosts.filter(
                (p) =>
                    !deletedPostIdsRef.current.has(String(p.id)) &&
                    !deletedPostIdsRef.current.has(String(p.original_post_id)) &&
                    !deletedPostIdsRef.current.has(String(p.original_post?.id)) &&
                    !userCache.isPostDeleted(p.id) &&
                    !userCache.isPostDeleted(p.original_post_id) &&
                    !userCache.isPostDeleted(p.original_post?.id),
            );

            // 4. Lưu bài viết và thông tin tác giả vào userCache client-side
            userCache.savePosts(newPosts);

            const pagination = response?.pagination || response?.data?.pagination || {};

            // 5. Cập nhật state bài viết (Trang 1: hòa trộn bài vừa tạo; Trang > 1: nối thêm bài viết)
            setPosts((prev) => {
                if (pageNum === 1) {
                    const activeNewlyCreated = newlyCreatedPostsRef.current.filter(
                        (p) => !deletedPostIdsRef.current.has(String(p.id)),
                    );
                    if (activeNewlyCreated.length > 0 && tabKey === "for_you") {
                        const newPostIds = new Set(
                            activeNewlyCreated.map((p) => String(p.id)),
                        );
                        const remainingServerPosts = newPosts.filter(
                            (p) => !newPostIds.has(String(p.id)),
                        );
                        return [...activeNewlyCreated, ...remainingServerPosts];
                    }
                    return newPosts;
                }
                const existingIds = new Set(prev.map((p) => String(p.id)));
                const uniqueNewPosts = newPosts.filter((p) => !existingIds.has(String(p.id)));
                return [...prev, ...uniqueNewPosts];
            });

            // 6. Xác định xem còn bài viết ở các trang tiếp theo hay không
            const lastPage = pagination.last_page || (newPosts.length < 10 ? pageNum : pageNum + 1);
            setHasMore(pageNum < lastPage && newPosts.length > 0);
            setPage(pageNum);
        } catch (err) {
            // 7. Xử lý lỗi: Ghi nhận thông báo lỗi nếu tab vẫn đang kích hoạt
            if (currentTabRef.current === tabKey) {
                setError(err?.message || "Không thể tải danh sách bài viết");
            }
        } finally {
            // 8. Tắt trạng thái tải
            if (currentTabRef.current === tabKey) {
                setIsLoading(false);
                setIsLoadingMore(false);
            }
        }
    }, []);

    // Mỗi khi đổi tab -> tải lại từ trang 1
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPosts([]);
        setPage(1);
        setHasMore(true);
        fetchFeed(activeTab, 1, true);
    }, [activeTab, fetchFeed]);

    // Hàm cuộn mượt lên đỉnh khung card và cửa sổ
    const scrollToTop = useCallback(() => {
        if (cardRef?.current) {
            cardRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
        if (typeof window !== "undefined") {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    }, [cardRef]);

    // Khi nhận được sự kiện post:created (khi đang ở sẵn Home): chèn bài viết và cuộn mượt lên đầu trang
    useEffect(() => {
        const handleGlobalPostCreated = (e) => {
            const newPost = e?.detail;
            if (!newPost) return;
            addNewPost(newPost);
            setTimeout(scrollToTop, 50);
        };

        window.addEventListener("post:created", handleGlobalPostCreated);
        return () => window.removeEventListener("post:created", handleGlobalPostCreated);
    }, [addNewPost, scrollToTop]);

    // Khi điều hướng từ trang khác về Home (kèm newPost trong location.state): chèn bài viết và cuộn mượt lên đầu trang
    useEffect(() => {
        const stateNewPost = location.state?.newPost;
        if (stateNewPost) {
            window.history.replaceState({}, document.title);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            addNewPost(stateNewPost);
            setTimeout(scrollToTop, 80);
        }
    }, [location.state, addNewPost, scrollToTop]);

    // Khi nhận được sự kiện post:deleted: xóa bài viết khỏi feed và ref để không bị hiện lại khi đổi tab
    useEffect(() => {
        const handleGlobalPostDeleted = (e) => {
            const deletedId = e?.detail;
            if (!deletedId) return;
            removePost(deletedId);
        };

        window.addEventListener("post:deleted", handleGlobalPostDeleted);
        return () => window.removeEventListener("post:deleted", handleGlobalPostDeleted);
    }, [removePost]);

    // Xử lý chuyển tab
    const handleTabChange = useCallback(
        (newTab) => {
            if (newTab === activeTab) return;
            setActiveTab(newTab);
        },
        [activeTab],
    );

    // Hàm tải thêm khi cuộn đến cuối trang
    const handleLoadMore = useCallback(() => {
        if (!isLoading && !isLoadingMore && hasMore) {
            fetchFeed(activeTab, page + 1, false);
        }
    }, [activeTab, page, hasMore, isLoading, isLoadingMore, fetchFeed]);

    // Hàm reload lại tab hiện tại
    const reloadFeed = useCallback(() => {
        fetchFeed(activeTab, 1, true);
    }, [activeTab, fetchFeed]);

    // Gắn Infinite Scroll hook
    const { lastElementRef } = useInfiniteScroll({
        onLoadMore: handleLoadMore,
        hasMore,
        isLoading: isLoading || isLoadingMore,
        rootMargin: "250px",
    });

    return {
        cardRef,
        scrollToTop,
        activeTab,
        posts,
        setPosts,
        page,
        hasMore,
        isLoading,
        isLoadingMore,
        error,
        handleTabChange,
        handleLoadMore,
        fetchFeed,
        reloadFeed,
        lastElementRef,
        addNewPost,
        removePost,
        updatePost,
    };
};

export default useHomeFeed;
