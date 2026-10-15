import { useTranslation } from "react-i18next";
import { Camera, Loader2, User } from "lucide-react";

import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import useEditProfileModal from "./hooks/useEditProfileModal";

const EditProfileModalContent = ({ onClose }) => {
    const { t } = useTranslation();

    const {
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
    } = useEditProfileModal({ onClose });

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs overscroll-contain transition-opacity duration-200 animate-in fade-in"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isSubmitting) {
                    onClose?.();
                }
            }}
        >
            <div
                className="w-full max-w-lg flex flex-col rounded-[24px] border-[1.5px] border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-[#181818] shadow-2xl text-neutral-900 dark:text-neutral-100 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
            >
                {/* 1. Header: Hủy / Tiêu đề / Xong */}
                <header className="px-5 py-3.5 flex items-center justify-between border-b-[1.5px] border-neutral-200/80 dark:border-neutral-700/80 shrink-0 select-none">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:opacity-70 transition-opacity cursor-pointer disabled:opacity-50"
                    >
                        {t("profile.cancel") || "Hủy"}
                    </button>

                    <h2 className="text-base font-bold text-neutral-950 dark:text-white">
                        {t("profile.edit_profile_title") || "Chỉnh sửa trang cá nhân"}
                    </h2>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="text-sm font-bold text-neutral-950 dark:text-white hover:opacity-70 transition-opacity cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {t("profile.done") || "Xong"}
                    </button>
                </header>

                {/* 2. Body Form */}
                <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">
                    {error && (
                        <div className="p-3 text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl">
                            {error}
                        </div>
                    )}

                    {/* Khung chứa các trường thông tin theo phong cách Threads */}
                    <div className="rounded-2xl border-[1.5px] border-neutral-200/80 dark:border-neutral-700/80 divide-y-[1.5px] divide-neutral-200/80 dark:divide-neutral-700/80 bg-neutral-50/50 dark:bg-neutral-900/30 overflow-hidden">
                        {/* Hàng 1: Tên & Avatar */}
                        <div className="p-4 flex items-center justify-between gap-4 w-full">
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                                    {t("profile.name_label") || "Tên"}
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={currentUser?.name || "Tên"}
                                    className="w-full bg-transparent font-medium text-sm text-neutral-900 dark:text-white outline-none border-0 p-0 placeholder-neutral-400 dark:placeholder-neutral-500"
                                />
                            </div>

                            {/* Avatar với nút đổi ảnh */}
                            <div className="relative group shrink-0">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-14 h-14 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 relative cursor-pointer flex items-center justify-center group"
                                    title={t("profile.change_avatar") || "Đổi ảnh đại diện"}
                                >
                                    {avatarPreview ? (
                                        <img
                                            src={avatarPreview}
                                            alt="avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <User className="w-7 h-7 text-neutral-400" />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="w-5 h-5 text-white" />
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Hàng 2: Tiểu sử (Bio) */}
                        <div className="p-4 flex flex-col w-full">
                            <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                                {t("profile.bio_label") || "Tiểu sử"}
                            </label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder={t("profile.bio_placeholder") || "+ Viết tiểu sử"}
                                rows={3}
                                className="w-full bg-transparent resize-none text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none border-0 p-0 leading-relaxed"
                            />
                        </div>

                        {/* Hàng 3: Trang cá nhân riêng tư */}
                        <div className="p-4 flex items-center justify-between gap-4 w-full">
                            <div className="flex-1 pr-2 min-w-0">
                                <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                                    {t("profile.private_profile") || "Trang cá nhân riêng tư"}
                                </div>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                                    {t("profile.private_profile_desc") ||
                                        "Nếu bạn bật chế độ riêng tư, chỉ những người theo dõi được bạn chấp thuận mới có thể xem thread của bạn."}
                                </p>
                            </div>

                            {/* Toggle Switch */}
                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                <input
                                    type="checkbox"
                                    checked={isPrivate}
                                    onChange={(e) => setIsPrivate(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neutral-900 dark:peer-checked:bg-white dark:peer-checked:after:bg-neutral-900"></div>
                            </label>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EditProfileModal = ({ isOpen, onClose }) => {
    useLockBodyScroll(isOpen);

    if (!isOpen) return null;

    return <EditProfileModalContent onClose={onClose} />;
};

export default EditProfileModal;
