import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import userService from "@/services/userService";
import { getApiError } from "@/utils/getApiError";
import userCache from "@/utils/userCache";
import { toast } from "@/components/ui/toast";

/**
 * useFollowModal
 * Hook quản lý toàn bộ dữ liệu & tương tác cho FollowModal:
 * - Hỗ trợ cả 2 trường hợp: Modal của chính mình (`isOwnerModal`) và Modal của người khác (`!isOwnerModal`)
 * - Chuyển đổi tab Followers / Following
 * - Đối chiếu trạng thái theo dõi của currentUser với danh sách người dùng trong modal
 * - Quản lý Optimistic UI cho hành động Follow / Unfollow
 */
export const useFollowModal = ({
    userId,
    initialTab = "followers",
    onFollowChange,
}) => {
    const { t } = useTranslation();
    const { user: currentUser } = useSelector((state) => state.auth);

    // Xác định xem đây có phải là Modal xem danh sách follow của chính tài khoản đang đăng nhập hay không
    const isOwnerModal = Boolean(currentUser?.id && userId === currentUser.id);

    // State lưu tab hiện tại ("followers" | "following")
    const [activeTab, setActiveTab] = useState(initialTab);
    // State lưu danh sách người dùng hiển thị trong tab hiện tại
    const [users, setUsers] = useState([]);
    // State cờ đang tải danh sách người dùng
    const [isLoading, setIsLoading] = useState(true);
    // State lưu thông báo lỗi khi tải dữ liệu thất bại
    const [error, setError] = useState(null);

    // Map lưu trạng thái theo dõi { [targetUserId]: boolean } của currentUser đối với từng user trong danh sách
    const [followingMap, setFollowingMap] = useState({});
    // Map lưu trạng thái đang gọi API follow/unfollow { [targetUserId]: boolean } để hiển thị loading spinner trên nút
    const [actionLoadingMap, setActionLoadingMap] = useState({});

    // Tải danh sách user theo tab
    useEffect(() => {
        let isCancelled = false;

        const loadData = async () => {
            setError(null);
            try {
                // 1. Chuẩn bị request lấy danh sách followers hoặc followings của userId mục tiêu
                const apiCall =
                    activeTab === "followers"
                        ? userService.getFollowers(userId)
                        : userService.getFollowings(userId);

                // 2. Nếu là xem modal của người khác hoặc tab followers của chính mình:
                // Cần nạp thêm danh sách followings của currentUser để đối chiếu chính xác trạng thái nút bấm
                const shouldFetchMyFollowings =
                    currentUser?.id && !(isOwnerModal && activeTab === "following");

                const promises = [apiCall];
                if (shouldFetchMyFollowings) {
                    promises.push(userService.getFollowings(currentUser.id, { per_page: 100 }));
                }

                const [resUsers, resMyFollowings] = await Promise.allSettled(promises);
                if (isCancelled) return;

                if (resUsers.status === "rejected") {
                    throw resUsers.reason;
                }

                // 3. Làm giàu dữ liệu người dùng (Enrich avatar từ cache nếu API trả về null)
                const rawUserList = resUsers.value?.data || [];
                const userList = rawUserList.map((u) => {
                    const cached = userCache.getByUsername(u.username) || userCache.getById(u.id);
                    const enriched = {
                        ...u,
                        avatar_url: u.avatar_url || cached?.avatar_url || null,
                    };
                    userCache.saveUser(enriched);
                    return enriched;
                });
                setUsers(userList);

                // 4. Xây dựng tập hợp ID mà currentUser đang theo dõi
                const myFollowingIdSet = new Set();
                if (resMyFollowings && resMyFollowings.status === "fulfilled") {
                    const followingsData = resMyFollowings.value?.data || [];
                    userCache.syncFollowings(followingsData, currentUser?.id);
                    followingsData.forEach((u) => {
                        if (u?.id) myFollowingIdSet.add(String(u.id));
                    });
                } else if (isOwnerModal && activeTab === "following") {
                    userCache.syncFollowings(userList, currentUser?.id);
                }

                // 5. Đối chiếu và tính toán trạng thái follow ban đầu cho từng user trong danh sách
                const initialMap = {};
                userList.forEach((u) => {
                    if (isOwnerModal && activeTab === "following") {
                        // Modal "Đang theo dõi" của chính mình: chắc chắn đang theo dõi tất cả
                        initialMap[u.id] = true;
                    } else {
                        // Modal "Người theo dõi" hoặc Modal của người khác:
                        // Phải đối chiếu xem currentUser có đang theo dõi người này hay không
                        initialMap[u.id] =
                            Boolean(currentUser?.id) &&
                            (myFollowingIdSet.has(String(u.id)) ||
                            userCache.isFollowing(u.id, u.username) ||
                            Boolean(u.is_following));
                    }
                });
                setFollowingMap((prev) => ({ ...prev, ...initialMap }));
            } catch (err) {
                if (isCancelled) return;
                const { message } = getApiError(err, "Không thể tải danh sách người dùng");
                setError(message);
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        loadData();

        return () => {
            isCancelled = true;
        };
    }, [userId, activeTab, isOwnerModal, currentUser?.id]);

    // Lắng nghe sự kiện toàn cục khi trạng thái follow thay đổi từ bất kỳ đâu trong app
    useEffect(() => {
        const handleFollowChanged = (e) => {
            const { userId: changedId, username: changedName, isFollowing: nextFollow } =
                e.detail || {};
            if (!changedId && !changedName) return;

            setFollowingMap((prev) => {
                const next = { ...prev };
                users.forEach((u) => {
                    const matchesId = changedId && String(u.id) === String(changedId);
                    const matchesName =
                        changedName &&
                        u.username &&
                        String(u.username).replace(/^@/, "").toLowerCase() ===
                            String(changedName).toLowerCase();
                    if (matchesId || matchesName) {
                        next[u.id] = nextFollow;
                    }
                });
                return next;
            });
        };

        window.addEventListener("user:follow_changed", handleFollowChanged);
        return () => window.removeEventListener("user:follow_changed", handleFollowChanged);
    }, [users]);

    // Chuyển đổi giữa 2 tab "followers" và "following"
    const handleTabChange = (newTab) => {
        if (newTab === activeTab) return;
        setError(null);
        setActiveTab(newTab);
        setIsLoading(true);
    };

    // Xử lý bấm Theo dõi / Bỏ theo dõi với Optimistic UI (0ms latency)
    const handleToggleFollow = async (targetUser) => {
        // 1. Xác định targetId và trạng thái follow hiện tại
        const targetId = targetUser.id;
        const isCurrentlyFollowing = Boolean(
            followingMap[targetId] ?? userCache.isFollowing(targetId, targetUser.username),
        );
        const nextState = !isCurrentlyFollowing;

        // 2. Optimistic Update (0ms): Cập nhật UI và userCache ngay lập tức
        setFollowingMap((prev) => ({
            ...prev,
            [targetId]: nextState,
        }));
        userCache.setFollowing(targetUser, nextState);
        setActionLoadingMap((prev) => ({ ...prev, [targetId]: true }));
        setError(null);

        try {
            // 3. Gọi API tương ứng: unfollowUser (DELETE) hoặc followUser (POST)
            if (isCurrentlyFollowing) {
                await userService.unfollowUser(targetId);
            } else {
                await userService.followUser(targetId);
            }
            // 4. Báo cáo thay đổi số lượng follow ngược lên component cha
            onFollowChange?.({ userId: targetId, isFollowing: nextState });

            // 5. Hiển thị thông báo Toast thành công
            const rawUsername = targetUser.username || targetUser.name || "";
            const cleanName = rawUsername ? `@${String(rawUsername).replace(/^@/, "")}` : "";

            if (!isCurrentlyFollowing) {
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
            const { message } = getApiError(err, "Thao tác không thành công, vui lòng thử lại");
            const isAlreadyFollowing = message && /already following/i.test(message);

            // 6. Tự chữa lành (Self-Healing): Nếu backend báo đã theo dõi rồi -> giữ nguyên trạng thái true
            if (isAlreadyFollowing) {
                userCache.setFollowing(targetUser, true);
                setFollowingMap((prev) => ({
                    ...prev,
                    [targetId]: true,
                }));
                setError(null);
                onFollowChange?.({ userId: targetId, isFollowing: true });
                toast.info(
                    t("profile.already_following", {
                        defaultValue: "Bạn đã theo dõi người dùng này rồi",
                    }),
                );
            } else {
                // 7. Rollback: Phục hồi lại trạng thái trước khi bấm nếu gặp lỗi mạng hoặc lỗi API khác
                userCache.setFollowing(targetUser, isCurrentlyFollowing);
                setFollowingMap((prev) => ({
                    ...prev,
                    [targetId]: isCurrentlyFollowing,
                }));
                setError(message);
                toast.error(message);
            }
        } finally {
            // 8. Giải phóng trạng thái loading cho nút của user này
            setActionLoadingMap((prev) => ({ ...prev, [targetId]: false }));
        }
    };

    return {
        currentUser,
        activeTab,
        users,
        isLoading,
        error,
        followingMap,
        actionLoadingMap,
        handleTabChange,
        handleToggleFollow,
    };
};

export default useFollowModal;
