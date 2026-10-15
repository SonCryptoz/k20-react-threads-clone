import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";

import { createLoginSchema } from "@/schemas";
import authService from "@/services/authService";
import useDocumentTitle from "@/hooks/useDocumentTitle";
import { getApiError } from "@/utils/getApiError";
import { setTokens } from "@/utils/tokenStorage";
import { fetchCurrentUser } from "@/features/authSlice";

/**
 * useLogin
 * Custom hook quản lý toàn bộ logic nghiệp vụ trang Đăng nhập:
 * - Validation form qua Zod & React Hook Form
 * - Quản lý hiển thị/ẩn mật khẩu, trạng thái submit, thông báo lỗi / thành công
 * - Xử lý đăng nhập, lưu token, lấy thông tin user và điều hướng
 */
export const useLogin = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();

    // Cập nhật tiêu đề trang
    useDocumentTitle(t("auth.login"));

    // ==========================================
    // State: Form controls, trạng thái gửi & thông báo
    // ==========================================
    // Cờ boolean điều khiển ẩn/hiện mật khẩu trong input (type="password" vs type="text")
    const [showPassword, setShowPassword] = useState(false);
    // Cờ boolean biểu thị trạng thái đang gọi API submit đăng nhập
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Chuỗi lưu thông báo lỗi tổng quát hiển thị trên banner đầu form
    const [errorMessage, setErrorMessage] = useState("");
    // Chuỗi lưu thông báo thành công (ví dụ: vừa kích hoạt tài khoản hoặc vừa đổi mật khẩu thành công)
    const [successMessage] = useState(() => {
        if (location.state?.verified) {
            return t("auth.verified_success");
        }
        if (location.state?.resetSuccess) {
            return t("auth.reset_password_success_login");
        }
        return "";
    });

    // Khởi tạo Zod schema hỗ trợ đa ngôn ngữ
    const loginSchema = useMemo(() => createLoginSchema(t), [t]);

    // Lấy trạng thái đăng nhập từ Redux store
    const { isAuthenticated, isLoading } = useSelector((state) => state.auth);

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(loginSchema),
        mode: "onSubmit",
        reValidateMode: "onChange",
        defaultValues: {
            login: "",
            password: "",
        },
    });

    // Xử lý gửi form đăng nhập
    const onSubmit = async (values) => {
        // 1. Reset lỗi cũ và bật trạng thái submit
        setErrorMessage("");
        setIsSubmitting(true);

        try {
            // 2. Gửi thông tin đăng nhập lên server
            const response = await authService.login({
                login: values.login,
                password: values.password,
            });

            const resData = response.data?.data || response.data;

            // 3. Lưu access token và refresh token vào localStorage / cookie an toàn
            setTokens({
                accessToken: resData?.access_token || resData?.accessToken || resData?.token,
                refreshToken: resData?.refresh_token || resData?.refreshToken,
            });

            // 4. Kích hoạt Splash Screen Skeleton và lấy thông tin user với minDelay để hiển thị hiệu ứng khởi động
            const fetchPromise = dispatch(fetchCurrentUser({ minDelay: 600 }));

            // 5. Chuyển hướng ngay sang trang đích ngầm bên dưới Splash Screen
            const from = location.state?.from?.pathname || "/";
            navigate(from, { replace: true });

            // 6. Chờ lấy xong dữ liệu user vào Redux store
            await fetchPromise.unwrap();
        } catch (error) {
            // 7. Xử lý và trích xuất lỗi API
            const { message, fieldErrors } = getApiError(error);

            let displayMsg = message;
            if (displayMsg && displayMsg.toLowerCase().includes("invalid credentials")) {
                displayMsg = t("auth.invalid_credentials");
            }

            if (displayMsg) {
                setErrorMessage(displayMsg);
            }

            // Gán lỗi cụ thể vào từng trường của form nếu có
            if (fieldErrors && Object.keys(fieldErrors).length > 0) {
                Object.entries(fieldErrors).forEach(([field, msg]) => {
                    setError(field, {
                        type: "server",
                        message: msg,
                    });
                });
            }
        } finally {
            // 8. Giải phóng cờ trạng thái submit
            setIsSubmitting(false);
        }
    };

    return {
        register,
        handleSubmit,
        errors,
        showPassword,
        setShowPassword,
        isSubmitting,
        errorMessage,
        successMessage,
        isAuthenticated,
        isLoading,
        location,
        onSubmit,
    };
};

export default useLogin;
