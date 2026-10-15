import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import useDocumentTitle from "@/hooks/useDocumentTitle";
import useWindowScrollSync from "@/hooks/useWindowScrollSync";
import useInfiniteScroll from "@/hooks/useInfiniteScroll";
import usePostInteractions from "@/hooks/usePostInteractions";
import postService from "@/services/postService";
import userCache from "@/utils/userCache";

// Hàm sắp xếp bình luận mới nhất lên đầu (DESC theo thời gian tạo hoặc ID)
const sortRepliesDesc = (list) => {
    return [...list].sort((a, b) => {
        const timeA = a?.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b?.created_at ? new Date(b.created_at).getTime() : 0;
        if (timeB !== timeA) {
            return timeB - timeA;
        }
        return (b?.id || 0) - (a?.id || 0);
    });
};

/**
 * usePostDetail
 * Custom hook quản lý logic nghiệp vụ của trang Chi tiết bài viết:
 * - Lấy dữ liệu bài viết gốc & danh sách câu trả lời (replies) có phân trang Infinite Scroll
 * - Tái sử dụng `usePostInteractions` để quản lý Thích, Đăng lại, Modal Trả lời, Modal Trích dẫn
 * - Đồng bộ cuộn 2 chiều giữa khung card và thanh cuộn window ngoài trang
 * - Xử lý quay lại trang trước
 */
export const usePostDetail = () => {
    const { postId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user: currentUser } = useSelector((state) => state.auth);

    // ==========================================
    // State & Refs: Dữ liệu bài viết, bình luận & trạng thái tải
    // ==========================================
    // State lưu dữ liệu chi tiết của bài viết gốc (gồm tác giả, nội dung, media, stats)
    const [post, setPost] = useState(null);
    // State lưu mảng danh sách các bình luận/câu trả lời (replies) của bài viết
    const [replies, setReplies] = useState([]);
    // State lưu số trang hiện tại của danh sách replies phục vụ phân trang vô tận
    const [repliesPage, setRepliesPage] = useState(1);
    // Cờ đánh dấu xem còn bình luận ở các trang tiếp theo hay không
    const [hasMoreReplies, setHasMoreReplies] = useState(true);
    // Cờ loading khi tải chi tiết bài viết gốc lần đầu tiên (hiển thị skeleton bài viết)
    const [isLoadingPost, setIsLoadingPost] = useState(true);
    // Cờ loading khi tải danh sách bình luận lần đầu tiên (hiển thị skeleton bình luận)
    const [isLoadingReplies, setIsLoadingReplies] = useState(true);
    // Cờ loading khi cuộn xuống đáy để tải thêm bình luận ở các trang tiếp theo
    const [isLoadingMoreReplies, setIsLoadingMoreReplies] = useState(false);
    // State lưu thông báo lỗi nếu tải bài viết thất bại (ví dụ: bài viết bị xóa hoặc không tồn tại)
    const [error, setError] = useState(null);

    // Cập nhật tiêu đề trang web trên tab trình duyệt theo tên tác giả bài viết
    useDocumentTitle(
        post?.user?.username
            ? `${post.user.username} ${t("post.thread_title")}`
            : t("post.thread_title"),
    );

    // Tải chi tiết bài viết gốc từ API
    const fetchPostDetail = useCallback(async () => {
        // 1. Kiểm tra guard: Không tải nếu thiếu postId
        if (!postId) return;
        setIsLoadingPost(true);
        setError(null);

        try {
            // 2. Gọi API lấy dữ liệu bài viết theo postId
            const response = await postService.getPost(postId);
            const postData = response?.data || response;

            // 3. Lưu thông tin tác giả và bài viết vào userCache để tái sử dụng xuyên suốt app
            if (postData) {
                userCache.savePosts([postData]);
            }

            // 4. Cập nhật state bài viết gốc
            setPost(postData);
        } catch (err) {
            // 5. Bắt lỗi nếu bài viết không tồn tại hoặc lỗi mạng
            setError(err?.response?.data?.message || "post.post_not_found");
        } finally {
            // 6. Giải phóng trạng thái loading bài viết gốc
            setIsLoadingPost(false);
        }
    }, [postId]);

    // Đồng bộ chi tiết bài viết gốc trong nền (background sync, không bật skeleton làm giật/nhấp nháy màn hình)
    const syncPostDetail = useCallback(async () => {
        // 1. Kiểm tra guard postId
        if (!postId) return;
        try {
            // 2. Gọi API ngầm lấy thông tin bài viết mới nhất
            const response = await postService.getPost(postId);
            const postData = response?.data || response;

            // 3. Hợp nhất (merge) dữ liệu mới vào state hiện tại
            if (postData) {
                setPost((prev) => (prev ? { ...prev, ...postData } : postData));
            }
        } catch {
            // 4. Nuốt lỗi nếu đồng bộ ngầm thất bại để tránh ảnh hưởng trải nghiệm người dùng
        }
    }, [postId]);

    // Tải danh sách câu trả lời/bình luận (replies) theo từng trang (Pagination)
    const fetchReplies = useCallback(
        async (pageNum = 1, isInitial = false) => {
            // 1. Kiểm tra guard postId
            if (!postId) return;

            // 2. Bật cờ loading tương ứng (loading ban đầu hoặc loading trang kế tiếp)
            if (isInitial) {
                setIsLoadingReplies(true);
            } else if (pageNum > 1) {
                setIsLoadingMoreReplies(true);
            }

            try {
                // 3. Gọi API lấy danh sách replies theo trang
                const response = await postService.getReplies(postId, {
                    page: pageNum,
                    per_page: 20,
                });

                // 4. Chuẩn hóa cấu trúc mảng trả lời từ phản hồi API
                const rawData = response?.data;
                const newReplies = Array.isArray(rawData)
                    ? rawData
                    : Array.isArray(rawData?.data)
                      ? rawData.data
                      : [];

                // 5. Lưu các replies vào userCache để lưu vết tác giả & bài viết
                userCache.savePosts(newReplies);

                // 6. Đọc thông tin phân trang từ response API
                const pagination =
                    response?.pagination || response?.data?.pagination || {};

                // 7. Cập nhật danh sách replies, lọc trùng lặp ID và sắp xếp DESC
                setReplies((prev) => {
                    if (pageNum === 1) {
                        return sortRepliesDesc(newReplies);
                    }
                    const existingIds = new Set(prev.map((r) => String(r.id)));
                    const uniqueNewReplies = newReplies.filter(
                        (r) => !existingIds.has(String(r.id)),
                    );
                    return sortRepliesDesc([...prev, ...uniqueNewReplies]);
                });

                // 8. Đánh giá xem còn dữ liệu ở trang sau không dựa trên pagination API hoặc độ dài mảng
                const lastPage =
                    pagination.last_page ||
                    (newReplies.length < 20 ? pageNum : pageNum + 1);
                setHasMoreReplies(pageNum < lastPage && newReplies.length > 0);
                setRepliesPage(pageNum);
            } catch {
                // 9. Xử lý lỗi: nếu là lần tải đầu tiên thì reset danh sách replies rỗng
                if (isInitial) {
                    setReplies([]);
                    setHasMoreReplies(false);
                }
            } finally {
                // 10. Giải phóng cờ loading tương ứng
                if (isInitial) {
                    setIsLoadingReplies(false);
                } else if (pageNum > 1) {
                    setIsLoadingMoreReplies(false);
                }
            }
        },
        [postId],
    );

    // Tự động kích hoạt tải bài viết gốc và danh sách replies khi postId thay đổi trên URL
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setReplies([]);
        setRepliesPage(1);
        setHasMoreReplies(true);
        fetchPostDetail();
        fetchReplies(1, true);
    }, [postId, fetchPostDetail, fetchReplies]);

    // Tải thêm replies khi cuộn đến cuối danh sách (Infinite Scroll trigger)
    const handleLoadMoreReplies = useCallback(() => {
        // 1. Kiểm tra guard: không tải trùng lặp khi đang bận hoặc đã hết bài
        if (!isLoadingReplies && !isLoadingMoreReplies && hasMoreReplies) {
            // 2. Kích hoạt tải trang tiếp theo
            fetchReplies(repliesPage + 1, false);
        }
    }, [isLoadingReplies, isLoadingMoreReplies, hasMoreReplies, fetchReplies, repliesPage]);

    // Gắn hook Infinite Scroll cho phần tử cuối cùng của danh sách replies
    const { lastElementRef } = useInfiniteScroll({
        onLoadMore: handleLoadMoreReplies,
        hasMore: hasMoreReplies,
        isLoading: isLoadingReplies || isLoadingMoreReplies,
        rootMargin: "250px",
    });

    // Tái sử dụng usePostInteractions cho cả bài gốc (post) và danh sách phản hồi (replies)
    const interactions = usePostInteractions({
        post,
        setPost,
        posts: replies,
        setPosts: setReplies,
        onReplySuccess: (newReply, targetPost) => {
            // 1. Nếu reply vào một comment con (khác bài viết gốc), tăng replies_count của bài gốc
            // (vì usePostInteractions chỉ tự động tăng cho targetPost được reply)
            if (targetPost?.id && String(targetPost.id) !== String(post?.id)) {
                setPost((prev) =>
                    prev
                        ? {
                              ...prev,
                              replies_count: (prev.replies_count || 0) + 1,
                          }
                        : prev,
                );
            }
            // 2. Đưa comment mới tạo lên đầu danh sách replies nếu chưa có trong state
            if (newReply && newReply.id) {
                setReplies((prev) => {
                    const exists = prev.some(
                        (r) => String(r.id) === String(newReply.id),
                    );
                    if (exists) return prev;
                    return [newReply, ...prev];
                });
            }
            // 3. Đồng bộ dữ liệu chuẩn từ server trong nền (không làm nháy hay giật màn hình)
            syncPostDetail();
            fetchReplies(1, false);
        },
        onDeleteSuccess: () => {
            // Đồng bộ lại chi tiết bài viết và danh sách replies trong nền sau khi xóa thành công
            syncPostDetail();
            fetchReplies(1, false);
        },
        onEditSuccess: (updatedData) => {
            const updated = updatedData?.data || updatedData;
            // 1. Cập nhật state nếu bài viết được chỉnh sửa chính là bài viết gốc
            if (updated?.id && post?.id && String(updated.id) === String(post.id)) {
                setPost((prev) => (prev ? { ...prev, ...updated } : updated));
            }
            // 2. Đồng bộ dữ liệu chuẩn từ server trong nền
            syncPostDetail();
        },
    });

    // Xử lý nút quay lại trang trước
    const handleBack = () => {
        // Nếu có lịch sử duyệt trang thì quay lại trang trước đó, ngược lại điều hướng về trang chủ
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate("/");
        }
    };

    // Ref tham chiếu đến DOM element của khung card bài viết (dùng cho tính toán vị trí cuộn)
    const cardRef = useRef(null);
    // Ref tham chiếu đến phần tử nội dung cuộn bên trong card
    const contentRef = useRef(null);

    // Đồng bộ cuộn 2 chiều giữa khung card cố định và thanh cuộn window ngoài trang
    const { spacerHeight, handleCardScroll, resetScroll } = useWindowScrollSync({
        cardRef,
        contentRef,
        deps: [
            post?.id,
            replies.length,
            isLoadingPost,
            isLoadingReplies,
            isLoadingMoreReplies,
            error,
        ],
        resetTrigger: postId,
    });

    return {
        post,
        replies,
        repliesPage,
        hasMoreReplies,
        isLoadingPost,
        isLoadingReplies,
        isLoadingMoreReplies,
        error,
        currentUser,
        fetchPostDetail,
        fetchReplies,
        ...interactions,
        handleBack,
        cardRef,
        contentRef,
        spacerHeight,
        handleCardScroll,
        resetScroll,
        lastElementRef,
    };
};

export default usePostDetail;
