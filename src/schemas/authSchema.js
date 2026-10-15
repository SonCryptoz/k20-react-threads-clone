/**
 * authSchema
 * Tập hợp các schema validation xác thực dữ liệu người dùng (Zod) đa ngôn ngữ:
 * - createRegisterSchema: Kiểm tra form đăng ký (tên hiển thị, email, mật khẩu, xác nhận mật khẩu)
 * - createLoginSchema: Kiểm tra form đăng nhập (tài khoản email/username, mật khẩu)
 * - createForgotPasswordSchema: Kiểm tra form yêu cầu đặt lại mật khẩu (email)
 * - createResetPasswordSchema: Kiểm tra form đặt lại mật khẩu mới (mật khẩu mới, xác nhận mật khẩu)
 */
import { z } from "zod";

/**
 * Hàm tạo Register Schema hỗ trợ i18n
 */
export const createRegisterSchema = (t) => {
    const getMsg = (key, fallback) => (t ? t(key) : fallback);

    return z
        .object({
            // Tên hiển thị (username): không được để trống sau khi trim
            username: z
                .string()
                .trim()
                .min(1, {
                    message: getMsg("auth.display_name_required", "Tên hiển thị là bắt buộc."),
                }),
            // Địa chỉ Email: bắt buộc và phải đúng định dạng email chuẩn RFC
            email: z
                .string()
                .trim()
                .min(1, { message: getMsg("auth.email_required", "Email là bắt buộc.") })
                .pipe(
                    z.email({
                        message: getMsg("auth.email_invalid", "Địa chỉ email không hợp lệ."),
                    }),
                ),
            // Mật khẩu: tối thiểu 8 ký tự
            password: z.string().min(8, {
                message: getMsg("auth.password_min_length", "Mật khẩu phải có ít nhất 8 ký tự."),
            }),
            // Mật khẩu xác nhận: bắt buộc nhập
            password_confirmation: z.string().min(1, {
                message: getMsg("auth.password_mismatch", "Mật khẩu xác nhận không khớp."),
            }),
        })
        // Kiểm tra khớp 100% giữa mật khẩu và mật khẩu xác nhận
        .refine((data) => data.password === data.password_confirmation, {
            message: getMsg("auth.password_mismatch", "Mật khẩu xác nhận không khớp."),
            path: ["password_confirmation"],
        });
};

/**
 * Hàm tạo Login Schema hỗ trợ i18n
 */
export const createLoginSchema = (t) => {
    const getMsg = (key, fallback) => (t ? t(key) : fallback);

    return z.object({
        // Tài khoản đăng nhập (Email hoặc Username): không được để trống
        login: z
            .string()
            .trim()
            .min(1, {
                message: getMsg("auth.account_required", "Email hoặc tên người dùng là bắt buộc."),
            }),
        // Mật khẩu: bắt buộc nhập
        password: z
            .string()
            .min(1, { message: getMsg("auth.password_required", "Mật khẩu là bắt buộc.") }),
    });
};

/**
 * Hàm tạo Forgot Password Schema hỗ trợ i18n
 */
export const createForgotPasswordSchema = (t) => {
    const getMsg = (key, fallback) => (t ? t(key) : fallback);

    return z.object({
        // Email nhận liên kết đặt lại mật khẩu: bắt buộc và đúng định dạng
        email: z
            .string()
            .trim()
            .min(1, { message: getMsg("auth.email_required", "Email là bắt buộc.") })
            .pipe(
                z.email({ message: getMsg("auth.email_invalid", "Địa chỉ email không hợp lệ.") }),
            ),
    });
};

/**
 * Hàm tạo Reset Password Schema hỗ trợ i18n
 */
export const createResetPasswordSchema = (t) => {
    const getMsg = (key, fallback) => (t ? t(key) : fallback);

    return z
        .object({
            // Mật khẩu mới: tối thiểu 8 ký tự
            password: z.string().min(8, {
                message: getMsg("auth.password_min_length", "Mật khẩu phải có ít nhất 8 ký tự."),
            }),
            // Mật khẩu xác nhận mới: bắt buộc nhập
            password_confirmation: z.string().min(1, {
                message: getMsg("auth.password_mismatch", "Mật khẩu xác nhận không khớp."),
            }),
        })
        // Kiểm tra khớp giữa mật khẩu mới và mật khẩu xác nhận
        .refine((data) => data.password === data.password_confirmation, {
            message: getMsg("auth.password_mismatch", "Mật khẩu xác nhận không khớp."),
            path: ["password_confirmation"],
        });
};

// Dùng tiếng Việt mặc định nếu không truyền t
export const registerSchema = createRegisterSchema();
export const loginSchema = createLoginSchema();
export const forgotPasswordSchema = createForgotPasswordSchema();
export const resetPasswordSchema = createResetPasswordSchema();
