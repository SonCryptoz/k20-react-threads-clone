import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";

import { createResetPasswordSchema } from "@/schemas";
import authService from "@/services/authService";
import useDocumentTitle from "@/hooks/useDocumentTitle";
import { getApiError } from "@/utils/getApiError";

/**
 * useResetPassword
 * Custom hook quản lý logic trang Đặt lại mật khẩu:
 * - Kiểm tra tính hợp lệ của token từ URL khi tải trang
 * - Validation mật khẩu mới & xác nhận mật khẩu qua Zod
 * - Xử lý gửi mật khẩu mới, cập nhật trạng thái và tự động chuyển về trang Đăng nhập
 */
export const useResetPassword = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    // Cập nhật tiêu đề trang
    useDocumentTitle(t("auth.reset_password_title"));

    // ==========================================
    // State & Refs: Trạng thái token, form controls, submit & lỗi
    // ==========================================
    // Trạng thái của quy trình đặt lại mật khẩu:
    // - "validating": Đang kiểm tra tính hợp lệ của token từ URL
    // - "valid": Token hợp lệ, sẵn sàng nhập mật khẩu mới
    // - "invalid": Token không hợp lệ hoặc đã hết hạn
    // - "success": Đặt lại mật khẩu thành công, chuẩn bị chuyển hướng
    const [status, setStatus] = useState("validating");
    // Cờ boolean điều khiển ẩn/hiện mật khẩu mới (type="password" vs type="text")
    const [showPassword, setShowPassword] = useState(false);
    // Cờ boolean điều khiển ẩn/hiện trường xác nhận mật khẩu
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    // Cờ boolean biểu thị trạng thái đang gọi API submit mật khẩu mới
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Chuỗi lưu thông báo lỗi tổng quát khi submit thất bại
    const [errorMessage, setErrorMessage] = useState("");

    // Ref boolean khóa chống React 18 StrictMode trong môi trường dev gọi API validate 2 lần trùng lặp
    const hasValidated = useRef(false);

    // Kiểm tra tính hợp lệ của reset token khi người dùng truy cập trang
    useEffect(() => {
        // 1. Kiểm tra guard: nếu không có token trên URL thì đánh dấu token invalid ngay lập tức
        if (!token) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setStatus("invalid");
            return;
        }

        // 2. Chặn chạy lặp lại nếu đã validate
        if (hasValidated.current) return;
        hasValidated.current = true;

        const validateToken = async () => {
            try {
                // 3. Gửi token lên server để kiểm tra xem link đã hết hạn hoặc đã dùng chưa
                const response = await authService.validateResetPassword(token);
                const resData = response.data?.data || response.data;

                // 4. Cập nhật trạng thái hợp lệ dựa trên phản hồi của backend
                if (resData?.valid === false) {
                    setStatus("invalid");
                } else {
                    setStatus("valid");
                }
            } catch {
                // 5. Nếu gặp lỗi kết nối hoặc server báo token lỗi thì đánh dấu invalid
                setStatus("invalid");
            }
        };

        validateToken();
    }, [token]);

    // Khởi tạo Zod schema đa ngôn ngữ cho form đặt lại mật khẩu
    const resetPasswordSchema = useMemo(() => createResetPasswordSchema(t), [t]);

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(resetPasswordSchema),
        mode: "onSubmit",
        reValidateMode: "onChange",
        defaultValues: {
            password: "",
            password_confirmation: "",
        },
    });

    // Xử lý gửi mật khẩu mới
    const onSubmit = async (values) => {
        // 1. Dọn dẹp lỗi cũ và bật trạng thái submit
        setErrorMessage("");
        setIsSubmitting(true);

        try {
            // 2. Gửi token và mật khẩu mới lên server qua authService
            await authService.resetPassword({
                token,
                password: values.password,
                password_confirmation: values.password_confirmation,
            });

            // 3. Đánh dấu trạng thái hoàn thành thành công (hiển thị UI thành công)
            setStatus("success");

            // 4. Hẹn giờ 2000ms rồi tự động chuyển về trang Đăng nhập kèm flash message resetSuccess
            setTimeout(() => {
                navigate("/login", {
                    state: { resetSuccess: true },
                    replace: true,
                });
            }, 2000);
        } catch (error) {
            // 5. Trích xuất thông tin lỗi từ phản hồi của API
            const { message, fieldErrors } = getApiError(error);

            if (message) {
                setErrorMessage(message);
            }

            // 6. Gán lỗi máy chủ vào từng trường cụ thể của form
            if (fieldErrors && Object.keys(fieldErrors).length > 0) {
                Object.entries(fieldErrors).forEach(([field, msg]) => {
                    setError(field, {
                        type: "server",
                        message: msg,
                    });
                });
            }
        } finally {
            // 7. Giải phóng cờ submit
            setIsSubmitting(false);
        }
    };

    return {
        status,
        token,
        register,
        handleSubmit,
        errors,
        showPassword,
        setShowPassword,
        showConfirmPassword,
        setShowConfirmPassword,
        isSubmitting,
        errorMessage,
        onSubmit,
    };
};

export default useResetPassword;
