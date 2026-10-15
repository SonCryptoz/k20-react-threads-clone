/**
 * userCache
 * Quản lý bộ nhớ đệm client-side cho người dùng và bài viết:
 * - Bảo toàn thông tin người dùng (id, name, username, bio, avatar_url, stats...)
 * - Đảm bảo avatar_url hợp lệ không bao giờ bị ghi đè bởi null từ các API khác (như getFollowings/getFollowers)
 * - Lưu trữ các bài viết đã thấy trên feed để hiển thị ngay khi truy cập trang cá nhân của người dùng
 * - Quản lý trạng thái theo dõi (Following) phân tách theo từng tài khoản đăng nhập (User-Scoped Isolation)
 * - Tự động dọn dẹp và reset bộ nhớ khi người dùng đăng xuất hoặc chuyển đổi tài khoản
 * - Theo dõi trạng thái đã quét toàn bộ bài viết trong hệ thống (deep scanned)
 */

// Bảng băm lưu hồ sơ người dùng theo username (key: lowercase username không có @)
const userByUsername = new Map();
// Bảng băm lưu hồ sơ người dùng theo ID số nguyên (key: string ID)
const userById = new Map();
// Bảng băm lưu danh sách bài viết theo tác giả (key: username -> value: Map<postId, post>)
const postsByAuthor = new Map();
// Tập hợp các ID bài viết đã bị xóa trong phiên để lọc triệt để khỏi các feed/cache
const deletedPostIds = new Set();
// Cờ đánh dấu đã quét sâu toàn bộ bài viết trong hệ thống hay chưa
let deepScanned = false;

// Khóa lưu trữ cache người dùng trong localStorage để bảo toàn avatar qua các lần F5 reload
const USERS_STORAGE_KEY = "threads_users_cache_v1";
// Khóa lưu trữ user ID đang hoạt động
const ACTIVE_USER_ID_KEY = "threads_active_user_id";
// Khóa lưu trữ danh sách bài viết đã xóa để bảo toàn qua các lần F5 reload
const DELETED_POSTS_STORAGE_KEY = "threads_deleted_posts_v1";

// Prefix cho khóa lưu trữ theo dõi được phân tách theo từng user ID
const getFollowingsStorageKey = (userId) => `threads_followings_user_${userId}_v2`;

// Tập hợp lưu các ID người dùng mà activeUserId đang theo dõi
const followingIds = new Set();
// Tập hợp lưu các username mà activeUserId đang theo dõi
const followingUsernames = new Set();
// ID của tài khoản đang đăng nhập hiện tại trong cache
let activeUserId = null;

/**
 * Nạp danh sách đang theo dõi từ localStorage cho một userId cụ thể
 */
const loadFollowingsFromStorage = (userId) => {
    followingIds.clear();
    followingUsernames.clear();
    if (!userId || typeof window === "undefined") return;

    try {
        const raw = localStorage.getItem(getFollowingsStorageKey(userId));
        if (raw) {
            const data = JSON.parse(raw);
            if (data && typeof data === "object") {
                if (Array.isArray(data.ids)) {
                    data.ids.forEach((id) => followingIds.add(String(id)));
                }
                if (Array.isArray(data.usernames)) {
                    data.usernames.forEach((name) =>
                        followingUsernames.add(String(name).toLowerCase()),
                    );
                }
            }
        }
    } catch {
        // Ignored
    }
};

/**
 * Khởi tạo cache từ localStorage khi module được nạp
 */
const initCacheFromStorage = () => {
    if (typeof window === "undefined") return;
    try {
        // Dọn dẹp khóa cũ (toàn cục) nếu còn sót để loại bỏ triệt để rò rỉ follow giữa các tài khoản
        localStorage.removeItem("threads_followings_v1");

        // 1. Nạp cache người dùng (loại bỏ các thuộc tính follow theo phiên để không bị rò rỉ)
        const raw = localStorage.getItem(USERS_STORAGE_KEY);
        if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
                list.forEach((u) => {
                    if (!u) return;
                    delete u.is_following;
                    delete u.is_followed_by_auth;
                    const usernameKey = u.username
                        ? String(u.username).replace(/^@/, "").trim().toLowerCase()
                        : null;
                    const idKey = u.id ? String(u.id) : null;
                    if (usernameKey) userByUsername.set(usernameKey, u);
                    if (idKey) userById.set(idKey, u);
                });
            }
        }

        // 2. Khôi phục activeUserId và followings tương ứng nếu có phiên hợp lệ
        const storedActiveId = localStorage.getItem(ACTIVE_USER_ID_KEY);
        if (storedActiveId) {
            activeUserId = String(storedActiveId);
            loadFollowingsFromStorage(activeUserId);
        }

        // 3. Nạp danh sách bài viết đã xóa
        const rawDeleted = localStorage.getItem(DELETED_POSTS_STORAGE_KEY);
        if (rawDeleted) {
            const arr = JSON.parse(rawDeleted);
            if (Array.isArray(arr)) {
                arr.forEach((id) => deletedPostIds.add(String(id)));
            }
        }
    } catch {
        // Ignored
    }
};

// Timeout quản lý cơ chế Debounce lưu trữ danh sách user vào localStorage (tránh ghi đĩa liên tục khi feed cuộn nhanh)
let persistTimeout = null;
const persistUsersToStorage = () => {
    if (typeof window === "undefined") return;
    if (persistTimeout) clearTimeout(persistTimeout);
    persistTimeout = setTimeout(() => {
        try {
            // Lọc các user có avatar_url để lưu trữ tối đa 100 user gần nhất
            const list = Array.from(userByUsername.values())
                .filter((u) => Boolean(u.avatar_url))
                .map((u) => {
                    // Không lưu thuộc tính quan hệ (is_following, is_followed_by_auth) vào storage người dùng chung
                    const clean = { ...u };
                    delete clean.is_following;
                    delete clean.is_followed_by_auth;
                    return clean;
                })
                .slice(-100);
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(list));
        } catch {
            // Ignored
        }
    }, 200);
};

// Timeout quản lý Debounce lưu trữ danh sách đang theo dõi của tài khoản hiện tại
let persistFollowingsTimeout = null;
const persistFollowingsToStorage = () => {
    if (typeof window === "undefined" || !activeUserId) return;
    if (persistFollowingsTimeout) clearTimeout(persistFollowingsTimeout);
    persistFollowingsTimeout = setTimeout(() => {
        try {
            if (!activeUserId) return;
            const data = {
                ids: Array.from(followingIds),
                usernames: Array.from(followingUsernames),
            };
            localStorage.setItem(getFollowingsStorageKey(activeUserId), JSON.stringify(data));
        } catch {
            // Ignored
        }
    }, 150);
};

// Timeout quản lý Debounce lưu trữ danh sách ID bài viết đã xóa (tối đa 300 ID)
let persistDeletedTimeout = null;
const persistDeletedPostsToStorage = () => {
    if (typeof window === "undefined") return;
    if (persistDeletedTimeout) clearTimeout(persistDeletedTimeout);
    persistDeletedTimeout = setTimeout(() => {
        try {
            const arr = Array.from(deletedPostIds).slice(-300);
            localStorage.setItem(DELETED_POSTS_STORAGE_KEY, JSON.stringify(arr));
        } catch {
            // Ignored
        }
    }, 100);
};

// Khởi tạo ngay khi module được nạp
initCacheFromStorage();

export const userCache = {
    // Thiết lập phiên người dùng hiện tại (khi đăng nhập hoặc khôi phục session)
    setSessionUser: (userId) => {
        if (!userId) {
            userCache.clearSession();
            return;
        }
        const idStr = String(userId);
        if (activeUserId === idStr && followingIds.size > 0) {
            return;
        }
        activeUserId = idStr;
        if (typeof window !== "undefined") {
            try {
                localStorage.setItem(ACTIVE_USER_ID_KEY, idStr);
            } catch {
                // Ignored
            }
        }
        loadFollowingsFromStorage(idStr);

        // Phát sự kiện toàn cục để các component/hooks đồng bộ lại map theo dõi
        if (typeof window !== "undefined") {
            window.dispatchEvent(
                new CustomEvent("user:session_changed", {
                    detail: { userId: idStr },
                }),
            );
        }
    },

    // Xóa sạch phiên hiện tại (khi đăng xuất hoặc hết hạn token)
    clearSession: () => {
        activeUserId = null;
        followingIds.clear();
        followingUsernames.clear();

        // Xóa sạch các cờ relational is_following trong bộ nhớ user
        userByUsername.forEach((u) => {
            delete u.is_following;
            delete u.is_followed_by_auth;
        });
        userById.forEach((u) => {
            delete u.is_following;
            delete u.is_followed_by_auth;
        });

        if (typeof window !== "undefined") {
            try {
                localStorage.removeItem(ACTIVE_USER_ID_KEY);
            } catch {
                // Ignored
            }
            window.dispatchEvent(
                new CustomEvent("user:session_changed", {
                    detail: { userId: null },
                }),
            );
        }
    },

    // Lấy ID của user đang hoạt động trong cache
    getActiveUserId: () => activeUserId,

    // Lưu hoặc cập nhật thông tin user, bảo toàn avatar_url
    saveUser: (user) => {
        if (!user) return null;
        const usernameKey = user.username ? String(user.username).replace(/^@/, "").trim().toLowerCase() : null;
        const idKey = user.id ? String(user.id) : null;

        const existing =
            (usernameKey && userByUsername.get(usernameKey)) ||
            (idKey && userById.get(idKey)) ||
            {};

        const merged = {
            ...existing,
            ...user,
            avatar_url: user.avatar_url || existing.avatar_url || null,
        };

        // Nếu không có phiên đăng nhập, không cho phép lưu lại cờ relational
        if (!activeUserId) {
            delete merged.is_following;
            delete merged.is_followed_by_auth;
        }

        if (usernameKey) {
            userByUsername.set(usernameKey, merged);
        }
        if (idKey) {
            userById.set(idKey, merged);
        }

        // Tự động lưu vào localStorage nếu có avatar_url để không bị mất khi F5
        if (merged.avatar_url) {
            persistUsersToStorage();
        }

        return merged;
    },

    // Lấy user theo username
    getByUsername: (username) => {
        if (!username) return null;
        const key = String(username).replace(/^@/, "").trim().toLowerCase();
        return userByUsername.get(key) || null;
    },

    // Lấy user theo ID
    getById: (id) => {
        if (!id) return null;
        return userById.get(String(id)) || null;
    },

    // Trạng thái đã quét sâu tất cả các trang bài viết
    isDeepScanned: () => deepScanned,
    setDeepScanned: (val = true) => {
        deepScanned = Boolean(val);
    },

    // Đánh dấu bài viết đã bị xóa để loại bỏ triệt để khỏi cache
    markPostDeleted: (postId) => {
        if (!postId) return;
        const pIdStr = String(postId);
        deletedPostIds.add(pIdStr);
        postsByAuthor.forEach((authorMap) => {
            authorMap.delete(pIdStr);
        });
        persistDeletedPostsToStorage();
    },

    // Kiểm tra xem bài viết có bị xóa trong phiên không
    isPostDeleted: (postId) => {
        if (!postId) return false;
        return deletedPostIds.has(String(postId));
    },

    // Lưu danh sách bài viết vào cache (từ feed, profile, post detail)
    savePosts: (posts) => {
        if (!Array.isArray(posts)) return;
        posts.forEach((post) => {
            if (!post || !post.id) return;
            if (deletedPostIds.has(String(post.id))) return;

            // 1. Lưu theo tác giả bài viết
            const author = post.user || post.author;
            if (author) {
                userCache.saveUser(author);
                const uKey = author.username
                    ? String(author.username).replace(/^@/, "").trim().toLowerCase()
                    : null;
                if (uKey) {
                    if (!postsByAuthor.has(uKey)) {
                        postsByAuthor.set(uKey, new Map());
                    }
                    postsByAuthor.get(uKey).set(String(post.id), post);
                }
            }

            // 2. Lưu theo tác giả của original_post nếu có (bài đăng lại / trích dẫn)
            if (post.original_post) {
                const origAuthor = post.original_post.user || post.original_post.author;
                if (origAuthor) {
                    userCache.saveUser(origAuthor);
                    const oKey = origAuthor.username
                        ? String(origAuthor.username).replace(/^@/, "").trim().toLowerCase()
                        : null;
                    if (oKey) {
                        if (!postsByAuthor.has(oKey)) {
                            postsByAuthor.set(oKey, new Map());
                        }
                        postsByAuthor.get(oKey).set(String(post.original_post.id), post.original_post);
                    }
                }
            }
        });
    },

    // Lấy các bài viết đã cache của một tác giả
    getPostsByUsername: (username) => {
        if (!username) return [];
        const uKey = String(username).replace(/^@/, "").trim().toLowerCase();
        const map = postsByAuthor.get(uKey);
        if (!map) return [];
        return Array.from(map.values()).filter((p) => !deletedPostIds.has(String(p.id)));
    },


    // Kiểm tra xem tài khoản hiện tại có đang theo dõi user này không
    isFollowing: (userId, username) => {
        if (!activeUserId) return false;
        const idKey = userId ? String(userId) : null;
        const uKey = username
            ? String(username).replace(/^@/, "").trim().toLowerCase()
            : null;
        if (idKey && followingIds.has(idKey)) return true;
        if (uKey && followingUsernames.has(uKey)) return true;
        return false;
    },

    // Cập nhật trạng thái theo dõi và phát sự kiện đồng bộ toàn ứng dụng
    setFollowing: (userOrId, isFollow = true, extraUsername = null) => {
        if (!activeUserId) return;

        const id =
            typeof userOrId === "object" && userOrId !== null
                ? userOrId.id
                : userOrId;
        const username =
            typeof userOrId === "object" && userOrId !== null
                ? userOrId.username || extraUsername
                : extraUsername;

        const idKey = id ? String(id) : null;
        const uKey = username
            ? String(username).replace(/^@/, "").trim().toLowerCase()
            : null;

        if (isFollow) {
            if (idKey) followingIds.add(idKey);
            if (uKey) followingUsernames.add(uKey);
        } else {
            if (idKey) followingIds.delete(idKey);
            if (uKey) followingUsernames.delete(uKey);
        }

        // Cập nhật thông tin trong bộ nhớ userCache
        const cached =
            (uKey && userByUsername.get(uKey)) || (idKey && userById.get(idKey));
        if (cached) {
            cached.is_following = Boolean(isFollow);
            cached.is_followed_by_auth = Boolean(isFollow);
        }

        persistFollowingsToStorage();

        // Kích hoạt custom event trên window để đồng bộ tức thì trên tất cả component/hooks đang mounted
        if (typeof window !== "undefined") {
            window.dispatchEvent(
                new CustomEvent("user:follow_changed", {
                    detail: {
                        userId: idKey,
                        username: uKey,
                        isFollowing: Boolean(isFollow),
                    },
                }),
            );
        }
    },

    // Đồng bộ hàng loạt danh sách đang theo dõi từ API getFollowings
    syncFollowings: (followingList, forUserId = null) => {
        if (!Array.isArray(followingList)) return;
        // Nếu truyền forUserId mà khác activeUserId thì không đồng bộ vào phiên hiện tại
        if (forUserId && activeUserId && String(forUserId) !== String(activeUserId)) {
            return;
        }
        if (!activeUserId && forUserId) {
            userCache.setSessionUser(forUserId);
        }
        if (!activeUserId) return;

        followingList.forEach((u) => {
            if (!u) return;
            const idKey = u.id ? String(u.id) : null;
            const uKey = u.username
                ? String(u.username).replace(/^@/, "").trim().toLowerCase()
                : null;
            if (idKey) followingIds.add(idKey);
            if (uKey) followingUsernames.add(uKey);
            userCache.saveUser({
                ...u,
                is_following: true,
                is_followed_by_auth: true,
            });
        });
        persistFollowingsToStorage();
    },

    // Lấy toàn bộ danh sách ID đang theo dõi
    getAllFollowingIds: () => Array.from(followingIds),
};

export default userCache;
