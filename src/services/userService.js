/**
 * userService
 * Tầng dịch vụ API quản lý người dùng, mối quan hệ và tìm kiếm (User Service):
 * - getCurrentUser: Lấy hồ sơ tài khoản hiện tại
 * - updateProfile: Chỉnh sửa hồ sơ cá nhân (tên, bio, avatar...)
 * - muteUser / restrictUser / blockUser: Tắt thông báo, hạn chế hoặc chặn người dùng
 * - followUser / unfollowUser: Theo dõi hoặc bỏ theo dõi tài khoản
 * - getFollowers / getFollowings: Lấy danh sách người theo dõi / đang theo dõi
 * - getSuggestions: Lấy danh sách gợi ý tài khoản theo dõi
 * - search / searchUsers / searchTopics: Tìm kiếm tài khoản và chủ đề/hashtag
 * - getUserReposts: Lấy danh sách bài đăng lại của người dùng kèm cơ chế làm giàu dữ liệu (enrichment)
 */
import http from "@/utils/http";
import userCache from "@/utils/userCache";

export const userService = {
    // Lấy thông tin user hiện tại
    getCurrentUser: () => {
        return http.get("/api/auth/user");
    },

    // Cập nhật hồ sơ người dùng
    updateProfile: (data) => {
        const isFormData = data instanceof FormData;
        return http.post("/api/auth/profile", data, {
            headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
        });
    },

    // Mute / Tắt thông báo từ người dùng
    muteUser: (userId) => {
        return http.post(`/api/users/${userId}/mute`);
    },

    // Restrict / Hạn chế người dùng
    restrictUser: (userId) => {
        return http.post(`/api/users/${userId}/restrict`);
    },

    // Block / Chặn người dùng
    blockUser: (userId) => {
        return http.post(`/api/users/${userId}/block`);
    },

    // Follow / Theo dõi người dùng
    followUser: (userId) => {
        return http.post(`/api/users/${userId}/follow`);
    },

    // Unfollow / Bỏ theo dõi người dùng
    unfollowUser: (userId) => {
        return http.post(`/api/users/${userId}/follow`, { _method: "DELETE" });
    },
 
    // Lấy danh sách người theo dõi
    getFollowers: (userId, params) => {
        return http.get(`/api/users/${userId}/followers`, { params });
    },

    // Lấy danh sách đang theo dõi
    getFollowings: (userId, params) => {
        return http.get(`/api/users/${userId}/followings`, { params });
    },

    // Lấy danh sách gợi ý theo dõi
    getSuggestions: (params) => {
        return http.get("/api/users/suggestions", { params });
    },

    // Tìm kiếm tổng hợp (người dùng & chủ đề)
    search: (query, params) => {
        return http.get("/api/search", {
            params: {
                q: query,
                per_page_users: 10,
                per_page_topics: 10,
                ...params,
            },
        });
    },

    // Tìm kiếm người dùng (search)
    searchUsers: (query, params) => {
        return http.get("/api/search", { params: { q: query, ...params } });
    },

    // Tìm kiếm chủ đề / hashtag (topics)
    searchTopics: (query, params) => {
        return http.get("/api/topics/search", { params: { q: query, ...params } });
    },

    // Lấy danh sách các bài viết đã đăng lại (Reposts) của user
    getUserReposts: async (userId, params) => {
        const response = await http.get(`/api/users/${userId}/reposts`, { params });
        const items = response?.data;
        if (Array.isArray(items) && items.length > 0) {
            // Map tạm thời trong phạm vi request hiện tại để tránh gọi trùng lặp nếu có nhiều repost cùng một bài gốc
            const reqCache = new Map();

            const fetchDetail = async (postId) => {
                if (!postId) return null;
                if (reqCache.has(postId)) {
                    return reqCache.get(postId);
                }
                const promise = http
                    .get(`/api/posts/${postId}`)
                    .then((res) => res?.data || res)
                    .catch(() => null);
                reqCache.set(postId, promise);
                return promise;
            };

            // Server trả về original_post nông (thiếu media_urls, thiếu quote lồng nhau, thiếu is_liked, likes_count...)
            // Tự động nạp dữ liệu chi tiết mới nhất song song cho tất cả các bài gốc và loại bỏ bài gốc đã bị xóa
            const enriched = await Promise.all(
                items.map(async (repost) => {
                    const origId = repost.original_post_id || repost.original_post?.id;
                    const orig = repost.original_post;

                    // Nếu chính repost hoặc bài gốc đã bị đánh dấu xóa trong cache
                    if (
                        userCache.isPostDeleted(repost.id) ||
                        (origId && userCache.isPostDeleted(origId)) ||
                        (orig?.id && userCache.isPostDeleted(orig.id))
                    ) {
                        return null;
                    }

                    if (origId) {
                        const detailPost = await fetchDetail(origId);
                        if (detailPost && detailPost.id) {
                            const isLiked = Boolean(
                                detailPost.is_liked ||
                                detailPost.is_liked_by_auth ||
                                orig?.is_liked ||
                                orig?.is_liked_by_auth ||
                                repost?.is_liked ||
                                repost?.is_liked_by_auth,
                            );
                            const likesCount =
                                detailPost.likes_count ??
                                orig?.likes_count ??
                                repost?.likes_count ??
                                0;
                            const isReposted = Boolean(
                                detailPost.is_reposted ||
                                detailPost.is_reposted_by_auth ||
                                orig?.is_reposted ||
                                orig?.is_reposted_by_auth,
                            );
                            const repostsCount =
                                detailPost.reposts_and_quotes_count ??
                                detailPost.reposts_count ??
                                orig?.reposts_and_quotes_count ??
                                orig?.reposts_count ??
                                repost?.reposts_and_quotes_count ??
                                repost?.reposts_count ??
                                0;
                            return {
                                ...repost,
                                is_liked: isLiked,
                                is_liked_by_auth: isLiked,
                                likes_count: likesCount,
                                is_reposted: isReposted,
                                is_reposted_by_auth: isReposted,
                                reposts_count: repostsCount,
                                reposts_and_quotes_count: repostsCount,
                                original_post: {
                                    ...orig,
                                    ...detailPost,
                                    is_liked: isLiked,
                                    is_liked_by_auth: isLiked,
                                    likes_count: likesCount,
                                    is_reposted: isReposted,
                                    is_reposted_by_auth: isReposted,
                                    reposts_count: repostsCount,
                                    reposts_and_quotes_count: repostsCount,
                                },
                            };
                        } else {
                            // fetchDetail(origId) thất bại (404 Not Found hoặc bài viết đã bị xóa trên server)
                            userCache.markPostDeleted(origId);
                            userCache.markPostDeleted(repost.id);
                            // Bài repost thuần không có nội dung riêng -> loại bỏ hoàn toàn
                            if (!repost.content) {
                                return null;
                            }
                        }
                    }

                    // Nếu không có bài gốc và không có nội dung riêng -> bài viết mồ côi, loại bỏ
                    if (!repost.original_post && !repost.content) {
                        return null;
                    }

                    return repost;
                }),
            );

            // Lọc bỏ triệt để các bài viết null
            const validReposts = enriched.filter(Boolean);

            return {
                ...response,
                data: validReposts,
            };
        }
        return response;
    },
};

export default userService;

