import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router";
import postService from "@/services/postService";
import useInfiniteScroll from "@/hooks/useInfiniteScroll";
import userCache from "@/utils/userCache";

// =========================================================================
// Module-level Cache cho Trang Home:
// Bảo toàn bài viết, phân trang và vị trí cuộn khi chuyển giữa các trang
// (Home <-> Search <-> Activity <-> Profile <-> PostDetail) giống Threads thật
// =========================================================================
const globalHomeFeedCache = {
    for_you: { posts: [], page: 1, hasMore: true, isLoaded: false, scrollTop: 0 },
    following: { posts: [], page: 1, hasMore: true, isLoaded: false, scrollTop: 0 },
    ghost: { posts: [], page: 1, hasMore: true, isLoaded: false, scrollTop: 0 },
    activeTab: "for_you",
    newlyCreatedPosts: [],
};

const updateCachedPostList = (list, detail) => {
    if (!Array.isArray(list)) return list;
    const targetIdStr = String(detail.postId);
    return list.map((p) => {
        const isMatch = String(p.id) === targetIdStr;
        const isOrigMatch = p.original_post && String(p.original_post.id) === targetIdStr;
        const isOrigIdMatch = p.original_post_id && String(p.original_post_id) === targetIdStr;
        if (!isMatch && !isOrigMatch && !isOrigIdMatch) {
            return p;
        }
        let updatedP = isMatch ? { ...p, ...detail } : { ...p };
        if (isOrigMatch) {
            const updatedOriginal = { ...p.original_post, ...detail };
            updatedP = {
                ...updatedP,
                original_post: updatedOriginal,
                ...(updatedOriginal.is_liked !== undefined && {
                    is_liked: updatedOriginal.is_liked,
                    is_liked_by_auth: updatedOriginal.is_liked_by_auth,
                    likes_count: updatedOriginal.likes_count,
                }),
                ...(updatedOriginal.is_reposted !== undefined && {
                    is_reposted: updatedOriginal.is_reposted,
                    is_reposted_by_auth: updatedOriginal.is_reposted_by_auth,
                    reposts_count: updatedOriginal.reposts_count,
                    reposts_and_quotes_count: updatedOriginal.reposts_and_quotes_count,
                }),
            };
        }
        if (isOrigIdMatch && !isOrigMatch) {
            updatedP = { ...updatedP, ...detail };
        }
        return updatedP;
    });
};

if (typeof window !== "undefined") {
    // Dọn dẹp cache trang chủ khi người dùng đăng xuất hoặc chuyển đổi tài khoản
    window.addEventListener("user:session_changed", () => {
        globalHomeFeedCache.for_you = { posts: [], page: 1, hasMore: true, isLoaded: false, scrollTop: 0 };
        globalHomeFeedCache.following = { posts: [], page: 1, hasMore: true, isLoaded: false, scrollTop: 0 };
        globalHomeFeedCache.ghost = { posts: [], page: 1, hasMore: true, isLoaded: false, scrollTop: 0 };
        globalHomeFeedCache.activeTab = "for_you";
        globalHomeFeedCache.newlyCreatedPosts = [];
    });

    // Đồng bộ tương tác (Like, Repost) vào toàn bộ cache các tab ở module level
    window.addEventListener("post:interaction_updated", (e) => {
        const detail = e.detail;
        if (!detail?.postId) return;
        ["for_you", "following", "ghost"].forEach((tabKey) => {
            if (globalHomeFeedCache[tabKey]?.posts) {
                globalHomeFeedCache[tabKey].posts = updateCachedPostList(
                    globalHomeFeedCache[tabKey].posts,
                    detail,
                );
            }
        });
        if (globalHomeFeedCache.newlyCreatedPosts) {
            globalHomeFeedCache.newlyCreatedPosts = updateCachedPostList(
                globalHomeFeedCache.newlyCreatedPosts,
                detail,
            );
        }
    });
}

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
export const useHomeFeed = ({
    cardRef: externalCardRef,
    onRestoreScroll,
    restoreScroll,
    initialTab = "for_you",
} = {}) => {
    const internalCardRef = useRef(null);
    const cardRef = externalCardRef || internalCardRef;
    const location = useLocation();
    const handleRestoreScroll = restoreScroll || onRestoreScroll;

    // Tab đang chọn: ưu tiên lấy lại tab đang mở trước đó từ module cache
    const [activeTab, setActiveTab] = useState(() => globalHomeFeedCache.activeTab || initialTab);

    // Cờ đánh dấu đang trong quá trình chuyển tab và khôi phục cuộn (tạm khóa Infinite Scroll chống spam API)
    const isTabSwitchingRef = useRef(false);
    const tabSwitchTimerRef = useRef(null);

    // Dữ liệu bài viết và phân trang: khởi tạo trực tiếp từ Module Cache để hiển thị ngay 0ms khi quay lại trang
    const currentCachedTab = globalHomeFeedCache[globalHomeFeedCache.activeTab || initialTab];
    const [posts, setPosts] = useState(() => currentCachedTab?.posts || []);
    const [page, setPage] = useState(() => currentCachedTab?.page || 1);
    const [hasMore, setHasMore] = useState(() => currentCachedTab?.hasMore ?? true);

    // Trạng thái tải: nếu tab đã nạp trong cache thì không hiển thị skeleton
    const [isLoading, setIsLoading] = useState(() => !currentCachedTab?.isLoaded);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState(null);

    // Ref lưu tab hiện tại để tránh race condition khi người dùng chuyển tab nhanh
    const currentTabRef = useRef(activeTab);

    useEffect(() => {
        currentTabRef.current = activeTab;
    }, [activeTab]);

    // Bộ nhớ đệm (Cache) dữ liệu theo từng tab trỏ trực tiếp tới module cache toàn cục
    const tabsCacheRef = useRef(globalHomeFeedCache);

    // Ref lưu các bài viết mới tạo trong phiên để đảm bảo không bị ghi đè khi tải trang 1
    const newlyCreatedPostsRef = useRef(globalHomeFeedCache.newlyCreatedPosts || []);
    // Ref lưu các ID bài viết đã xóa trong phiên để đảm bảo không bị hiện lại do cache API hoặc ref
    const deletedPostIdsRef = useRef(new Set());

    // Lắng nghe sự kiện tương tác bài viết toàn cục để cập nhật state danh sách bài viết hiện tại
    useEffect(() => {
        const handleInteractionUpdated = (e) => {
            const detail = e.detail;
            if (!detail?.postId) return;
            setPosts((prev) => updateCachedPostList(prev, detail));
        };
        window.addEventListener("post:interaction_updated", handleInteractionUpdated);
        return () => {
            window.removeEventListener("post:interaction_updated", handleInteractionUpdated);
        };
    }, []);

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
        globalHomeFeedCache.newlyCreatedPosts = newlyCreatedPostsRef.current;

        // Cập nhật tab cache cho tab "for_you"
        const forYouCache = tabsCacheRef.current.for_you;
        if (forYouCache) {
            tabsCacheRef.current.for_you = {
                ...forYouCache,
                posts: [
                    newPost,
                    ...(forYouCache.posts || []).filter((p) => String(p.id) !== postKey),
                ],
                isLoaded: true,
            };
        }

        // Chuyển về tab For You để người dùng thấy bài viết vừa tạo ngay trên đầu
        setActiveTab("for_you");
        // Cập nhật state posts
        setPosts((prev) => [
            newPost,
            ...prev.filter((p) => String(p.id) !== postKey),
        ]);
    }, []);

    // Xóa bài viết khỏi cả ref bài mới tạo, ref đã xóa, cache các tab và state posts
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

        // Đồng bộ loại bỏ bài viết trong tất cả các tab đã cache
        Object.keys(tabsCacheRef.current).forEach((key) => {
            if (tabsCacheRef.current[key]?.posts) {
                tabsCacheRef.current[key].posts = tabsCacheRef.current[key].posts.filter(filterFn);
            }
        });

        setPosts((prev) => prev.filter(filterFn));
    }, []);

    // Cập nhật bài viết trong cả ref bài mới tạo, cache các tab và state posts khi có chỉnh sửa (Edit)
    const updatePost = useCallback((updatedPost) => {
        if (!updatedPost?.id) return;
        const updatedIdStr = String(updatedPost.id);
        newlyCreatedPostsRef.current = newlyCreatedPostsRef.current.map((p) =>
            String(p.id) === updatedIdStr ? { ...p, ...updatedPost } : p,
        );

        // Đồng bộ cập nhật bài viết trong tất cả các tab đã cache
        Object.keys(tabsCacheRef.current).forEach((key) => {
            if (tabsCacheRef.current[key]?.posts) {
                tabsCacheRef.current[key].posts = tabsCacheRef.current[key].posts.map((p) =>
                    String(p.id) === updatedIdStr ? { ...p, ...updatedPost } : p,
                );
            }
        });

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
            const newPosts = rawPosts
                .filter(
                    (p) =>
                        !deletedPostIdsRef.current.has(String(p.id)) &&
                        !deletedPostIdsRef.current.has(String(p.original_post_id)) &&
                        !deletedPostIdsRef.current.has(String(p.original_post?.id)) &&
                        !userCache.isPostDeleted(p.id) &&
                        !userCache.isPostDeleted(p.original_post_id) &&
                        !userCache.isPostDeleted(p.original_post?.id),
                )
                .map((p) => userCache.enrichPost(p));

            // 4. Lưu bài viết và thông tin tác giả vào userCache client-side
            userCache.savePosts(newPosts);

            const pagination = response?.pagination || response?.data?.pagination || {};

            // 5. Cập nhật state bài viết & bộ nhớ đệm theo tab (Trang 1: hòa trộn bài vừa tạo; Trang > 1: nối thêm bài viết)
            let nextPosts = [];
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
                    nextPosts = [...activeNewlyCreated, ...remainingServerPosts];
                } else {
                    nextPosts = newPosts;
                }
            } else {
                const prevPosts = tabsCacheRef.current[tabKey]?.posts || [];
                const existingIds = new Set(prevPosts.map((p) => String(p.id)));
                const uniqueNewPosts = newPosts.filter((p) => !existingIds.has(String(p.id)));
                nextPosts = [...prevPosts, ...uniqueNewPosts];
            }

            // 6. Xác định xem còn bài viết ở các trang tiếp theo hay không
            const lastPage = pagination.last_page || (newPosts.length < 10 ? pageNum : pageNum + 1);
            const nextHasMore = pageNum < lastPage && newPosts.length > 0;

            // 7. Lưu vào bộ nhớ đệm (cache) của tab tương ứng
            tabsCacheRef.current[tabKey] = {
                posts: nextPosts,
                page: pageNum,
                hasMore: nextHasMore,
                isLoaded: true,
                scrollTop: tabsCacheRef.current[tabKey]?.scrollTop ?? 0,
            };

            // 8. Nếu tab vẫn đang kích hoạt trên UI -> cập nhật state
            if (currentTabRef.current === tabKey) {
                setPosts(nextPosts);
                setHasMore(nextHasMore);
                setPage(pageNum);
            }
        } catch (err) {
            // 9. Xử lý lỗi: Ghi nhận thông báo lỗi nếu tab vẫn đang kích hoạt
            if (currentTabRef.current === tabKey) {
                setError(err?.message || "Không thể tải danh sách bài viết");
            }
        } finally {
            // 10. Tắt trạng thái tải
            if (currentTabRef.current === tabKey) {
                setIsLoading(false);
                setIsLoadingMore(false);
            }
        }
    }, []);

    // Cờ đánh dấu hệ thống đang khôi phục vị trí cuộn (chống ghi đè vị trí cũ)
    const isRestoringScrollRef = useRef(false);
    const isUnmountedRef = useRef(false);

    // Quản lý cờ unmount để chặn mọi sự kiện cuộn rơi vào 0 khi component bị unmount khỏi DOM
    useEffect(() => {
        isUnmountedRef.current = false;
        isRestoringScrollRef.current = false;
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // Tải dữ liệu ban đầu cho tab khởi tạo khi mở ứng dụng lần đầu (hoặc khôi phục vị trí cuộn từ Module Cache khi quay lại trang)
    const hasInitializedRef = useRef(false);
    useEffect(() => {
        if (!hasInitializedRef.current) {
            hasInitializedRef.current = true;
            if (tabsCacheRef.current[activeTab]?.isLoaded) {
                // Đã có dữ liệu trong cache (quay lại từ Search, Activity, Profile, PostDetail...) -> khôi phục lại vị trí cuộn 0ms
                isRestoringScrollRef.current = true;
                const targetScroll = tabsCacheRef.current[activeTab]?.scrollTop ?? 0;
                handleRestoreScroll?.(targetScroll);
                const timer = setTimeout(() => {
                    isRestoringScrollRef.current = false;
                }, 400);
                return () => clearTimeout(timer);
            } else {
                fetchFeed(activeTab, 1, true);
            }
        }
    }, [activeTab, fetchFeed, handleRestoreScroll]);

    // Lắng nghe cuộn liên tục trên cardRef để lưu vị trí cuộn thực tế theo thời gian thực (chống mất vị trí khi click đổi tab nhanh)
    useEffect(() => {
        const cardEl = cardRef?.current;
        if (!cardEl) return;

        const onScroll = () => {
            if (isUnmountedRef.current || isRestoringScrollRef.current) return;
            // Bỏ qua nếu khung card đang bị thu hẹp hoặc không có nội dung cuộn (unmounting / skeleton)
            if (cardEl.scrollHeight <= cardEl.clientHeight + 10) return;

            const top = cardEl.scrollTop;
            if (tabsCacheRef.current[currentTabRef.current]) {
                tabsCacheRef.current[currentTabRef.current].scrollTop = top;
            }
        };

        cardEl.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            cardEl.removeEventListener("scroll", onScroll);
        };
    }, [cardRef]);

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

    // Xử lý chuyển tab: ĐỒNG BỘ CẢ ACTIVE TAB VÀ NỘI DUNG (BATCH RENDER) -> LOẠI BỎ HOÀN TOÀN HIỆN TƯỢNG NHÁY NỘI DUNG TAB CŨ
    const handleTabChange = useCallback(
        (newTab) => {
            if (newTab === currentTabRef.current) return;

            // Khóa tạm Infinite Scroll và bộ ghi nhận cuộn trong 400ms để ổn định vị trí mới
            isTabSwitchingRef.current = true;
            isRestoringScrollRef.current = true;
            if (tabSwitchTimerRef.current) clearTimeout(tabSwitchTimerRef.current);
            tabSwitchTimerRef.current = setTimeout(() => {
                isTabSwitchingRef.current = false;
                isRestoringScrollRef.current = false;
            }, 400);

            currentTabRef.current = newTab;
            globalHomeFeedCache.activeTab = newTab;
            setActiveTab(newTab);

            const cached = tabsCacheRef.current[newTab];
            if (cached && cached.isLoaded) {
                // ĐỒNG BỘ: Cập nhật state bài viết ngay trong batch này -> hiển thị ngay bài viết mới, không nháy bài viết cũ
                setPosts(cached.posts || []);
                setPage(cached.page || 1);
                setHasMore(cached.hasMore ?? true);
                setIsLoading(false);
                setIsLoadingMore(false);
                setError(null);

                handleRestoreScroll?.(cached.scrollTop ?? 0);
            } else {
                // Tab chưa từng nạp dữ liệu -> xóa list, bật skeleton và gọi API lần đầu
                setPosts([]);
                setPage(1);
                setHasMore(true);
                setIsLoading(true);
                setIsLoadingMore(false);
                setError(null);

                handleRestoreScroll?.(0);
                fetchFeed(newTab, 1, true);
            }
        },
        [handleRestoreScroll, fetchFeed],
    );

    // Hàm tải thêm khi cuộn đến cuối trang
    const handleLoadMore = useCallback(() => {
        // Nếu đang trong quá trình chuyển tab và phục hồi cuộn -> không gọi API tải thêm
        if (isTabSwitchingRef.current) return;
        if (!isLoading && !isLoadingMore && hasMore) {
            fetchFeed(activeTab, page + 1, false);
        }
    }, [activeTab, page, hasMore, isLoading, isLoadingMore, fetchFeed]);

    // Hàm reload lại tab hiện tại khi người dùng chủ động làm mới
    const reloadFeed = useCallback(() => {
        if (tabsCacheRef.current[activeTab]) {
            tabsCacheRef.current[activeTab].isLoaded = false;
        }
        fetchFeed(activeTab, 1, true);
    }, [activeTab, fetchFeed]);

    // Khi người dùng bấm lại vào icon Home trên thanh điều hướng lúc đang ở trang Home (Re-tap to top & refresh)
    useEffect(() => {
        const handleHomeReTap = () => {
            scrollToTop();
            setTimeout(() => {
                reloadFeed();
            }, 300);
        };

        window.addEventListener("home:re-tap", handleHomeReTap);
        return () => window.removeEventListener("home:re-tap", handleHomeReTap);
    }, [scrollToTop, reloadFeed]);

    // Gắn Infinite Scroll hook (tự động ngắt khi đang chuyển tab)
    const { lastElementRef } = useInfiniteScroll({
        onLoadMore: handleLoadMore,
        hasMore,
        isLoading: isLoading || isLoadingMore,
        isLockedRef: isTabSwitchingRef,
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
