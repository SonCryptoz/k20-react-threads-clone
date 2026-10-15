import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import userService from "@/services/userService";
import { getApiError } from "@/utils/getApiError";
import userCache from "@/utils/userCache";
import { toast } from "@/components/ui/toast";

/**
 * useProfileSuggestions
 * Custom hook quản lý dữ liệu cho tab Gợi ý / Theo dõi các trang cá nhân trên trang Profile:
 * - Nạp danh sách gợi ý người dùng từ API (userService.getSuggestions)
 * - Quản lý Optimistic UI cho hành vi Follow / Unfollow
 * - Báo cáo thay đổi số lượng follow ngược lên ProfileHeader (onFollowChange)
 * - Phân tách trạng thái theo dõi theo phiên đăng nhập (Auth Scoped)
 * - Tự động đồng bộ và làm mới followMap khi đổi tài khoản (user:session_changed)
 */
export const useProfileSuggestions = ({ onFollowChange } = {}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated } = useSelector((state) => state.auth);

    // State lưu danh sách gợi ý người dùng từ API getSuggestions
    const [suggestions, setSuggestions] = useState([]);
    // State cờ đang tải danh sách gợi ý ban đầu
    const [isLoading, setIsLoading] = useState(true);
    // State lưu thông báo lỗi khi tải danh sách gợi ý thất bại
    const [error, setError] = useState(null);
    // Map lưu trạng thái theo dõi { [targetUserId]: boolean } của tài khoản hiện tại đối với từng gợi ý
    const [followingMap, setFollowingMap] = useState({});
    // Map lưu trạng thái đang gọi API follow/unfollow { [targetUserId]: boolean }
    const [actionLoadingMap, setActionLoadingMap] = useState({});
    // Khóa trigger để tải lại danh sách gợi ý khi người dùng bấm reload
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let isCancelled = false;

        const loadData = async () => {
            try {
                const res = await userService.getSuggestions({ per_page: 20 });
                if (isCancelled) return;
                const list = res?.data || [];
                list.forEach((u) => {
                    userCache.saveUser(u);
                });
                setSuggestions(list);
                const initialMap = {};
                list.forEach((u) => {
                    initialMap[u.id] =
                        isAuthenticated &&
                        (userCache.isFollowing(u.id, u.username) || Boolean(u.is_following));
                });
                setFollowingMap(initialMap);
            } catch (err) {
                if (isCancelled) return;
                const { message } = getApiError(err, "Không thể tải danh sách gợi ý");
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
    }, [reloadKey, isAuthenticated]);

    // Lắng nghe sự kiện follow toàn cục và sự kiện thay đổi phiên
    useEffect(() => {
        const handleFollowChanged = (e) => {
            const { userId, username, isFollowing: nextFollow } = e.detail || {};
            if (!userId && !username) return;

            setFollowingMap((prev) => {
                const next = { ...prev };
                suggestions.forEach((u) => {
                    const matchesId = userId && String(u.id) === String(userId);
                    const matchesName =
                        username &&
                        u.username &&
                        String(u.username).replace(/^@/, "").toLowerCase() ===
                            String(username).toLowerCase();
                    if (matchesId || matchesName) {
                        next[u.id] = nextFollow;
                    }
                });
                return next;
            });
        };

        const handleSessionChanged = () => {
            if (!isAuthenticated) {
                setFollowingMap({});
                return;
            }
            setFollowingMap(() => {
                const next = {};
                suggestions.forEach((u) => {
                    next[u.id] = userCache.isFollowing(u.id, u.username);
                });
                return next;
            });
        };

        window.addEventListener("user:follow_changed", handleFollowChanged);
        window.addEventListener("user:session_changed", handleSessionChanged);
        return () => {
            window.removeEventListener("user:follow_changed", handleFollowChanged);
            window.removeEventListener("user:session_changed", handleSessionChanged);
        };
    }, [suggestions, isAuthenticated]);

    // Tải lại danh sách gợi ý khi gặp lỗi hoặc người dùng yêu cầu làm mới
    const reload = () => {
        setIsLoading(true);
        setError(null);
        setReloadKey((prev) => prev + 1);
    };

    // Xử lý bấm Theo dõi / Bỏ theo dõi với Optimistic UI (0ms latency)
    const handleToggleFollow = async (targetUser) => {
        if (!targetUser?.id) return;

        // 1. Auth Guard: Kiểm tra đăng nhập -> nếu chưa đăng nhập thì chuyển hướng sang /login
        if (!isAuthenticated) {
            navigate("/login", { state: { from: location } });
            return;
        }

        // 2. Xác định trạng thái follow hiện tại và trạng thái dự kiến tiếp theo (nextState)
        const targetId = targetUser.id;
        const isCurrentlyFollowing = Boolean(
            followingMap[targetId] ?? userCache.isFollowing(targetId, targetUser.username),
        );
        const nextState = !isCurrentlyFollowing;

        // 3. Optimistic Update (0ms): Đổi trạng thái UI và đồng bộ vào userCache ngay lập tức
        setFollowingMap((prev) => ({
            ...prev,
            [targetId]: nextState,
        }));
        userCache.setFollowing(targetUser, nextState);
        setActionLoadingMap((prev) => ({ ...prev, [targetId]: true }));

        try {
            // 4. Gọi API tương ứng (unfollowUser hoặc followUser)
            if (isCurrentlyFollowing) {
                await userService.unfollowUser(targetId);
            } else {
                await userService.followUser(targetId);
            }
            // 5. Báo cáo thay đổi số lượng follow lên ProfileHeader
            onFollowChange?.({ userId: targetId, isFollowing: nextState });

            // 6. Hiển thị thông báo Toast thành công
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

            // 7. Tự chữa lành (Self-Healing): Nếu server báo đã follow từ trước -> cập nhật true thay vì rollback
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
                // 8. Rollback: Phục hồi lại trạng thái trước khi bấm nếu API gặp lỗi
                userCache.setFollowing(targetUser, isCurrentlyFollowing);
                setFollowingMap((prev) => ({
                    ...prev,
                    [targetId]: isCurrentlyFollowing,
                }));
                setError(message);
                toast.error(message);
            }
        } finally {
            // 9. Giải phóng trạng thái loading cho nút của target user
            setActionLoadingMap((prev) => ({ ...prev, [targetId]: false }));
        }
    };

    return {
        suggestions,
        isLoading,
        error,
        followingMap,
        actionLoadingMap,
        handleToggleFollow,
        reload,
    };
};

export default useProfileSuggestions;
