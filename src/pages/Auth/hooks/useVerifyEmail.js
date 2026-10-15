import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

import authService from "@/services/authService";
import useDocumentTitle from "@/hooks/useDocumentTitle";

/**
 * useVerifyEmail
 * Custom hook quản lý logic trang Xác minh Email:
 * - Lấy token từ search params
 * - Gọi API xác minh email (dùng ref chặn StrictMode gọi 2 lần)
 * - Tự động điều hướng về /login với state { verified: true } khi thành công
 * - Xử lý thông báo lỗi chi tiết khi token không hợp lệ hoặc hết hạn
 */
export const useVerifyEmail = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    // Cập nhật tiêu đề trang
    useDocumentTitle(t("auth.verify_email_title"));

    // ==========================================
    // State & Refs: Trạng thái xác thực & Khóa tác vụ
    // ==========================================
    // Trạng thái của tiến trình xác minh email:
    // - "loading": Đang gửi token lên máy chủ để kích hoạt tài khoản
    // - "success": Xác minh thành công, chuẩn bị chuyển về màn hình đăng nhập
    // - "error": Token không hợp lệ, đã được sử dụng hoặc đã hết hạn
    const [status, setStatus] = useState("loading");
    // Chuỗi lưu thông báo lỗi tùy biến nhận từ API backend nếu có
    const [customError, setCustomError] = useState("");

    // Ref boolean khóa chống React 18 StrictMode trong dev mount 2 lần làm hỏng one-time token
    const hasFetched = useRef(false);

    // Tự động kích hoạt kiểm tra và xác minh email khi có token
    useEffect(() => {
        // 1. Kiểm tra guard: Nếu URL thiếu query param ?token=... thì đánh dấu lỗi ngay
        if (!token) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setStatus("error");
            return;
        }

        // 2. Kiểm tra khóa chặn: Không thực hiện lại nếu đã gọi API xác thực
        if (hasFetched.current) return;
        hasFetched.current = true;

        const verify = async () => {
            try {
                // 3. Gửi token xác minh lên server
                await authService.verifyEmail(token);

                // 4. Cập nhật trạng thái thành công
                setStatus("success");

                // 5. Hẹn giờ 2000ms rồi chuyển hướng về trang Đăng nhập kèm flash message verified
                setTimeout(() => {
                    navigate("/login", {
                        state: { verified: true },
                        replace: true,
                    });
                }, 2000);
            } catch (error) {
                // 6. Xử lý lỗi xác minh thất bại
                setStatus("error");
                const apiMsg = error.response?.data?.message || error.response?.data?.error;

                // 7. Nếu là lỗi đặc biệt ngoài lỗi hết hạn/invalid thông thường thì lưu vào customError
                if (
                    apiMsg &&
                    !apiMsg.toLowerCase().includes("hết hạn") &&
                    !apiMsg.toLowerCase().includes("expired") &&
                    !apiMsg.toLowerCase().includes("invalid") &&
                    !apiMsg.toLowerCase().includes("không hợp lệ")
                ) {
                    setCustomError(apiMsg);
                }
            }
        };

        verify();
    }, [token, navigate]);

    return {
        status,
        customError,
    };
};

export default useVerifyEmail;
