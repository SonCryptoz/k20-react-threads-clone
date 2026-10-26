import { useState, useEffect, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

import useDocumentTitle from "@/hooks/useDocumentTitle";
import useWindowScrollSync from "@/hooks/useWindowScrollSync";
import usePostInteractions from "@/hooks/usePostInteractions";
import useInfiniteScroll from "@/hooks/useInfiniteScroll";
import userService from "@/services/userService";
import userCache from "@/utils/userCache";
import { toast } from "@/components/ui/toast";

const PAGE_SIZE = 10;

// =========================================================================
// Module-level Cache cho Trang Hoạt động:
// Bảo toàn tab đang mở, danh sách followers, reposts và vị trí cuộn
// khi chuyển đổi giữa các trang (Activity <-> Home <-> Search <-> Profile)
// =========================================================================
const globalActivityCache = {
    followers: [],
    allSourceReposts: [],
    reposts: [],
    isFollowersLoaded: false,
    isRepostsLoaded: false,
    lastActiveTab: "followers",
    followingMap: {},
    scrollTops: {
        followers: 0,
        reposts: 0,
    },
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
    // Xóa cache hoạt động khi đăng xuất hoặc chuyển đổi tài khoản
    window.addEventListener("user:session_changed", () => {
        globalActivityCache.followers = [];
        globalActivityCache.allSourceReposts = [];
        globalActivityCache.reposts = [];
        globalActivityCache.isFollowersLoaded = false;
        globalActivityCache.isRepostsLoaded = false;
        globalActivityCache.lastActiveTab = "followers";
        globalActivityCache.followingMap = {};
        globalActivityCache.scrollTops = { followers: 0, reposts: 0 };
    });

    // Đồng bộ tương tác (Like, Repost) vào cache tab Reposts ở module level
    window.addEventListener("post:interaction_updated", (e) => {
        const detail = e.detail;
        if (!detail?.postId) return;
        if (globalActivityCache.reposts) {
            globalActivityCache.reposts = updateCachedPostList(globalActivityCache.reposts, detail);
        }
        if (globalActivityCache.allSourceReposts) {
            globalActivityCache.allSourceReposts = updateCachedPostList(globalActivityCache.allSourceReposts, detail);
        }
    });
}

/**
 * useActivityPage
 * Custom hook quản lý toàn bộ nghiệp vụ và trạng thái cho trang Hoạt động (/activity):
 * - Quản lý chuyển đổi giữa 2 tab: Lượt theo dõi ("followers") và Bài đăng lại ("reposts")
 * - Tải danh sách người theo dõi (`getFollowers`) kết hợp đối soát 2 chiều với `getFollowings` và `userCache`
 * - Tải danh sách bài đăng lại của chính mình (`getUserReposts`) kèm cơ chế làm giàu dữ liệu (enrichment)
 * - Tự động loại bỏ bài đăng lại mồ côi (khi bài gốc đã bị xóa trên server hoặc cache)
 * - Phân trang cuộn vô tận (Infinite Scroll) cho tab Reposts với cơ chế chunking mượt mà
 * - Quản lý tương tác Theo dõi / Theo dõi lại / Bỏ theo dõi với Optimistic UI (0ms) và Self-Healing
 * - Tích hợp đầy đủ các tương tác bài viết (Like, Repost, Quote, Comment, Delete, Share...) qua `usePostInteractions`
 * - Tự động bảo toàn và phục hồi ảnh đại diện (Avatar Persistence) qua `userCache` khi F5 trang
 * - Đồng bộ cuộn 2 chiều giữa khung card nội dung và thanh cuộn ngoài trình duyệt (`useWindowScrollSync`)
 */
export const useActivityPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user: currentUser } = useSelector((state) => state.auth);

    useDocumentTitle(t("activity.title", "Hoạt động"));

    // ==========================================
    // State & Refs: Tabs, danh sách dữ liệu & trạng thái tải
    // ==========================================
    // Quản lý tab đang kích hoạt: ưu tiên tab đã mở gần nhất trong Module Cache
    const [activeTab, setActiveTab] = useState(() => globalActivityCache.lastActiveTab || "followers");

    // Cờ đánh dấu đang trong quá trình chuyển tab (tạm khóa Infinite Scroll)
    const isTabSwitchingRef = useRef(false);
    const tabSwitchTimerRef = useRef(null);

    // State lưu danh sách người theo dõi currentUser (khởi tạo từ Module Cache)
    const [followers, setFollowers] = useState(() => globalActivityCache.followers);
    // State lưu toàn bộ danh sách bài đăng lại của currentUser nhận từ API (làm kho nguồn để phân trang slice)
    const [allSourceReposts, setAllSourceReposts] = useState(() => globalActivityCache.allSourceReposts);
    // State lưu danh sách bài đăng lại đang hiển thị trên giao diện (khởi tạo từ Module Cache)
    const [reposts, setReposts] = useState(() => globalActivityCache.reposts);

    // Lắng nghe sự kiện tương tác toàn cục để đồng bộ state tab Reposts
    useEffect(() => {
        const handleInteractionUpdated = (e) => {
            const detail = e.detail;
            if (!detail?.postId) return;
            setReposts((prev) => updateCachedPostList(prev, detail));
            setAllSourceReposts((prev) => updateCachedPostList(prev, detail));
        };
        window.addEventListener("post:interaction_updated", handleInteractionUpdated);
        return () => {
            window.removeEventListener("post:interaction_updated", handleInteractionUpdated);
        };
    }, []);

    // Cờ trạng thái loading khi tải dữ liệu tab lần đầu tiên: nếu tab đã nạp trong cache thì không hiện skeleton
    const isInitialTabLoaded =
        activeTab === "followers"
            ? globalActivityCache.isFollowersLoaded
            : globalActivityCache.isRepostsLoaded;
    const [isLoading, setIsLoading] = useState(() => !isInitialTabLoaded);
    // Cờ trạng thái loading khi cuộn xuống đáy tải thêm bài đăng lại (Infinite Scroll)
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    // State lưu thông báo lỗi khi gọi API tải dữ liệu thất bại
    const [error, setError] = useState(null);
    // Số nguyên dùng làm khóa kích hoạt tải lại toàn bộ trang khi người dùng bấm thử lại
    const [reloadKey, setReloadKey] = useState(0);

    // Hashmap lưu trạng thái currentUser có đang theo dõi user đó không: { [userId]: boolean }
    const [followingMap, setFollowingMap] = useState(() => globalActivityCache.followingMap);
    // Hashmap lưu trạng thái đang gọi API follow/unfollow cho từng user ID: { [userId]: boolean }
    const [actionLoadingMap, setActionLoadingMap] = useState({});

    // Ref tham chiếu đến DOM element của khung card hoạt động (phục vụ tính toán kích thước cuộn)
    const cardRef = useRef(null);
    // Ref tham chiếu đến phần tử nội dung cuộn bên trong card
    const contentRef = useRef(null);

    // Tải dữ liệu cho tab "followers" kết hợp đối soát 2 chiều với danh sách followings và cache
    const loadFollowersData = useCallback(async (isCancelledRef) => {
        // 1. Kiểm tra guard: Bắt buộc phải có thông tin currentUser đã đăng nhập
        if (!currentUser?.id) return;

        // 2. Kiểm tra xem tab này đã từng tải chưa; nếu lần đầu thì hiển thị skeleton loading
        const isFirstLoad = !globalActivityCache.isFollowersLoaded;
        if (isFirstLoad) {
            setIsLoading(true);
        }
        setError(null);

        try {
            // 3. Gọi song song 2 API: lấy danh sách followers và lấy danh sách currentUser đang follow
            const [resFollowers, resMyFollowings] = await Promise.allSettled([
                userService.getFollowers(currentUser.id, { per_page: 50 }),
                userService.getFollowings(currentUser.id, { per_page: 100 }),
            ]);

            // 4. Nếu component đã bị unmount hoặc hủy tác vụ thì dừng xử lý
            if (isCancelledRef.current) return;

            // 5. Nếu API lấy followers bị lỗi thì ném exception sang catch
            if (resFollowers.status === "rejected") {
                throw resFollowers.reason;
            }

            // 6. Làm giàu (enrich) dữ liệu followers: phục hồi avatar từ userCache nếu backend trả về null
            const rawList = resFollowers.value?.data || [];
            const userList = (Array.isArray(rawList) ? rawList : []).map((u) => {
                const cached = userCache.getByUsername(u.username) || userCache.getById(u.id);
                const enriched = {
                    ...u,
                    avatar_url: u.avatar_url || cached?.avatar_url || null,
                };
                userCache.saveUser(enriched);
                return enriched;
            });

            // 7. Cập nhật state followers và đánh dấu tab đã tải thành công
            setFollowers(userList);
            globalActivityCache.followers = userList;
            globalActivityCache.isFollowersLoaded = true;

            // 8. Xây dựng Set chứa các ID mà currentUser đang theo dõi từ kết quả getFollowings
            const myFollowingIdSet = new Set();
            if (resMyFollowings.status === "fulfilled") {
                const followingList = resMyFollowings.value?.data || [];
                userCache.syncFollowings(followingList, currentUser.id);
                (Array.isArray(followingList) ? followingList : []).forEach((u) => {
                    if (u?.id) myFollowingIdSet.add(String(u.id));
                });
            }

            // 9. Khởi tạo map trạng thái follow 2 chiều cho từng follower
            const initialMap = {};
            userList.forEach((u) => {
                initialMap[u.id] =
                    Boolean(currentUser?.id) &&
                    (myFollowingIdSet.has(String(u.id)) ||
                    userCache.isFollowing(u.id, u.username) ||
                    Boolean(u.is_following));
            });
            setFollowingMap((prev) => ({ ...prev, ...initialMap }));

            // 10. Bù đắp avatar ngầm qua searchUsers nếu backend followers thiếu avatar và cache chưa có
            const missingAvatarFollowers = userList.filter((u) => !u.avatar_url && u.username);
            if (missingAvatarFollowers.length > 0) {
                Promise.allSettled(
                    missingAvatarFollowers.slice(0, 5).map(async (u) => {
                        try {
                            const res = await userService.searchUsers(u.username);
                            const users = res?.data?.users || res?.data || [];
                            const matched = (Array.isArray(users) ? users : []).find(
                                (item) => item.username?.toLowerCase() === u.username.toLowerCase(),
                            );
                            if (matched?.avatar_url) {
                                userCache.saveUser(matched);
                                return { id: u.id, username: u.username, avatar_url: matched.avatar_url };
                            }
                            return null;
                        } catch {
                            return null;
                        }
                    }),
                ).then((results) => {
                    if (isCancelledRef.current) return;
                    const avatarMap = {};
                    results.forEach((r) => {
                        if (r.status === "fulfilled" && r.value?.avatar_url) {
                            avatarMap[r.value.id] = r.value.avatar_url;
                            avatarMap[r.value.username] = r.value.avatar_url;
                        }
                    });
                    if (Object.keys(avatarMap).length > 0) {
                        setFollowers((prev) =>
                            prev.map((u) => ({
                                ...u,
                                avatar_url: u.avatar_url || avatarMap[u.id] || avatarMap[u.username] || null,
                            })),
                        );
                    }
                });
            }
        } catch (err) {
            // 11. Bắt lỗi và lưu thông báo lỗi nếu request không bị hủy
            if (isCancelledRef.current) return;
            setError(err?.message || "load_error");
        } finally {
            // 12. Giải phóng cờ loading toàn trang
            if (!isCancelledRef.current) {
                setIsLoading(false);
            }
        }
    }, [currentUser]);

    // Tải dữ liệu cho tab "reposts" (danh sách bài đăng lại của currentUser)
    const loadRepostsData = useCallback(async (isCancelledRef) => {
        // 1. Kiểm tra guard currentUser
        if (!currentUser?.id) return;

        // 2. Hiển thị skeleton loading nếu là lần đầu tiên mở tab
        const isFirstLoad = !globalActivityCache.isRepostsLoaded;
        if (isFirstLoad) {
            setIsLoading(true);
        }
        setError(null);

        try {
            // 3. Gọi API lấy danh sách bài đăng lại của user
            const res = await userService.getUserReposts(currentUser.id, { per_page: 50 });
            if (isCancelledRef.current) return;

            // 4. Lọc bỏ các bài viết rác, bài viết mồ côi hoặc các bài đã bị xóa trong userCache kèm làm giàu từ cache
            const repostsList = (res?.data || [])
                .filter(
                    (p) =>
                        !userCache.isPostDeleted(p.id) &&
                        !userCache.isPostDeleted(p.original_post_id) &&
                        !userCache.isPostDeleted(p.original_post?.id) &&
                        Boolean(p.original_post?.id || p.content),
                )
                .map((p) => userCache.enrichPost(p));

            // 5. Lưu kho nguồn allSourceReposts và hiển thị trang đầu tiên
            const initialReposts = repostsList.slice(0, PAGE_SIZE);
            setAllSourceReposts(repostsList);
            setReposts(initialReposts);
            globalActivityCache.allSourceReposts = repostsList;
            globalActivityCache.reposts = initialReposts;
            globalActivityCache.isRepostsLoaded = true;
        } catch (err) {
            // 6. Xử lý lỗi nếu fetch dữ liệu thất bại
            if (isCancelledRef.current) return;
            setError(err?.message || "load_error");
        } finally {
            // 7. Giải phóng cờ loading
            if (!isCancelledRef.current) {
                setIsLoading(false);
            }
        }
    }, [currentUser]);

    // Hook quản lý tương tác bài viết cho tab reposts (Like, Repost, Quote, Comment, Delete, Share...)
    const interactions = usePostInteractions({
        posts: reposts,
        setPosts: setReposts,
        onDeleteSuccess: (deletedId) => {
            const idStr = String(deletedId);
            userCache.markPostDeleted(idStr);
            const filterFn = (p) => {
                const pid = String(p.id);
                const origId = String(p.original_post_id || p.original_post?.id || "");
                return pid !== idStr && origId !== idStr;
            };
            setAllSourceReposts((prev) => prev.filter(filterFn));
            setReposts((prev) => prev.filter(filterFn));
        },
        onRepostSuccess: ({ postId, isReposted, target, isError }) => {
            if (isError) return;
            if (!isReposted) {
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
                setAllSourceReposts((prev) => prev.filter(filterFn));
                setReposts((prev) => prev.filter(filterFn));
            }
        },
    });

    // Lắng nghe sự kiện toàn cục post:deleted để loại bỏ bài viết nếu bị xóa từ nơi khác
    useEffect(() => {
        const handleGlobalPostDeleted = (e) => {
            const deletedId = e?.detail;
            if (!deletedId) return;
            const idStr = String(deletedId);
            userCache.markPostDeleted(idStr);
            const filterFn = (p) => {
                const pid = String(p.id);
                const origId = String(p.original_post_id || p.original_post?.id || "");
                return pid !== idStr && origId !== idStr;
            };
            setAllSourceReposts((prev) => prev.filter(filterFn));
            setReposts((prev) => prev.filter(filterFn));
        };

        window.addEventListener("post:deleted", handleGlobalPostDeleted);
        return () => window.removeEventListener("post:deleted", handleGlobalPostDeleted);
    }, []);

    // Đồng bộ cuộn khung card với thanh cuộn ngoài trang
    const currentListLength = activeTab === "followers" ? followers.length : reposts.length;
    const spacerRef = useRef(null);
    const { spacerHeight, handleCardScroll, restoreScroll } = useWindowScrollSync({
        cardRef,
        contentRef,
        spacerRef,
        deps: [currentListLength, isLoading, isLoadingMore, activeTab],
    });

    // Cờ đánh dấu hệ thống đang khôi phục vị trí cuộn
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

    // Lắng nghe cuộn liên tục để lưu vị trí cuộn thực tế theo thời gian thực vào Module Cache
    useEffect(() => {
        const cardEl = cardRef?.current;
        if (!cardEl) return;

        const onScroll = () => {
            if (isUnmountedRef.current || isRestoringScrollRef.current) return;
            // Bỏ qua nếu khung card đang bị thu hẹp hoặc không có nội dung cuộn (unmounting / skeleton)
            if (cardEl.scrollHeight <= cardEl.clientHeight + 10) return;

            globalActivityCache.scrollTops[activeTab] = cardEl.scrollTop;
        };

        cardEl.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            cardEl.removeEventListener("scroll", onScroll);
        };
    }, [cardRef, activeTab]);

    // Khôi phục vị trí cuộn ban đầu từ Module Cache khi quay lại trang Activity
    const hasInitializedRef = useRef(false);
    useEffect(() => {
        if (!hasInitializedRef.current) {
            hasInitializedRef.current = true;
            const isCurrentTabLoaded =
                activeTab === "followers"
                    ? globalActivityCache.isFollowersLoaded
                    : globalActivityCache.isRepostsLoaded;

            if (isCurrentTabLoaded) {
                isRestoringScrollRef.current = true;
                const targetScroll = globalActivityCache.scrollTops[activeTab] ?? 0;
                restoreScroll(targetScroll);
                const timer = setTimeout(() => {
                    isRestoringScrollRef.current = false;
                }, 400);
                return () => clearTimeout(timer);
            }
        }
    }, [activeTab, restoreScroll]);

    // Lắng nghe sự kiện re-tap vào icon Activity khi đang ở trang Activity (cuộn mượt lên đỉnh)
    useEffect(() => {
        const handleActivityReTap = () => {
            if (cardRef?.current) {
                cardRef.current.scrollTo({ top: 0, behavior: "smooth" });
            }
            if (typeof window !== "undefined") {
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        };

        window.addEventListener("activity:re-tap", handleActivityReTap);
        return () => window.removeEventListener("activity:re-tap", handleActivityReTap);
    }, [cardRef]);

    // Quản lý phân trang & Cuộn vô tận cho tab Reposts
    const hasMore = reposts.length < allSourceReposts.length;

    // Xử lý tải thêm bài đăng lại khi người dùng cuộn xuống đáy
    const handleLoadMore = useCallback(() => {
        if (isTabSwitchingRef.current) return;
        // 1. Kiểm tra guard: không tải trùng lặp khi đang bận
        if (isLoading || isLoadingMore) return;
        // 2. Không tải nếu đã hiển thị hết danh sách nguồn
        if (reposts.length >= allSourceReposts.length) return;

        // 3. Bật cờ loading cuộn thêm
        setIsLoadingMore(true);
        // 4. Cắt lát thêm PAGE_SIZE bài viết từ kho nguồn allSourceReposts sau 300ms tạo hiệu ứng mượt mà
        setTimeout(() => {
            setReposts((prev) => {
                const currentCount = prev.length;
                const nextReposts = allSourceReposts.slice(0, currentCount + PAGE_SIZE);
                globalActivityCache.reposts = nextReposts;
                return nextReposts;
            });
            // 5. Tắt cờ loading cuộn thêm
            setIsLoadingMore(false);
        }, 300);
    }, [isLoading, isLoadingMore, reposts.length, allSourceReposts]);

    const { lastElementRef } = useInfiniteScroll({
        onLoadMore: handleLoadMore,
        hasMore: activeTab === "reposts" && hasMore,
        isLoading: isLoading || isLoadingMore,
        isLockedRef: isTabSwitchingRef,
        rootMargin: "250px",
    });

    // Kích hoạt nạp dữ liệu khi chuyển tab hoặc reload
    useEffect(() => {
        const isCancelledRef = { current: false };

        if (activeTab === "followers") {
            if (globalActivityCache.isFollowersLoaded && globalActivityCache.followers.length > 0 && reloadKey === 0) {
                return;
            }
            // eslint-disable-next-line react-hooks/set-state-in-effect
            loadFollowersData(isCancelledRef);
        } else {
            if (globalActivityCache.isRepostsLoaded && globalActivityCache.reposts.length > 0 && reloadKey === 0) {
                return;
            }
            loadRepostsData(isCancelledRef);
        }

        return () => {
            isCancelledRef.current = true;
        };
    }, [activeTab, reloadKey, loadFollowersData, loadRepostsData]);

    // Xử lý chuyển đổi giữa các tab: lưu vị trí cuộn tab cũ, khôi phục tab mới
    const handleTabChange = useCallback(
        (newTab) => {
            if (newTab === activeTab) return;

            isTabSwitchingRef.current = true;
            isRestoringScrollRef.current = true;
            if (tabSwitchTimerRef.current) clearTimeout(tabSwitchTimerRef.current);
            tabSwitchTimerRef.current = setTimeout(() => {
                isTabSwitchingRef.current = false;
                isRestoringScrollRef.current = false;
            }, 400);

            globalActivityCache.lastActiveTab = newTab;
            setActiveTab(newTab);

            const isNewTabLoaded =
                newTab === "followers"
                    ? globalActivityCache.isFollowersLoaded
                    : globalActivityCache.isRepostsLoaded;

            if (isNewTabLoaded) {
                setIsLoading(false);
                const targetScroll = globalActivityCache.scrollTops[newTab] ?? 0;
                restoreScroll(targetScroll);
            } else {
                setIsLoading(true);
                restoreScroll(0);
            }
        },
        [activeTab, restoreScroll],
    );

    // Lắng nghe sự kiện follow toàn cục (từ các modal hoặc card khác) để đồng bộ tức thì
    useEffect(() => {
        const handleFollowChanged = (e) => {
            const { userId, isFollowing: nextFollowing } = e.detail || {};
            if (userId) {
                setFollowingMap((prev) => ({ ...prev, [userId]: nextFollowing }));
            }
        };
        window.addEventListener("user:follow_changed", handleFollowChanged);
        return () => window.removeEventListener("user:follow_changed", handleFollowChanged);
    }, []);

    // Xử lý tương tác Theo dõi / Bỏ theo dõi với Optimistic UI (0ms) và Self-Healing
    const handleToggleFollow = useCallback(
        async (targetUser) => {
            // 1. Kiểm tra guard targetUser
            if (!targetUser?.id) return;
            const targetId = targetUser.id;

            // 2. Xác định trạng thái follow hiện tại và trạng thái đảo ngược kế tiếp
            const isCurrentlyFollowing = Boolean(
                followingMap[targetId] ?? userCache.isFollowing(targetId, targetUser.username),
            );
            const nextState = !isCurrentlyFollowing;

            // 3. Optimistic Update (0ms latency): Cập nhật ngay lập tức lên UI và userCache
            setFollowingMap((prev) => ({ ...prev, [targetId]: nextState }));
            userCache.setFollowing(targetUser, nextState);
            // 4. Bật cờ loading hành động cho riêng user này
            setActionLoadingMap((prev) => ({ ...prev, [targetId]: true }));

            try {
                // 5. Gọi API tương ứng: unfollowUser hoặc followUser
                if (isCurrentlyFollowing) {
                    await userService.unfollowUser(targetId);
                    toast.info(
                        t("profile.unfollow_success", {
                            username: targetUser.username || "user",
                            defaultValue: `Đã bỏ theo dõi @${targetUser.username || "user"}`,
                        }),
                    );
                } else {
                    await userService.followUser(targetId);
                    toast.success(
                        t("profile.follow_success", {
                            username: targetUser.username || "user",
                            defaultValue: `Đã theo dõi @${targetUser.username || "user"}`,
                        }),
                    );
                }
            } catch (err) {
                // 6. Xử lý lỗi & Tự chữa lành (Self-Healing)
                const message = err?.response?.data?.message || err?.message || "";
                const isAlreadyFollowing = /already following/i.test(message);

                if (isAlreadyFollowing) {
                    // Nếu backend báo đã follow trước đó, ép trạng thái thành true
                    userCache.setFollowing(targetUser, true);
                    setFollowingMap((prev) => ({ ...prev, [targetId]: true }));
                    toast.info(
                        t("profile.already_following", {
                            defaultValue: "Bạn đã theo dõi người dùng này rồi",
                        }),
                    );
                } else {
                    // Rollback lại trạng thái ban đầu nếu xảy ra lỗi mạng / lỗi server
                    userCache.setFollowing(targetUser, isCurrentlyFollowing);
                    setFollowingMap((prev) => ({ ...prev, [targetId]: isCurrentlyFollowing }));
                    toast.error(
                        t(
                            "profile.follow_failed",
                            "Không thể cập nhật trạng thái theo dõi. Vui lòng thử lại.",
                        ),
                    );
                }
            } finally {
                // 7. Giải phóng cờ loading hành động cho user
                setActionLoadingMap((prev) => ({ ...prev, [targetId]: false }));
            }
        },
        [followingMap, t],
    );

    // Chuyển hướng khi bấm vào user: bảo toàn trạng thái follow mới nhất
    const handleUserClick = useCallback(
        (user) => {
            if (user?.username) {
                const isFollow = Boolean(
                    followingMap[user.id] ?? userCache.isFollowing(user.id, user.username),
                );
                const enriched = {
                    ...user,
                    is_following: isFollow,
                    is_followed_by_auth: isFollow,
                };
                userCache.saveUser(enriched);
                navigate(`/${user.username}`, { state: { user: enriched } });
            }
        },
        [followingMap, navigate],
    );

    // Tải lại dữ liệu
    const reload = useCallback(() => {
        globalActivityCache.isFollowersLoaded = false;
        globalActivityCache.isRepostsLoaded = false;
        setReloadKey((prev) => prev + 1);
    }, []);

    return {
        activeTab,
        handleTabChange,
        followers,
        reposts,
        isLoading,
        isLoadingMore,
        hasMore,
        lastElementRef,
        handleLoadMore,
        error,
        reload,
        followingMap,
        actionLoadingMap,
        handleToggleFollow,
        handleUserClick,
        cardRef,
        contentRef,
        spacerRef,
        spacerHeight,
        handleCardScroll,
        currentUser,
        interactions,
    };
};

export default useActivityPage;
