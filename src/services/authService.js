/**
 * authService
 * Tầng dịch vụ API xác thực người dùng (Authentication Service):
 * - register: Đăng ký tài khoản người dùng mới
 * - login: Đăng nhập bằng email/username và mật khẩu
 * - verifyEmail: Kích hoạt tài khoản thông qua token xác thực email
 * - getCurrentUser: Lấy thông tin tài khoản đang đăng nhập
 * - forgotPassword: Gửi email yêu cầu đặt lại mật khẩu
 * - validateResetPassword: Xác thực tính hợp lệ của token đặt lại mật khẩu
 * - resetPassword: Cập nhật mật khẩu mới
 * - logout: Đăng xuất và dọn dẹp tokens ở client
 */
import http from "@/utils/http";
import { clearTokens } from "@/utils/tokenStorage";

export const authService = {
    // Đăng ký tài khoản mới
    register: (data) => {
        return http.post("/api/auth/register", data);
    },

    // Đăng nhập
    login: (credentials) => {
        return http.post("/api/auth/login", credentials);
    },

    // Xác minh email từ token
    verifyEmail: (token) => {
        return http.post("/api/auth/verify-email", { token });
    },

    // Lấy thông tin user hiện tại
    getCurrentUser: () => {
        return http.get("/api/auth/user");
    },

    // Gửi yêu cầu quên mật khẩu
    forgotPassword: (email) => {
        return http.post("/api/auth/forgot-password", { email });
    },

    // Kiểm tra tính hợp lệ của token đặt lại mật khẩu
    validateResetPassword: (token) => {
        return http.get(`/api/auth/reset-password/validate?token=${token}`);
    },

    // Đặt lại mật khẩu mới
    resetPassword: (data) => {
        return http.post("/api/auth/reset-password", data);
    },

    // Đăng xuất
    logout: async () => {
        try {
            await http.post("/api/auth/logout");
        } catch {
            // Ngay cả khi API logout lỗi thì client vẫn dọn dẹp token
        } finally {
            clearTokens();
        }
    },
};

export default authService;
