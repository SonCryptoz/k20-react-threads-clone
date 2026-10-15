import { useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Home, Search, Plus, Heart, User } from "lucide-react";
import { toast } from "@/components/ui/toast";

/**
 * useSidebar
 * Custom hook quản lý toàn bộ logic nghiệp vụ cho thanh điều hướng Sidebar (Desktop & Mobile):
 * - Quản lý trạng thái đóng/mở của Modal Tạo bài viết mới (`CreatePostModal`)
 * - Kiểm tra phiên đăng nhập (Auth Guard): Chưa đăng nhập sẽ chuyển hướng tới `/login`
 * - Xử lý tạo bài viết thành công: Bắn sự kiện toàn cục `post:created`, hiển thị toast và chuyển hướng về trang chủ
 * - Cấu hình danh sách 5 mục điều hướng chính (`navItems`) kèm biểu tượng và nhãn đa ngôn ngữ
 * - Xác định chính xác trạng thái kích hoạt (Active State) của từng mục menu theo URL hiện tại
 */
export const useSidebar = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { isAuthenticated } = useSelector((state) => state.auth);

    // ==========================================
    // State: Trạng thái Modal Tạo bài viết
    // ==========================================
    // Cờ boolean quản lý trạng thái mở (true) hoặc đóng (false) của Modal Tạo bài viết
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Xử lý khi người dùng nhấn vào nút "+" (Tạo bài viết)
    const handleCreateClick = useCallback((e) => {
        // 1. Ngăn chặn hành vi mặc định của sự kiện click
        e?.preventDefault?.();

        // 2. Auth Guard: Bắt buộc người dùng phải đăng nhập mới được mở modal tạo bài viết
        if (!isAuthenticated) {
            navigate("/login", { state: { from: location } });
            return;
        }

        // 3. Mở Modal Tạo bài viết
        setIsCreateModalOpen(true);
    }, [isAuthenticated, navigate, location]);

    // Xử lý khi đăng bài viết mới thành công từ CreatePostModal
    const handleCreatePostSuccess = useCallback((newPost) => {
        // 1. Đóng modal tạo bài viết
        setIsCreateModalOpen(false);

        // 2. Hiển thị thông báo toast thành công cho người dùng
        toast.success(
            t("post.create_success", {
                defaultValue: "Đã đăng bài viết mới",
            }),
        );

        // 3. Phát CustomEvent "post:created" toàn cục để Feed trang chủ (HomePage) tự động chèn bài viết mới lên đầu
        window.dispatchEvent(new CustomEvent("post:created", { detail: newPost }));

        // 4. Nếu người dùng đang đứng ở trang khác ngoài trang chủ (như /search, /activity, /profile), điều hướng về Home
        if (location.pathname !== "/") {
            navigate("/", { state: { newPost } });
        }
    }, [t, location.pathname, navigate]);

    // Đóng modal tạo bài viết thủ công
    const handleCloseCreateModal = useCallback(() => {
        setIsCreateModalOpen(false);
    }, []);

    // Danh sách 5 mục điều hướng chính trên Sidebar & Bottom bar
    const navItems = [
        {
            key: "home",
            to: "/",
            label: t("nav.for_you") || "Home",
            icon: Home,
            exact: true,
        },
        {
            key: "search",
            to: "/search",
            label: t("nav.search") || "Search",
            icon: Search,
        },
        {
            key: "create",
            label: t("nav.create") || "Create",
            icon: Plus,
            onClick: handleCreateClick,
        },
        {
            key: "activity",
            to: "/activity",
            label: t("nav.activity") || "Activity",
            icon: Heart,
        },
        {
            key: "profile",
            to: "/profile",
            label: t("nav.profile") || "Profile",
            icon: User,
        },
    ];

    // Hàm kiểm tra mục điều hướng có đang active hay không
    const isItemActive = useCallback((item) => {
        const isAction = !item.to;
        if (isAction) {
            return isCreateModalOpen && item.key === "create";
        }
        return item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
    }, [isCreateModalOpen, location.pathname]);

    return {
        isCreateModalOpen,
        setIsCreateModalOpen,
        handleCloseCreateModal,
        handleCreateClick,
        handleCreatePostSuccess,
        navItems,
        isItemActive,
    };
};

export default useSidebar;
