import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";

import userService from "@/services/userService";
import { updateUser, fetchCurrentUser } from "@/features/authSlice";
import { getApiError } from "@/utils/getApiError";

/**
 * useEditProfileModal
 * Hook quản lý toàn bộ logic cho Modal Chỉnh sửa hồ sơ:
 * - Quản lý form state: Tên, Tiểu sử, Quyền riêng tư, Preview ảnh đại diện
 * - Cập nhật toàn bộ thông tin hồ sơ (bao gồm cả avatar) qua userService.updateProfile
 * - Đồng bộ thông tin người dùng vào Redux store
 */
export const useEditProfileModal = ({ onClose }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const { user: currentUser } = useSelector((state) => state.auth);

    // State lưu tên hiển thị (name) của người dùng
    const [name, setName] = useState(currentUser?.name || "");
    // State lưu tiểu sử giới thiệu (bio)
    const [bio, setBio] = useState(currentUser?.bio || "");
    // State cờ riêng tư của trang cá nhân (is_private)
    const [isPrivate, setIsPrivate] = useState(Boolean(currentUser?.is_private));
    // State lưu file ảnh đại diện mới được chọn từ máy tính
    const [avatarFile, setAvatarFile] = useState(null);
    // State lưu URL xem trước ảnh đại diện (blob URL hoặc avatar_url cũ)
    const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatar_url || "");

    // State cờ đang trong tiến trình gửi dữ liệu lên server
    const [isSubmitting, setIsSubmitting] = useState(false);
    // State lưu thông báo lỗi khi cập nhật hồ sơ thất bại
    const [error, setError] = useState(null);

    // Tham chiếu đến input[type='file'] ẩn để kích hoạt chọn ảnh đại diện khi click avatar
    const fileInputRef = useRef(null);

    // Xử lý khi người dùng chọn file ảnh từ máy tính (kiểm tra định dạng và tạo blob URL xem trước)
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Kiểm tra mime-type hợp lệ của file ảnh
        if (!file.type.startsWith("image/")) {
            setError(t("profile.upload_avatar_failed") || "Vui lòng chọn file hình ảnh hợp lệ");
            return;
        }

        // Lưu file object và tạo blob preview tức thì
        setAvatarFile(file);
        const objectUrl = URL.createObjectURL(file);
        setAvatarPreview(objectUrl);
        setError(null);
    };

    // Xử lý gửi form cập nhật hồ sơ lên API backend (POST /api/auth/profile với _method: PUT)
    const handleSubmit = async (e) => {
        e?.preventDefault();

        // 1. Kiểm tra validation: Tên hiển thị là trường bắt buộc
        if (!name.trim()) {
            setError(t("auth.display_name_required") || "Tên hiển thị là bắt buộc.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // 2. Chuẩn bị FormData (sử dụng method spoofing _method: PUT theo chuẩn Laravel/PHP)
            const formData = new FormData();
            formData.append("_method", "PUT");
            formData.append("name", name.trim());
            formData.append("bio", bio.trim());
            formData.append("is_private", isPrivate ? "1" : "0");

            // 3. Đính kèm file avatar mới nếu người dùng có chọn ảnh mới
            if (avatarFile) {
                formData.append("avatar", avatarFile);
            }

            // 4. Gọi API cập nhật thông tin cá nhân
            const res = await userService.updateProfile(formData);
            const updated = res?.data || res;

            // 5. Đồng bộ ngay dữ liệu mới vào Redux Store authSlice
            if (updated) {
                dispatch(updateUser(updated));
            }
            // 6. Làm mới lại thông tin user trong nền để đồng bộ đầy đủ các trường phụ thuộc
            dispatch(fetchCurrentUser());

            // 7. Đóng modal sau khi hoàn tất thành công
            onClose?.();
        } catch (err) {
            // 8. Bóc tách lỗi và hiển thị thông báo lỗi
            const { message } = getApiError(
                err,
                t("profile.update_failed") || "Không thể cập nhật trang cá nhân, vui lòng thử lại"
            );
            setError(message);
        } finally {
            // 9. Giải phóng trạng thái loading submit
            setIsSubmitting(false);
        }
    };

    return {
        currentUser,
        name,
        setName,
        bio,
        setBio,
        isPrivate,
        setIsPrivate,
        avatarPreview,
        fileInputRef,
        isSubmitting,
        error,
        handleFileChange,
        handleSubmit,
    };
};

export default useEditProfileModal;
