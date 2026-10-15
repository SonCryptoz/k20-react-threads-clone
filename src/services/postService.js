/**
 * postService
 * Tầng dịch vụ API quản lý bài viết và tương tác bài viết (Post Service):
 * - getFeed: Lấy danh sách bài viết theo từng tab (for_you, following, ghost)
 * - createPost: Đăng bài viết mới (hỗ trợ cả FormData tải file media lẫn payload JSON)
 * - likePost: Thích / Bỏ thích bài viết (Toggle like)
 * - repost: Đăng lại / Hủy đăng lại bài viết (Toggle repost)
 * - deletePost: Xóa bài viết vĩnh viễn
 * - createReply: Đăng bình luận / câu trả lời cho bài viết
 * - quotePost: Đăng bài viết trích dẫn (Quote post) kèm bình luận
 * - getPost: Lấy thông tin chi tiết một bài viết cụ thể
 * - getReplies: Lấy danh sách các câu trả lời của bài viết
 * - savePost: Lưu / Bỏ lưu bài viết vào mục đã lưu
 * - hidePost: Ẩn bài viết khỏi bảng tin (Không quan tâm)
 */
import http from "@/utils/http";

export const postService = {
    // Lấy danh sách bài viết theo tab feed
    getFeed: ({ type = "for_you", page = 1, per_page = 10 } = {}) => {
        return http.get("/api/posts/feed", {
            params: {
                type,
                page,
                per_page,
            },
        });
    },

    // Tạo bài viết mới
    createPost: (data, isFormData) => {
        return http.post("/api/posts", data, {
            headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
        });
    },

    // Like / Bỏ like bài viết (Toggle like)
    likePost: (postId) => http.post(`/api/posts/${postId}/like`),

    // Repost / Hủy Repost bài viết
    repost: (postId) => http.post(`/api/posts/${postId}/repost`),

    // Xóa bài viết
    deletePost: (postId) => http.del(`/api/posts/${postId}`),

    // Tạo bình luận / reply bài viết
    // ! Phía server đang bị lỗi upload file media nên tạm thời chưa test được, chỉ gửi được content và reply_permission
    createReply: (postId, data, isFormData) => {
        return http.post(`/api/posts/${postId}/reply`, data, {
            headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
        });
    }, 

    // Trích dẫn bài viết (Quote post)
    quotePost: (postId, data, isFormData) => {
        return http.post(`/api/posts/${postId}/quote`, data, {
            headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
        });
    },

    // Lấy chi tiết bài viết
    getPost: (postId) => http.get(`/api/posts/${postId}`),

    // Lấy danh sách bình luận (Replies) của bài viết
    getReplies: (postId, { page = 1, per_page = 20 } = {}) => {
        return http.get(`/api/posts/${postId}/replies`, {
            params: { page, per_page },
        });
    },

    // Lưu / Bỏ lưu bài viết vào bộ sưu tập (Toggle Save post)
    savePost: (postId) => http.post(`/api/posts/${postId}/save`),

    // Ẩn bài viết / Không quan tâm (Hide post)
    hidePost: (postId) => http.post(`/api/posts/${postId}/hide`),

    // Báo cáo bài viết (Report post)
    reportPost: (postId, data) => http.post(`/api/posts/${postId}/report`, data),

    // Cập nhật nội dung bài viết (Edit post)
    updatePost: (postId, data, isFormData) => {
        if (isFormData && data instanceof FormData && !data.has("_method")) {
            data.append("_method", "PUT");
        }
        return http.post(
            `/api/posts/${postId}`,
            isFormData ? data : { ...data, _method: "PUT" },
            {
                headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
            },
        );
    },
};

export default postService;
