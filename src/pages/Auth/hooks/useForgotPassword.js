import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";

import { createForgotPasswordSchema } from "@/schemas";
import authService from "@/services/authService";
import useDocumentTitle from "@/hooks/useDocumentTitle";
import { getApiError } from "@/utils/getApiError";
import useDebounce from "@/hooks/useDebounce";

/**
 * useForgotPassword
 * Custom hook quản lý logic trang Quên mật khẩu:
 * - Validation email qua Zod & React Hook Form
 * - Debounce 700ms kiểm tra cú pháp email khi gõ
 * - Xử lý gửi yêu cầu reset link và bắt lỗi máy chủ
 */
export const useForgotPassword = () => {
    const { t } = useTranslation();

    // Cập nhật tiêu đề trang
    useDocumentTitle(t("auth.forgot_password"));

    // ==========================================
    // State: Trạng thái gửi & thông báo
    // ==========================================
    // Cờ boolean biểu thị trạng thái đang gọi API yêu cầu đặt lại mật khẩu
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Chuỗi lưu thông báo thành công (đã gửi link khôi phục mật khẩu vào hòm thư)
    const [successMessage, setSuccessMessage] = useState("");
    // Chuỗi lưu thông báo lỗi tổng quát khi gửi yêu cầu thất bại
    const [errorMessage, setErrorMessage] = useState("");

    // Khởi tạo Zod schema đa ngôn ngữ cho form quên mật khẩu
    const forgotPasswordSchema = useMemo(() => createForgotPasswordSchema(t), [t]);

    const {
        register,
        handleSubmit,
        setError,
        watch,
        trigger,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(forgotPasswordSchema),
        mode: "onSubmit",
        reValidateMode: "onChange",
        defaultValues: {
            email: "",
        },
    });

    // Theo dõi giá trị để áp dụng debounce 700ms kiểm tra ngay sau khi gõ
    // eslint-disable-next-line react-hooks/incompatible-library
    const watchedEmail = watch("email");
    const debouncedEmail = useDebounce(watchedEmail, 700);

    useEffect(() => {
        if (debouncedEmail && debouncedEmail.trim().length > 0) {
            trigger("email");
        }
    }, [debouncedEmail, trigger]);

    // Xử lý gửi form yêu cầu đặt lại mật khẩu
    const onSubmit = async (values) => {
        // 1. Dọn sạch thông báo cũ và bật cờ submitting
        setErrorMessage("");
        setSuccessMessage("");
        setIsSubmitting(true);

        try {
            // 2. Gửi request yêu cầu gửi email reset password lên server
            await authService.forgotPassword(values.email);

            // 3. Hiển thị thông báo hướng dẫn kiểm tra hòm thư email
            setSuccessMessage(t("auth.reset_link_sent"));
        } catch (error) {
            // 4. Trích xuất lỗi từ phản hồi của API
            const { message, fieldErrors } = getApiError(error);

            if (message) {
                setErrorMessage(message);
            }

            // 5. Gán lỗi máy chủ (ví dụ: email không tồn tại trong hệ thống) vào trường email
            if (fieldErrors && Object.keys(fieldErrors).length > 0) {
                Object.entries(fieldErrors).forEach(([field, msg]) => {
                    let localizedMsg = msg;
                    if (
                        typeof msg === "string" &&
                        (msg.toLowerCase().includes("selected email is invalid") ||
                            msg.toLowerCase().includes("not exist"))
                    ) {
                        localizedMsg = t("auth.email_not_found");
                    }

                    setError(field, {
                        type: "server",
                        message: localizedMsg,
                    });
                });
            }
        } finally {
            // 6. Giải phóng cờ submit
            setIsSubmitting(false);
        }
    };

    return {
        register,
        handleSubmit,
        errors,
        isSubmitting,
        successMessage,
        errorMessage,
        onSubmit,
    };
};

export default useForgotPassword;
