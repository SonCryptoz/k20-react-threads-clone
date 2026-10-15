import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";

import { createRegisterSchema } from "@/schemas";
import authService from "@/services/authService";
import useDebounce from "@/hooks/useDebounce";
import useDocumentTitle from "@/hooks/useDocumentTitle";
import { getApiError } from "@/utils/getApiError";

/**
 * useRegister
 * Custom hook quản lý toàn bộ logic nghiệp vụ trang Đăng ký:
 * - Validation form qua Zod & React Hook Form
 * - Debounce 700ms kiểm tra tính hợp lệ của username & email khi người dùng đang gõ
 * - Quản lý hiển thị/ẩn mật khẩu, trạng thái submit, thông báo thành công / lỗi
 */
export const useRegister = () => {
    const { t } = useTranslation();

    // Cập nhật tiêu đề trang
    useDocumentTitle(t("auth.register"));

    // ==========================================
    // State: Form controls, trạng thái gửi & thông báo
    // ==========================================
    // Cờ boolean điều khiển ẩn/hiện mật khẩu (type="password" vs type="text")
    const [showPassword, setShowPassword] = useState(false);
    // Cờ boolean điều khiển ẩn/hiện trường xác nhận lại mật khẩu
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    // Cờ boolean biểu thị trạng thái đang gọi API submit đăng ký tài khoản
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Chuỗi thông báo đăng ký thành công (thông báo đã gửi link kích hoạt đến email)
    const [successMessage, setSuccessMessage] = useState("");
    // Chuỗi thông báo lỗi tổng quát khi đăng ký thất bại
    const [errorMessage, setErrorMessage] = useState("");

    // Khởi tạo Zod schema đa ngôn ngữ cho form đăng ký
    const registerSchema = useMemo(() => createRegisterSchema(t), [t]);

    const {
        register,
        handleSubmit,
        watch,
        trigger,
        setError,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(registerSchema),
        mode: "onSubmit",
        reValidateMode: "onChange",
        defaultValues: {
            username: "",
            email: "",
            password: "",
            password_confirmation: "",
        },
    });

    // Theo dõi giá trị để áp dụng debounce 700ms kiểm tra ngay sau khi gõ
    // eslint-disable-next-line react-hooks/incompatible-library
    const watchedDisplayName = watch("username");
    const watchedEmail = watch("email");

    const debouncedDisplayName = useDebounce(watchedDisplayName, 700);
    const debouncedEmail = useDebounce(watchedEmail, 700);

    // Debounce kiểm tra sau 700ms khi ô đã có nội dung
    useEffect(() => {
        if (debouncedDisplayName && debouncedDisplayName.trim().length > 0) {
            trigger("username");
        }
    }, [debouncedDisplayName, trigger]);

    useEffect(() => {
        if (debouncedEmail && debouncedEmail.trim().length > 0) {
            trigger("email");
        }
    }, [debouncedEmail, trigger]);

    // Xử lý gửi form đăng ký tài khoản mới
    const onSubmit = async (values) => {
        // 1. Dọn sạch các thông báo cũ và bật cờ isSubmitting
        setErrorMessage("");
        setSuccessMessage("");
        setIsSubmitting(true);

        try {
            // 2. Gửi thông tin tài khoản đăng ký lên backend
            await authService.register({
                username: values.username,
                email: values.email,
                password: values.password,
                password_confirmation: values.password_confirmation,
            });

            // 3. Hiển thị thông báo đăng ký thành công kèm lời nhắc kiểm tra hòm thư
            setSuccessMessage(t("auth.verify_sent"));
        } catch (error) {
            // 4. Trích xuất thông tin lỗi từ phản hồi của API
            const { message, fieldErrors } = getApiError(error);

            if (message) {
                setErrorMessage(message);
            }

            // 5. Gán lỗi chi tiết vào từng trường cụ thể của form (ví dụ: email đã tồn tại, username trùng lặp)
            if (fieldErrors && Object.keys(fieldErrors).length > 0) {
                Object.entries(fieldErrors).forEach(([field, msg]) => {
                    setError(field, {
                        type: "server",
                        message: msg,
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
        showPassword,
        setShowPassword,
        showConfirmPassword,
        setShowConfirmPassword,
        isSubmitting,
        successMessage,
        errorMessage,
        onSubmit,
    };
};

export default useRegister;
