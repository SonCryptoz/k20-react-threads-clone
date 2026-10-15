import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router";

/**
 * PrivateRoute
 * Route Guard bảo vệ các trang yêu cầu xác thực tài khoản (Profile, Activity...):
 * - Nếu người dùng chưa đăng nhập -> chuyển hướng về /login kèm vị trí trang hiện tại
 * - Nếu người dùng đã đăng nhập -> render các Route con bên trong qua <Outlet />
 */
const PrivateRoute = () => {
    const { isAuthenticated, isInitialized } = useSelector((state) => state.auth);
    const location = useLocation();

    // Nếu ứng dụng đang khởi tạo / kiểm tra phiên đăng nhập (Splash Screen) -> chờ
    if (!isInitialized) {
        return null;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <Outlet />;
};

export default PrivateRoute;
