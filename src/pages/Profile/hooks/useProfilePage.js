import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSelector, useDispatch } from "react-redux";
import { useParams, useLocation, useNavigate } from "react-router";

import useDocumentTitle from "@/hooks/useDocumentTitle";
import useWindowScrollSync from "@/hooks/useWindowScrollSync";
import usePostInteractions from "@/hooks/usePostInteractions";
import useInfiniteScroll from "@/hooks/useInfiniteScroll";

import userService from "@/services/userService";
import postService from "@/services/postService";
import authService from "@/services/authService";
import { logout } from "@/features/authSlice";
import userCache from "@/utils/userCache";
import { toast } from "@/components/ui/toast";

// =========================================================================
// Module-level Cache cho Trang Cá nhân (Profile):
// Bảo toàn tab đang mở, danh sách bài viết (threads, reposts), gợi ý và vị trí cuộn
// khi chuyển đổi giữa các trang (Profile <-> Home <-> Search <-> Activity <-> PostDetail)
// =========================================================================
const globalProfileCache = new Map();

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
    // Xóa cache profile khi đăng xuất hoặc chuyển đổi tài khoản
    window.addEventListener("user:session_changed", () => {
        globalProfileCache.clear();
    });

    // Đồng bộ tương tác (Like, Repost) vào toàn bộ cache profile của tất cả user ở module level
    window.addEventListener("post:interaction_updated", (e) => {
        const detail = e.detail;
        if (!detail?.postId) return;
        globalProfileCache.forEach((profileData) => {
            ["threads", "reposts"].forEach((tabKey) => {
                if (profileData[tabKey]?.posts) {
                    profileData[tabKey].posts = updateCachedPostList(profileData[tabKey].posts, detail);
                }
                if (profileData[tabKey]?.allSourcePosts) {
                    profileData[tabKey].allSourcePosts = updateCachedPostList(profileData[tabKey].allSourcePosts, detail);
                }
            });
        });
    });
}

/**
 * useProfilePage
 * Custom hook quản lý toàn bộ logic cho trang Profile:
 * - Hỗ trợ cả 2 chế độ: Trang của chính mình (`/profile` hoặc `/:myUsername`) và Trang của người khác (`/:username`)
 * - Tự động nhận diện quyền sở hữu (`isOwner`)
 * - Thống kê số lượng followers & following
 * - Tương tác Theo dõi / Bỏ theo dõi khi xem trang người khác
 * - Chuyển đổi tab ("threads", "reposts" và "suggestions") và tải danh sách bài viết tương ứng
 * - Quản lý trạng thái đóng/mở tất cả các Modals trên trang Profile
 * - Tương tác bài viết (Like, Repost, Quote, Edit, Share, Embed...)
 * - Đồng bộ cuộn 2 chiều giữa khung card và cửa sổ trình duyệt
 */
export const useProfilePage = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const location = useLocation();
    const navigate = useNavigate();
    const { user: currentUser, isAuthenticated } = useSelector((state) => state.auth);

    // Lấy username từ params URL (nếu có)
    const { username: rawUsername } = useParams();
    const cleanUsername = rawUsername ? rawUsername.replace(/^@/, "").trim() : null;

    // Xác định xem đây có phải trang cá nhân của tài khoản hiện tại hay không
    const isOwner =
        !cleanUsername ||
        Boolean(
            currentUser?.username &&
                cleanUsername.toLowerCase() === currentUser.username.toLowerCase()
        );

    // ==========================================
    // State & Refs: Hồ sơ, Thống kê & Người dùng
    // ==========================================
    // State lưu thông tin hồ sơ của tài khoản khác (khi xem profile người khác !isOwner)
    // Khởi tạo ưu tiên từ navigation state (route transition) hoặc userCache để giao diện hiển thị tức thì (0ms)
    const [otherUser, setOtherUser] = useState(() => {
        if (isOwner || !cleanUsername) return null;
        const stateUser = location.state?.user;
        if (
            stateUser &&
            stateUser.username &&
            stateUser.username.replace(/^@/, "").toLowerCase() === cleanUsername.toLowerCase()
        ) {
            userCache.saveUser(stateUser);
            return stateUser;
        }
        return userCache.getByUsername(cleanUsername) || null;
    });

    // State boolean xác định currentUser có đang theo dõi tài khoản này hay không
    const [isFollowing, setIsFollowing] = useState(() => {
        if (isOwner || !isAuthenticated) return false;
        if (userCache.isFollowing(otherUser?.id, cleanUsername)) return true;
        return Boolean(otherUser?.is_following || otherUser?.is_followed_by_auth);
    });

    // Cờ loading khi đang thực hiện gọi API follow/unfollow tài khoản này
    const [isFollowLoading, setIsFollowLoading] = useState(false);

    // Cờ loading khi đang tìm kiếm và đối soát thông tin tài khoản khác từ server
    const [isInfoLoading, setIsInfoLoading] = useState(() => !isOwner && Boolean(cleanUsername));
    // Cờ loading khi đang tải số lượng thống kê (Followers / Following)
    const [isStatsLoading, setIsStatsLoading] = useState(
        () => Boolean(isOwner ? currentUser?.id : otherUser?.id || cleanUsername)
    );

    // Đối tượng người dùng hiển thị chuẩn hóa cho giao diện (currentUser nếu là trang của mình, otherUser nếu là người khác)
    const profileUser = isOwner
        ? currentUser
        : otherUser || {
              username: cleanUsername,
              name: cleanUsername,
              bio: "",
              avatar_url: null,
          };

    // Ref mảng lưu trữ các bài viết mới tạo trong phiên hiện tại để bảo toàn hiển thị khi đổi tab
    const newlyCreatedPostsRef = useRef([]);
    // Ref Set lưu các ID bài viết đã xóa trong phiên để đảm bảo không bị hiện lại do cache API hoặc ref
    const deletedPostIdsRef = useRef(new Set());

    // Cập nhật tiêu đề trang trên tab trình duyệt
    useDocumentTitle(
        profileUser?.name
            ? `${profileUser.name} (@${profileUser.username || cleanUsername || ""})`
            : cleanUsername
              ? `@${cleanUsername}`
              : t("profile.title")
    );

    // State số lượng người theo dõi (followers) của tài khoản
    const [followersCount, setFollowersCount] = useState(() => {
        return typeof otherUser?.followers_count === "number" ? otherUser.followers_count : 0;
    });
    // State số lượng người mà tài khoản này đang theo dõi (following)
    const [followingCount, setFollowingCount] = useState(() => {
        return typeof otherUser?.following_count === "number" ? otherUser.following_count : 0;
    });

    // Kích thước trang phân trang tải bài viết
    const PAGE_SIZE = 10;

    // ==========================================
    // State & Refs: Khởi tạo từ Module-level Cache
    // ==========================================
    const profileCacheKey = isOwner ? "me" : (cleanUsername || "").toLowerCase();
    if (!globalProfileCache.has(profileCacheKey)) {
        globalProfileCache.set(profileCacheKey, {
            activeTab: "threads",
            threads: { allSourcePosts: null, posts: [], isLoaded: false, scrollTop: 0 },
            reposts: { allSourcePosts: null, posts: [], isLoaded: false, scrollTop: 0 },
            suggestions: { scrollTop: 0 },
        });
    }
    const cachedProfileData = globalProfileCache.get(profileCacheKey);

    // Tab đang được chọn: ưu tiên lấy từ Module Cache
    const [activeTab, setActiveTab] = useState(() => cachedProfileData.activeTab || "threads");
    const currentCachedTab = cachedProfileData[cachedProfileData.activeTab || "threads"];

    // State danh sách bài viết đang hiển thị trên giao diện theo từng chunk
    const [posts, setPosts] = useState(() => currentCachedTab?.posts || []);
    // State lưu toàn bộ danh sách bài viết nguồn của tab hiện tại để phục vụ phân trang cắt lát (slice)
    const [allSourcePosts, setAllSourcePosts] = useState(() => currentCachedTab?.allSourcePosts || []);

    // Cờ loading khi tải bài viết lần đầu của tab (nếu đã nạp trong cache thì không hiển thị skeleton)
    const [isLoadingPosts, setIsLoadingPosts] = useState(() => {
        if (isOwner && (cachedProfileData.activeTab || "threads") === "suggestions") return false;
        return !currentCachedTab?.isLoaded;
    });
    // Cờ loading khi cuộn xuống đáy tải thêm bài viết (Infinite Scroll)
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    // State lưu thông báo lỗi khi tải bài viết thất bại
    const [postsError, setPostsError] = useState(null);
    // Khóa số nguyên kích hoạt tải lại toàn bộ dữ liệu khi người dùng bấm thử lại
    const [reloadKey, setReloadKey] = useState(0);

    // Bộ nhớ đệm (Cache) cho các tab trong trang cá nhân trỏ trực tiếp tới Module Cache
    const profileTabsCacheRef = useRef(cachedProfileData);
    const currentTabRef = useRef(activeTab);
    useEffect(() => {
        currentTabRef.current = activeTab;
    }, [activeTab]);

    // Lắng nghe sự kiện tương tác toàn cục để đồng bộ state danh sách bài viết trên trang cá nhân
    useEffect(() => {
        const handleInteractionUpdated = (e) => {
            const detail = e.detail;
            if (!detail?.postId) return;
            setPosts((prev) => updateCachedPostList(prev, detail));
            setAllSourcePosts((prev) => updateCachedPostList(prev, detail));
        };
        window.addEventListener("post:interaction_updated", handleInteractionUpdated);
        return () => {
            window.removeEventListener("post:interaction_updated", handleInteractionUpdated);
        };
    }, []);

    const isTabSwitchingRef = useRef(false);
    const isRestoringScrollRef = useRef(false);
    const isUnmountedRef = useRef(false);
    const tabSwitchTimerRef = useRef(null);

    // Cờ quản lý trạng thái hiển thị của Modal Chỉnh sửa hồ sơ cá nhân
    const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
    // Cờ quản lý trạng thái hiển thị của Modal Danh sách Followers / Following
    const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
    // Tab mặc định khi mở Follow Modal ("followers" hoặc "following")
    const [followModalInitialTab, setFollowModalInitialTab] = useState("followers");
    // Cờ quản lý trạng thái hiển thị của Modal Tạo bài viết mới
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Cờ quản lý hiển thị hộp thoại xác nhận Đăng xuất
    const [isLogoutAlertOpen, setIsLogoutAlertOpen] = useState(false);
    // Cờ loading trạng thái đang xử lý đăng xuất
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Xử lý xác nhận đăng xuất tài khoản
    const handleConfirmLogout = async () => {
        // 1. Bật cờ loading đăng xuất
        setIsLoggingOut(true);
        try {
            // 2. Gửi request đăng xuất lên server để hủy token / session
            await authService.logout();
        } catch {
            // 3. Nuốt lỗi nếu backend gặp sự cố để đảm bảo client vẫn dọn dẹp sạch sẽ
        } finally {
            // 4. Điều hướng về trang chủ TRƯỚC KHI dispatch logout để tránh PrivateRoute can thiệp đá sang /login
            navigate("/", { replace: true });
            // 5. Dispatch Redux action logout để xóa token và user khỏi Redux store & localStorage
            dispatch(logout());
            // 6. Tắt cờ loading và đóng hộp thoại xác nhận đăng xuất
            setIsLoggingOut(false);
            setIsLogoutAlertOpen(false);
        }
    };

    const openEditProfileModal = () => setIsEditProfileModalOpen(true);
    const closeEditProfileModal = () => setIsEditProfileModalOpen(false);

    // Tìm kiếm thông tin user khác từ API search, suggestions và danh sách followings của currentUser nếu truy cập dạng /:username
    useEffect(() => {
        if (isOwner || !cleanUsername) return;
        let isCancelled = false;

        const fetchOtherUserInfo = async () => {
            try {
                const targetUsernameLower = cleanUsername.toLowerCase();
                const promises = [
                    userService.searchUsers(cleanUsername),
                    userService.getSuggestions(),
                ];
                if (currentUser?.id) {
                    promises.push(userService.getFollowings(currentUser.id, { per_page: 100 }));
                }

                const [searchRes, suggRes, followingsRes] = await Promise.allSettled(promises);
                if (isCancelled) return;

                let foundUser = null;

                // 1. Lấy thông tin chính xác từ API search
                if (searchRes.status === "fulfilled") {
                    const data = searchRes.value?.data || searchRes.value;
                    const searchUsers = data?.users || (Array.isArray(data) ? data : []);
                    const matched = searchUsers.find(
                        (u) =>
                            u.username?.replace(/^@/, "").toLowerCase() === targetUsernameLower
                    ) || (searchUsers.length === 1 ? searchUsers[0] : null);

                    if (matched) {
                        foundUser = matched;
                    }
                }

                // 2. Kiểm tra trong danh sách suggestions nếu search chưa trả về
                if (!foundUser && suggRes.status === "fulfilled") {
                    const list = suggRes.value?.data || [];
                    const matched = list.find(
                        (u) =>
                            u.username?.replace(/^@/, "").toLowerCase() === targetUsernameLower
                    );
                    if (matched) {
                        foundUser = matched;
                    }
                }

                // 3. Kiểm tra xem người này có trong danh sách đang theo dõi của currentUser không
                let isMeFollowing = null;
                let matchFollowing = null;
                if (followingsRes && followingsRes.status === "fulfilled") {
                    const myFollowings = followingsRes.value?.data || [];
                    userCache.syncFollowings(myFollowings, currentUser?.id);
                    matchFollowing = myFollowings.find(
                        (u) =>
                            u.username?.replace(/^@/, "").toLowerCase() === targetUsernameLower
                    );
                    if (matchFollowing) {
                        isMeFollowing = true;
                    }
                }

                // Xác định trạng thái theo dõi chuẩn xác (kết hợp cache toàn cục, API followings và search)
                const targetIdForCache =
                    foundUser?.id || userCache.getByUsername(cleanUsername)?.id;
                const isCachedFollow = isAuthenticated && userCache.isFollowing(
                    targetIdForCache,
                    cleanUsername
                );

                const nextIsFollowing =
                    !isAuthenticated
                        ? false
                        : isMeFollowing !== null
                          ? isMeFollowing
                          : isCachedFollow
                            ? true
                            : foundUser?.is_following !== undefined
                              ? Boolean(foundUser.is_following)
                              : null;

                // Cập nhật thông tin otherUser, BẢO TOÀN avatar_url không bị null
                setOtherUser((prev) => {
                    const merged = {
                        ...prev,
                        ...(foundUser || {}),
                        ...(matchFollowing || {}),
                    };

                    // Bảo toàn avatar_url: API getFollowings trả về avatar_url: null, không được để ghi đè mất ảnh
                    const safeAvatar =
                        foundUser?.avatar_url ||
                        prev?.avatar_url ||
                        userCache.getByUsername(cleanUsername)?.avatar_url ||
                        matchFollowing?.avatar_url ||
                        null;

                    merged.avatar_url = safeAvatar;
                    userCache.saveUser(merged);
                    return merged;
                });

                if (nextIsFollowing !== null) {
                    setIsFollowing(nextIsFollowing);
                }

                if (foundUser?.followers_count !== undefined) {
                    setFollowersCount(foundUser.followers_count);
                }
                if (foundUser?.following_count !== undefined) {
                    setFollowingCount(foundUser.following_count);
                }

                // Nếu không tìm thấy user mục tiêu và không có ID trong cache, tắt cờ isStatsLoading
                const hasCachedId = Boolean(userCache.getByUsername(cleanUsername)?.id);
                if (!foundUser?.id && !hasCachedId) {
                    setIsStatsLoading(false);
                }
            } catch {
                // Bỏ qua lỗi ngầm
            } finally {
                if (!isCancelled) {
                    setIsInfoLoading(false);
                }
            }
        };

        fetchOtherUserInfo();

        return () => {
            isCancelled = true;
        };
    }, [isOwner, cleanUsername, currentUser?.id, reloadKey, isAuthenticated]);

    // Hook quản lý tương tác bài viết (Like, Repost, Comment, Quote, Edit, Share Image...)
    const interactions = usePostInteractions({
        posts,
        setPosts,
        onFollowSuccess: ({ authorId, isFollowing: nextFollowing }) => {
            const authorIdStr = String(authorId);
            const updateList = (list) =>
                list.map((p) => {
                    let changed = false;
                    let newP = p;
                    if (p.user && String(p.user.id) === authorIdStr) {
                        newP = {
                            ...newP,
                            user: {
                                ...newP.user,
                                is_followed_by_auth: nextFollowing,
                                is_following: nextFollowing,
                            },
                        };
                        changed = true;
                    }
                    if (
                        p.original_post &&
                        p.original_post.user &&
                        String(p.original_post.user.id) === authorIdStr
                    ) {
                        newP = {
                            ...newP,
                            original_post: {
                                ...newP.original_post,
                                user: {
                                    ...newP.original_post.user,
                                    is_followed_by_auth: nextFollowing,
                                    is_following: nextFollowing,
                                },
                            },
                        };
                        changed = true;
                    }
                    return changed ? newP : p;
                });

            setAllSourcePosts((prev) => updateList(prev));

            // Đồng bộ trạng thái ProfileHeader nếu tác giả chính là user đang xem
            if (!isOwner && otherUser?.id && String(otherUser.id) === authorIdStr) {
                setIsFollowing(nextFollowing);
                setFollowersCount((prev) =>
                    Math.max(0, nextFollowing ? prev + 1 : prev - 1),
                );
            }
        },
        onDeleteSuccess: (deletedPostId) => {
            const idStr = String(deletedPostId);
            deletedPostIdsRef.current.add(idStr);
            userCache.markPostDeleted(idStr);
            const filterFn = (p) => {
                const pid = String(p.id);
                const origId = String(p.original_post_id || p.original_post?.id || "");
                return pid !== idStr && origId !== idStr;
            };
            newlyCreatedPostsRef.current = newlyCreatedPostsRef.current.filter(filterFn);
            setAllSourcePosts((prev) => prev.filter(filterFn));
            setPosts((prev) => prev.filter(filterFn));

            // Đồng bộ loại bỏ bài viết trong tất cả các tab đã cache
            Object.keys(profileTabsCacheRef.current).forEach((key) => {
                const tabData = profileTabsCacheRef.current[key];
                if (tabData?.isLoaded) {
                    tabData.allSourcePosts = (tabData.allSourcePosts || []).filter(filterFn);
                    tabData.posts = (tabData.posts || []).filter(filterFn);
                }
            });
        },
        onEditSuccess: (updatedPost) => {
            if (!updatedPost?.id) return;
            const updatedIdStr = String(updatedPost.id);
            newlyCreatedPostsRef.current = newlyCreatedPostsRef.current.map((p) =>
                String(p.id) === updatedIdStr ? { ...p, ...updatedPost } : p
            );
            setAllSourcePosts((prev) =>
                prev.map((p) => (String(p.id) === updatedIdStr ? { ...p, ...updatedPost } : p))
            );
            setPosts((prev) =>
                prev.map((p) => (String(p.id) === updatedIdStr ? { ...p, ...updatedPost } : p))
            );

            // Đồng bộ cập nhật bài viết trong tất cả các tab đã cache
            Object.keys(profileTabsCacheRef.current).forEach((key) => {
                const tabData = profileTabsCacheRef.current[key];
                if (tabData?.isLoaded) {
                    tabData.allSourcePosts = (tabData.allSourcePosts || []).map((p) =>
                        String(p.id) === updatedIdStr ? { ...p, ...updatedPost } : p
                    );
                    tabData.posts = (tabData.posts || []).map((p) =>
                        String(p.id) === updatedIdStr ? { ...p, ...updatedPost } : p
                    );
                }
            });
        },
        onRepostSuccess: ({ postId, isReposted, target, isError }) => {
            if (isError) {
                setReloadKey((prev) => prev + 1);
                return;
            }
            // Chỉ gỡ bài viết khỏi danh sách Reposts khi đang ở trên trang cá nhân của chính mình (isOwner)
            if (isOwner && activeTab === "reposts" && !isReposted) {
                const targetRepostId = target?.repost_record_id;
                const filterFn = (p) => {
                    const matchesPostId =
                        String(p.id) === String(postId) ||
                        String(p.original_post_id) === String(postId) ||
                        String(p.original_post?.id) === String(postId);
                    const matchesRepostId =
                        targetRepostId && String(p.id) === String(targetRepostId);
                    return !matchesPostId && !matchesRepostId;
                };
                setAllSourcePosts((prev) => prev.filter(filterFn));
                setPosts((prevPosts) => prevPosts.filter(filterFn));

                if (profileTabsCacheRef.current.reposts?.isLoaded) {
                    profileTabsCacheRef.current.reposts.allSourcePosts =
                        (profileTabsCacheRef.current.reposts.allSourcePosts || []).filter(filterFn);
                    profileTabsCacheRef.current.reposts.posts =
                        (profileTabsCacheRef.current.reposts.posts || []).filter(filterFn);
                }
            }
        },
    });

    // Lắng nghe sự kiện toàn cục post:deleted để loại bỏ bài viết nếu bị xóa từ nơi khác
    useEffect(() => {
        const handleGlobalPostDeleted = (e) => {
            const deletedId = e?.detail;
            if (!deletedId) return;
            const idStr = String(deletedId);
            deletedPostIdsRef.current.add(idStr);
            userCache.markPostDeleted(idStr);
            const filterFn = (p) => {
                const pid = String(p.id);
                const origId = String(p.original_post_id || p.original_post?.id || "");
                return pid !== idStr && origId !== idStr;
            };
            newlyCreatedPostsRef.current = newlyCreatedPostsRef.current.filter(filterFn);
            setPosts((prev) => prev.filter(filterFn));
            setAllSourcePosts((prev) => prev.filter(filterFn));

            // Đồng bộ loại bỏ bài viết trong tất cả các tab đã cache
            Object.keys(profileTabsCacheRef.current).forEach((key) => {
                const tabData = profileTabsCacheRef.current[key];
                if (tabData?.isLoaded) {
                    tabData.allSourcePosts = (tabData.allSourcePosts || []).filter(filterFn);
                    tabData.posts = (tabData.posts || []).filter(filterFn);
                }
            });
        };

        window.addEventListener("post:deleted", handleGlobalPostDeleted);
        return () => window.removeEventListener("post:deleted", handleGlobalPostDeleted);
    }, []);

    // Quản lý phân trang & Cuộn vô tận (Infinite Scroll)
    const hasMore = posts.length < allSourcePosts.length;

    const handleLoadMore = useCallback(() => {
        // Tạm khóa Infinite Scroll khi đang trong quá trình chuyển tab
        if (isTabSwitchingRef.current) return;
        if (isLoadingPosts || isLoadingMore) return;
        if (posts.length >= allSourcePosts.length) return;

        setIsLoadingMore(true);
        setTimeout(() => {
            setPosts((prevPosts) => {
                const currentCount = prevPosts.length;
                const nextPosts = allSourcePosts.slice(0, currentCount + PAGE_SIZE);
                if (profileTabsCacheRef.current[activeTab]) {
                    profileTabsCacheRef.current[activeTab].posts = nextPosts;
                }
                return nextPosts;
            });
            setIsLoadingMore(false);
        }, 300);
    }, [isLoadingPosts, isLoadingMore, posts.length, allSourcePosts, activeTab]);

    const { lastElementRef } = useInfiniteScroll({
        onLoadMore: handleLoadMore,
        hasMore,
        isLoading: isLoadingPosts || isLoadingMore,
        isLockedRef: isTabSwitchingRef,
        rootMargin: "250px",
    });

    // Đồng bộ cuộn 2 chiều mượt mà giữa container và trang ngoài
    const cardRef = useRef(null);
    const contentRef = useRef(null);
    const spacerRef = useRef(null);
    const { spacerHeight, handleCardScroll, restoreScroll } = useWindowScrollSync({
        cardRef,
        contentRef,
        spacerRef,
        deps: [posts.length, isLoadingPosts, isLoadingMore, activeTab],
    });

    // Quản lý cờ unmount để chặn mọi sự kiện cuộn rơi vào 0 khi component bị unmount khỏi DOM
    useEffect(() => {
        isUnmountedRef.current = false;
        isRestoringScrollRef.current = false;
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // Lắng nghe cuộn liên tục trên cardRef để lưu vị trí cuộn thực tế theo thời gian thực (chống mất vị trí khi click đổi tab nhanh)
    useEffect(() => {
        const cardEl = cardRef?.current;
        if (!cardEl) return;

        const onScroll = () => {
            if (isUnmountedRef.current || isRestoringScrollRef.current) return;
            // Bỏ qua nếu khung card đang bị thu hẹp hoặc không có nội dung cuộn (unmounting / skeleton)
            if (cardEl.scrollHeight <= cardEl.clientHeight + 10) return;

            const top = cardEl.scrollTop;
            if (profileTabsCacheRef.current[currentTabRef.current]) {
                profileTabsCacheRef.current[currentTabRef.current].scrollTop = top;
            }
        };

        cardEl.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            cardEl.removeEventListener("scroll", onScroll);
        };
    }, [cardRef]);

    // Tải danh sách bài viết theo tab (threads hoặc reposts)
    const fetchPostsForTab = useCallback(
        async (tabKey) => {
            if (isOwner && tabKey === "suggestions") {
                setIsLoadingPosts(false);
                return;
            }

            const effectiveTab = !isOwner && tabKey === "suggestions" ? "threads" : tabKey;

            if (currentTabRef.current === effectiveTab) {
                setIsLoadingPosts(true);
                setPostsError(null);
            }

            try {
                if (effectiveTab === "reposts") {
                    const targetId = isOwner ? currentUser?.id : otherUser?.id;
                    if (!targetId) {
                        if (currentTabRef.current === "reposts") {
                            setAllSourcePosts([]);
                            setPosts([]);
                            setIsLoadingPosts(false);
                        }
                        return;
                    }

                    const res = await userService.getUserReposts(targetId, { per_page: 20 });
                    if (currentTabRef.current !== effectiveTab) return;
                    const repostsList = (res?.data || [])
                        .filter(
                            (p) =>
                                !deletedPostIdsRef.current.has(String(p.id)) &&
                                !deletedPostIdsRef.current.has(String(p.original_post_id)) &&
                                !deletedPostIdsRef.current.has(String(p.original_post?.id)) &&
                                !userCache.isPostDeleted(p.id) &&
                                !userCache.isPostDeleted(p.original_post_id) &&
                                !userCache.isPostDeleted(p.original_post?.id) &&
                                Boolean(p.original_post?.id || p.content),
                        )
                        .map((p) => userCache.enrichPost(p));
                    const initialPosts = repostsList.slice(0, PAGE_SIZE);
                    profileTabsCacheRef.current.reposts = {
                        allSourcePosts: repostsList,
                        posts: initialPosts,
                        isLoaded: true,
                        scrollTop: profileTabsCacheRef.current.reposts?.scrollTop ?? 0,
                    };
                    if (currentTabRef.current === "reposts") {
                        setAllSourcePosts(repostsList);
                        setPosts(initialPosts);
                        setIsLoadingPosts(false);
                        setPostsError(null);
                    }
                } else if (effectiveTab === "threads") {
                    // Nạp feed for_you và following với kích thước trang tối ưu (per_page: 200)
                    const feedPromises = [
                        postService.getFeed({ type: "for_you", page: 1, per_page: 200 }),
                    ];
                    if (currentUser?.id) {
                        feedPromises.push(
                            postService.getFeed({ type: "following", page: 1, per_page: 50 })
                        );
                    }

                    // Nếu chưa quét sâu toàn bộ hệ thống hoặc chưa có bài viết của user này trong cache:
                    // Quét song song trang 2 của feed for_you (với per_page: 200) để bao phủ toàn bộ 354 bài viết trong hệ thống
                    if (
                        !userCache.isDeepScanned() ||
                        (cleanUsername && userCache.getPostsByUsername(cleanUsername).length === 0)
                    ) {
                        feedPromises.push(
                            postService
                                .getFeed({ type: "for_you", page: 2, per_page: 200 })
                                .catch(() => null)
                        );
                    }

                    const feedResults = await Promise.allSettled(feedPromises);
                    if (currentTabRef.current !== effectiveTab) return;

                    const feedPosts = [];
                    feedResults.forEach((r) => {
                        if (r.status === "fulfilled" && r.value) {
                            const list = r.value?.data || [];
                            if (Array.isArray(list)) {
                                feedPosts.push(...list);
                            }
                        }
                    });

                    // Lưu toàn bộ bài viết mới tải vào cache để bảo toàn cho các trang cá nhân tiếp theo
                    userCache.savePosts(feedPosts);
                    userCache.setDeepScanned(true);

                    // Lấy thêm các bài viết đã cache của user này (nếu có từ trước)
                    const cachedPosts = cleanUsername
                        ? userCache.getPostsByUsername(cleanUsername)
                        : [];

                    const combined = [...cachedPosts, ...feedPosts];

                    // Loại bỏ bài viết trùng lặp theo ID
                    const uniquePostMap = new Map();
                    combined.forEach((p) => {
                        if (p?.id && !uniquePostMap.has(String(p.id))) {
                            uniquePostMap.set(String(p.id), p);
                        }
                    });
                    const allPosts = Array.from(uniquePostMap.values()).map((p) => userCache.enrichPost(p));

                    if (isOwner) {
                        const userPosts = allPosts
                            .filter(
                                (p) =>
                                    p.user?.id === currentUser?.id ||
                                    p.author?.id === currentUser?.id,
                            )
                            .filter(
                                (p) =>
                                    !deletedPostIdsRef.current.has(String(p.id)) &&
                                    !userCache.isPostDeleted(p.id),
                            )
                            .sort((a, b) => {
                                const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
                                const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
                                if (timeB !== timeA) return timeB - timeA;
                                return (b.id || 0) - (a.id || 0);
                            });

                        const existingIds = new Set(userPosts.map((p) => String(p.id)));
                        const pendingNewPosts = newlyCreatedPostsRef.current
                            .filter(
                                (p) =>
                                    !deletedPostIdsRef.current.has(String(p.id)) &&
                                    !userCache.isPostDeleted(p.id),
                            )
                            .filter((p) => !existingIds.has(String(p.id)));
                        const finalPosts = [...pendingNewPosts, ...userPosts];
                        const initialPosts = finalPosts.slice(0, PAGE_SIZE);
                        profileTabsCacheRef.current.threads = {
                            allSourcePosts: finalPosts,
                            posts: initialPosts,
                            isLoaded: true,
                            scrollTop: profileTabsCacheRef.current.threads?.scrollTop ?? 0,
                        };
                        if (currentTabRef.current === "threads") {
                            setAllSourcePosts(finalPosts);
                            setPosts(initialPosts);
                            setIsLoadingPosts(false);
                            setPostsError(null);
                        }
                    } else if (cleanUsername) {
                        const targetUsernameLower = cleanUsername.toLowerCase();
                        const userPosts = allPosts
                            .filter((p) => {
                                const postUsername = (p.user?.username || p.author?.username || "")
                                    .replace(/^@/, "")
                                    .toLowerCase();
                                return postUsername === targetUsernameLower;
                            })
                            .filter(
                                (p) =>
                                    !deletedPostIdsRef.current.has(String(p.id)) &&
                                    !userCache.isPostDeleted(p.id),
                            )
                            .sort((a, b) => {
                                const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
                                const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
                                if (timeB !== timeA) return timeB - timeA;
                                return (b.id || 0) - (a.id || 0);
                            });

                        // Nếu tìm thấy bài viết của user, cập nhật thông tin tác giả và bảo toàn avatar
                        if (userPosts.length > 0) {
                            const matchedPost = userPosts[0];
                            const author =
                                (matchedPost.user?.username || "").replace(/^@/, "").toLowerCase() === targetUsernameLower
                                ? matchedPost.user
                                : matchedPost.author;
                            if (author) {
                                setOtherUser((prev) => {
                                    const merged = { ...prev, ...author };
                                    merged.avatar_url =
                                        author.avatar_url ||
                                        prev?.avatar_url ||
                                        userCache.getByUsername(cleanUsername)?.avatar_url ||
                                        null;
                                    userCache.saveUser(merged);
                                    return merged;
                                });
                                if (author.is_following !== undefined) {
                                    setIsFollowing(Boolean(author.is_following));
                                }
                                if (author.followers_count !== undefined) {
                                    setFollowersCount(author.followers_count);
                                }
                                if (author.following_count !== undefined) {
                                    setFollowingCount(author.following_count);
                                }
                            }
                        }

                        const initialPosts = userPosts.slice(0, PAGE_SIZE);
                        profileTabsCacheRef.current.threads = {
                            allSourcePosts: userPosts,
                            posts: initialPosts,
                            isLoaded: true,
                            scrollTop: profileTabsCacheRef.current.threads?.scrollTop ?? 0,
                        };
                        if (currentTabRef.current === "threads") {
                            setAllSourcePosts(userPosts);
                            setPosts(initialPosts);
                            setIsLoadingPosts(false);
                            setPostsError(null);
                        }
                    }
                }
            } catch {
                if (currentTabRef.current === effectiveTab) {
                    setPostsError("Không thể tải bài viết, vui lòng thử lại sau.");
                    setAllSourcePosts([]);
                    setPosts([]);
                    setIsLoadingPosts(false);
                }
            }
        },
        [isOwner, currentUser, otherUser, cleanUsername],
    );

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
            profileTabsCacheRef.current.activeTab = newTab;
            setActiveTab(newTab);

            if (newTab === "suggestions") {
                setIsLoadingPosts(false);
                const targetScroll = profileTabsCacheRef.current.suggestions?.scrollTop ?? 0;
                restoreScroll(targetScroll);
                return;
            }

            const cached = profileTabsCacheRef.current[newTab];
            if (cached && cached.isLoaded) {
                // ĐỒNG BỘ: Cập nhật state bài viết ngay trong batch này -> hiển thị ngay bài viết mới, không nháy bài viết cũ
                setAllSourcePosts(cached.allSourcePosts || []);
                setPosts(cached.posts || []);
                setIsLoadingPosts(false);
                setPostsError(null);

                const targetScroll = cached.scrollTop ?? 0;
                restoreScroll(targetScroll);
            } else {
                // Tab chưa từng nạp dữ liệu -> xóa list, bật skeleton và gọi API lần đầu
                setAllSourcePosts([]);
                setPosts([]);
                setIsLoadingPosts(true);
                setPostsError(null);

                restoreScroll(0);
                fetchPostsForTab(newTab);
            }
        },
        [restoreScroll, fetchPostsForTab],
    );

    // Tải dữ liệu ban đầu cho tab khởi tạo khi mở trang cá nhân (hoặc khôi phục từ Module Cache khi quay lại trang)
    const hasInitializedRef = useRef(false);
    useEffect(() => {
        if (!hasInitializedRef.current) {
            hasInitializedRef.current = true;
            if (activeTab === "suggestions") {
                if (isOwner) {
                    const targetScroll = profileTabsCacheRef.current.suggestions?.scrollTop ?? 0;
                    restoreScroll(targetScroll);
                } else {
                    // eslint-disable-next-line react-hooks/set-state-in-effect
                    fetchPostsForTab("threads");
                }
                return;
            }

            const cached = profileTabsCacheRef.current[activeTab];
            if (cached && cached.isLoaded) {
                // Đã có cache trong module (quay lại từ Home, Search, Activity, PostDetail...) -> khôi phục lại vị trí cuộn 0ms
                isRestoringScrollRef.current = true;
                const targetScroll = cached.scrollTop ?? 0;
                restoreScroll(targetScroll);
                const timer = setTimeout(() => {
                    isRestoringScrollRef.current = false;
                }, 400);
                return () => clearTimeout(timer);
            } else {
                fetchPostsForTab(activeTab);
            }
        }
    }, [activeTab, isOwner, fetchPostsForTab, restoreScroll]);

    // Khi người dùng bấm lại vào icon Profile trên thanh điều hướng lúc đang ở Profile (cuộn mượt lên đỉnh)
    useEffect(() => {
        const handleProfileReTap = () => {
            if (cardRef?.current) {
                cardRef.current.scrollTo({ top: 0, behavior: "smooth" });
            }
            if (typeof window !== "undefined") {
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        };

        window.addEventListener("profile:re-tap", handleProfileReTap);
        return () => window.removeEventListener("profile:re-tap", handleProfileReTap);
    }, [cardRef]);

    // Khi otherUser?.id tải xong muộn hơn, nếu tab hiện tại là reposts và chưa có dữ liệu -> nạp reposts
    useEffect(() => {
        if (
            !isOwner &&
            otherUser?.id &&
            currentTabRef.current === "reposts" &&
            !profileTabsCacheRef.current.reposts?.isLoaded
        ) {
            fetchPostsForTab("reposts");
        }
    }, [isOwner, otherUser?.id, fetchPostsForTab]);

    // Tải số lượng followers và following của tài khoản mục tiêu
    const targetUserId = isOwner ? currentUser?.id : otherUser?.id;

    useEffect(() => {
        if (!targetUserId) return;
        let isCancelled = false;

        const loadStats = async () => {
            try {
                const [resFollowers, resFollowings] = await Promise.allSettled([
                    userService.getFollowers(targetUserId),
                    userService.getFollowings(targetUserId),
                ]);

                if (isCancelled) return;

                if (resFollowers.status === "fulfilled") {
                    const followersList = resFollowers.value?.data || [];
                    const total =
                        resFollowers.value?.pagination?.total ??
                        followersList.length ??
                        0;
                    setFollowersCount(total);

                    // Đồng bộ trạng thái isFollowing nếu currentUser có mặt trong danh sách followers của user này
                    if (!isOwner && currentUser) {
                        const isMeInFollowers = followersList.some(
                            (u) =>
                                (currentUser.id && u.id === currentUser.id) ||
                                (currentUser.username &&
                                    u.username?.toLowerCase() ===
                                        currentUser.username.toLowerCase())
                        );
                        if (isMeInFollowers) {
                            setIsFollowing(true);
                        }
                    }
                }
                if (resFollowings.status === "fulfilled") {
                    const total =
                        resFollowings.value?.pagination?.total ??
                        resFollowings.value?.data?.length ??
                        0;
                    setFollowingCount(total);
                }
            } catch {
                // Fallback im lặng nếu lỗi mạng
            } finally {
                if (!isCancelled) {
                    setIsStatsLoading(false);
                }
            }
        };

        loadStats();

        return () => {
            isCancelled = true;
        };
    }, [targetUserId, isOwner, currentUser, reloadKey]);

    // Lắng nghe sự kiện theo dõi toàn cục từ bất kỳ trang nào khác (Activity, Feed, Search...)
    useEffect(() => {
        if (isOwner) return;
        const handleFollowChanged = (e) => {
            const { userId, username, isFollowing: nextFollow } = e.detail || {};
            const targetIdStr = otherUser?.id ? String(otherUser.id) : null;
            const targetUsernameLower = cleanUsername ? cleanUsername.toLowerCase() : null;

            const matchesId = userId && targetIdStr && String(userId) === targetIdStr;
            const matchesName =
                username &&
                targetUsernameLower &&
                String(username).toLowerCase() === targetUsernameLower;

            if (matchesId || matchesName) {
                setIsFollowing(nextFollow);
                setFollowersCount((prev) => Math.max(0, nextFollow ? prev + 1 : prev - 1));
            }
        };

        window.addEventListener("user:follow_changed", handleFollowChanged);
        return () => window.removeEventListener("user:follow_changed", handleFollowChanged);
    }, [isOwner, otherUser?.id, cleanUsername]);

    // Xử lý tương tác Theo dõi / Bỏ theo dõi khi xem trang người khác với 0ms Optimistic UI và Self-Healing
    const handleToggleFollow = async () => {
        // 1. Kiểm tra guard: Không thể tự follow chính mình, hoặc khi thiếu target ID, hoặc khi đang tải dữ liệu/loading
        if (isOwner || !otherUser?.id || isFollowLoading || isInfoLoading || isStatsLoading) return;

        // 2. Ghi nhớ trạng thái follow cũ và tính toán trạng thái kế tiếp
        const previousFollowing = isFollowing;
        const nextFollowing = !isFollowing;
        const targetUserIdStr = String(otherUser.id);

        // 3. Optimistic Update (0ms latency): Cập nhật ngay trạng thái nút và bộ đếm followers
        setIsFollowing(nextFollowing);
        userCache.setFollowing(otherUser, nextFollowing, cleanUsername);
        setFollowersCount((prev) => Math.max(0, nextFollowing ? prev + 1 : prev - 1));
        setIsFollowLoading(true);

        const updatePostsAuthor = (list, nextState) =>
            list.map((p) => {
                let changed = false;
                let newP = p;
                if (p.user && String(p.user.id) === targetUserIdStr) {
                    newP = {
                        ...newP,
                        user: {
                            ...newP.user,
                            is_followed_by_auth: nextState,
                            is_following: nextState,
                        },
                    };
                    changed = true;
                }
                if (
                    p.original_post &&
                    p.original_post.user &&
                    String(p.original_post.user.id) === targetUserIdStr
                ) {
                    newP = {
                        ...newP,
                        original_post: {
                            ...newP.original_post,
                            user: {
                                ...newP.original_post.user,
                                is_followed_by_auth: nextState,
                                is_following: nextState,
                            },
                        },
                    };
                    changed = true;
                }
                return changed ? newP : p;
            });

        // 4. Đồng bộ optimistic cho author của các bài viết đang hiển thị trong tab
        setPosts((prev) => updatePostsAuthor(prev, nextFollowing));
        setAllSourcePosts((prev) => updatePostsAuthor(prev, nextFollowing));

        try {
            // 5. Gửi request tương ứng lên server: unfollowUser hoặc followUser
            if (previousFollowing) {
                await userService.unfollowUser(otherUser.id);
            } else {
                await userService.followUser(otherUser.id);
            }

            // 6. Lưu trạng thái mới nhất vào userCache
            userCache.saveUser({
                ...otherUser,
                is_following: nextFollowing,
                is_followed_by_auth: nextFollowing,
                followers_count: Math.max(0, nextFollowing ? followersCount + 1 : followersCount - 1),
            });

            // 7. Thông báo toast thành công cho người dùng
            const rawUsername = otherUser.username || otherUser.name || "";
            const cleanName = rawUsername ? `@${String(rawUsername).replace(/^@/, "")}` : "";

            if (nextFollowing) {
                toast.success(
                    t("profile.follow_success", {
                        username: cleanName,
                        defaultValue: `Đã theo dõi ${cleanName}`,
                    }),
                );
            } else {
                toast.info(
                    t("profile.unfollow_success", {
                        username: cleanName,
                        defaultValue: `Đã bỏ theo dõi ${cleanName}`,
                    }),
                );
            }
        } catch (err) {
            // 8. Tự chữa lành (Self-Healing) hoặc Rollback khi có lỗi phát sinh
            const message = err?.response?.data?.message || err?.message || "";
            const isAlreadyFollowing = /already following/i.test(message);

            if (isAlreadyFollowing) {
                // Server báo đã follow từ trước: ép trạng thái thành true và cập nhật cache
                userCache.setFollowing(otherUser, true, cleanUsername);
                setIsFollowing(true);
                toast.info(
                    t("profile.already_following", {
                        defaultValue: "Bạn đã theo dõi người dùng này rồi",
                    }),
                );
            } else {
                // Rollback về trạng thái cũ nếu lỗi mạng hoặc lỗi server khác
                userCache.setFollowing(otherUser, previousFollowing, cleanUsername);
                setIsFollowing(previousFollowing);
                setFollowersCount((prev) =>
                    Math.max(0, previousFollowing ? prev + 1 : prev - 1)
                );
                setPosts((prev) => updatePostsAuthor(prev, previousFollowing));
                setAllSourcePosts((prev) => updatePostsAuthor(prev, previousFollowing));
                toast.error(
                    t(
                        "profile.follow_failed",
                        "Không thể cập nhật trạng thái theo dõi. Vui lòng thử lại.",
                    ),
                );
            }
        } finally {
            // 9. Giải phóng cờ loading của nút follow
            setIsFollowLoading(false);
        }
    };

    // Xử lý khi thay đổi follow từ các modal
    const handleFollowChange = ({ userId: changedUserId, isFollowing: nextFollowState }) => {
        const changedUserIdStr = String(changedUserId);
        const updatePostsAuthor = (list, nextState) =>
            list.map((p) => {
                let changed = false;
                let newP = p;
                if (p.user && String(p.user.id) === changedUserIdStr) {
                    newP = {
                        ...newP,
                        user: {
                            ...newP.user,
                            is_followed_by_auth: nextState,
                            is_following: nextState,
                        },
                    };
                    changed = true;
                }
                if (
                    p.original_post &&
                    p.original_post.user &&
                    String(p.original_post.user.id) === changedUserIdStr
                ) {
                    newP = {
                        ...newP,
                        original_post: {
                            ...newP.original_post,
                            user: {
                                ...newP.original_post.user,
                                is_followed_by_auth: nextState,
                                is_following: nextState,
                            },
                        },
                    };
                    changed = true;
                }
                return changed ? newP : p;
            });

        setPosts((prev) => updatePostsAuthor(prev, nextFollowState));
        setAllSourcePosts((prev) => updatePostsAuthor(prev, nextFollowState));

        // Nếu người được tương tác trong modal chính là chủ profile đang xem
        if (!isOwner && otherUser?.id && String(changedUserId) === String(otherUser.id)) {
            setIsFollowing(nextFollowState);
            setFollowersCount((prev) => Math.max(0, nextFollowState ? prev + 1 : prev - 1));
            userCache.saveUser({
                ...otherUser,
                is_following: nextFollowState,
                is_followed_by_auth: nextFollowState,
                followers_count: Math.max(0, nextFollowState ? followersCount + 1 : followersCount - 1),
            });
        } else if (isOwner) {
            setFollowingCount((prev) => Math.max(0, nextFollowState ? prev + 1 : prev - 1));
        }
    };

    // Mở modal Follow với tab chỉ định
    const handleOpenFollowModal = (tab = "followers") => {
        if (isStatsLoading) return;
        setFollowModalInitialTab(tab);
        setIsFollowModalOpen(true);
    };

    // Xử lý tạo bài viết thành công: Đóng modal, hiển thị toast và điều hướng về trang Home
    const handleCreatePostSuccess = useCallback(
        (newPost) => {
            setIsCreateModalOpen(false);
            toast.success(
                t("post.create_success", {
                    defaultValue: "Đã đăng bài viết mới",
                }),
            );
            window.dispatchEvent(new CustomEvent("post:created", { detail: newPost }));
            navigate("/", { state: { newPost } });
        },
        [navigate, t],
    );

    const handleReloadPosts = useCallback(() => {
        globalProfileCache.delete(profileCacheKey);
        profileTabsCacheRef.current = {
            threads: { allSourcePosts: null, posts: [], isLoaded: false, scrollTop: 0 },
            reposts: { allSourcePosts: null, posts: [], isLoaded: false, scrollTop: 0 },
            suggestions: { scrollTop: 0 },
        };
        globalProfileCache.set(profileCacheKey, profileTabsCacheRef.current);
        setReloadKey((prev) => prev + 1);
        if (currentTabRef.current !== "suggestions") {
            setIsLoadingPosts(true);
            setPosts([]);
            setAllSourcePosts([]);
            fetchPostsForTab(currentTabRef.current);
        }
    }, [fetchPostsForTab, profileCacheKey]);

    return {
        // User & Thống kê
        currentUser,
        profileUser,
        isOwner,
        cleanUsername,
        followersCount,
        followingCount,
        isFollowing,
        isFollowLoading,
        isInfoLoading,
        isStatsLoading,
        handleToggleFollow,

        // Tab & Bài viết & Infinite Scroll
        activeTab,
        setActiveTab: handleTabChange,
        posts,
        isLoadingPosts,
        isLoadingMore,
        hasMore,
        lastElementRef,
        handleLoadMore,
        postsError,
        handleReloadPosts,

        // Cuộn & Refs
        cardRef,
        contentRef,
        spacerRef,
        spacerHeight,
        handleCardScroll,

        // Modals state & handlers
        isEditProfileModalOpen,
        setIsEditProfileModalOpen,
        openEditProfileModal,
        closeEditProfileModal,
        isFollowModalOpen,
        setIsFollowModalOpen,
        followModalInitialTab,
        isCreateModalOpen,
        setIsCreateModalOpen,
        handleFollowChange,
        handleOpenFollowModal,
        handleCreatePostSuccess,

        // Đăng xuất (Logout)
        isLogoutAlertOpen,
        setIsLogoutAlertOpen,
        isLoggingOut,
        handleConfirmLogout,

        // Tương tác bài viết
        ...interactions,
    };
};

export default useProfilePage;
