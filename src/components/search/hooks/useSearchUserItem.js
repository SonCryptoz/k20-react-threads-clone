import { useCallback, useMemo } from "react";
import { formatFollowerCount, cleanUsername } from "../helpers/searchHelpers";

/**
 * useSearchUserItem
 * Custom hook quản lý dữ liệu hiển thị và tương tác cho một dòng tài khoản người dùng trong Search:
 * - Chuẩn hóa tên hiển thị (`displayName`) và username sạch không có '@' (`username`)
 * - Định dạng số lượng người theo dõi (VD: 12.5k) (`formatFollowerCount`)
 * - Xử lý click Theo dõi / Bỏ theo dõi kèm chặn nổi bọt sự kiện (`stopPropagation`)
 * - Xử lý click dòng để chuyển hướng đến trang cá nhân tương ứng
 */
export const useSearchUserItem = ({ user, onToggleFollow, onUserClick } = {}) => {
    // Tên hiển thị người dùng (ưu tiên name, sau đó tới username)
    const displayName = useMemo(() => {
        if (!user) return "user";
        return user.name || user.username || "user";
    }, [user]);

    // Username sạch không chứa ký tự '@' ở đầu
    const username = useMemo(() => {
        if (!user) return "user";
        return cleanUsername(user.username || user.name);
    }, [user]);

    // Số lượng người theo dõi đã được định dạng (vd: 15k)
    const formattedFollowers = useMemo(() => {
        if (!user) return null;
        const raw =
            user.followers_count ??
            user.follower_count ??
            (Array.isArray(user.followers) ? user.followers.length : null);
        return formatFollowerCount(raw);
    }, [user]);

    // Xử lý nút Theo dõi / Bỏ theo dõi (chặn nổi bọt click để không mở trang cá nhân ngoài ý muốn)
    const handleFollowClick = useCallback(
        (e) => {
            e.stopPropagation();
            onToggleFollow?.(user);
        },
        [onToggleFollow, user],
    );

    // Chuyển hướng đến trang cá nhân khi click vào toàn bộ dòng người dùng
    const handleRowClick = useCallback(() => {
        onUserClick?.(user);
    }, [onUserClick, user]);

    return {
        displayName,
        username,
        formattedFollowers,
        handleFollowClick,
        handleRowClick,
    };
};

export default useSearchUserItem;
