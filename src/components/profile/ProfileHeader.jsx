import { useTranslation } from "react-i18next";
import { User as UserIcon, Loader2 } from "lucide-react";
import { useImagePreview } from "@/hooks/useImagePreview";

const ProfileHeader = ({
    user,
    followersCount = 0,
    followingCount = 0,
    isOwner = true,
    isFollowing = false,
    isFollowLoading = false,
    isInfoLoading = false,
    isStatsLoading = false,
    onToggleFollow,
    onOpenEditModal,
    onOpenFollowModal,
}) => {
    const { t } = useTranslation();
    const { openPreview } = useImagePreview();

    // Khi xem profile người khác, nếu đang tải thông tin ban đầu hoặc stats thì disable tương tác follow
    const isActionLoading = !isOwner && (isInfoLoading || isStatsLoading);

    const handleAvatarClick = () => {
        if (user?.avatar_url) {
            openPreview([user.avatar_url], 0, { author: user });
        }
    };

    return (
        <div className="w-full pt-5 pb-3 px-4 md:px-6 select-none">
            {/* Hàng trên: Thông tin Tên, Username, Bio bên trái & Avatar tròn bên phải */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    {/* Tên hiển thị */}
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-950 dark:text-white truncate">
                        {user?.name || user?.username || "Người dùng"}
                    </h1>

                    {/* Username */}
                    <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                        {user?.username ? `${user.username}` : ""}
                    </div>

                    {/* Tiểu sử (Bio) */}
                    {user?.bio ? (
                        <p className="text-sm text-neutral-900 dark:text-neutral-200 mt-3.5 whitespace-pre-line leading-relaxed wrap-break-word [word-break:break-word] max-w-full">
                            {user.bio}
                        </p>
                    ) : isOwner ? (
                        <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-3.5 italic">
                            {t("profile.bio_placeholder") || "+ Viết tiểu sử"}
                        </p>
                    ) : null}

                    {/* Thông tin người theo dõi (Click mở modal Người theo dõi / Đang theo dõi) */}
                    {isStatsLoading ? (
                        <div className="flex items-center gap-2 mt-4 select-none">
                            <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
                            <span className="text-neutral-300 dark:text-neutral-700">·</span>
                            <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 mt-4 text-xs md:text-sm text-neutral-400 dark:text-neutral-500">
                            <button
                                type="button"
                                onClick={() => onOpenFollowModal?.("followers")}
                                className="hover:underline hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer transition-colors"
                            >
                                {t("profile.followers_count", { count: followersCount }) ||
                                    `${followersCount} người theo dõi`}
                            </button>
                            <span>·</span>
                            <button
                                type="button"
                                onClick={() => onOpenFollowModal?.("following")}
                                className="hover:underline hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer transition-colors"
                            >
                                {t("profile.following_count", { count: followingCount }) ||
                                    `${followingCount} đang theo dõi`}
                            </button>
                        </div>
                    )}
                </div>

                {/* Avatar lớn bên phải */}
                <div className="shrink-0">
                    <div
                        onClick={handleAvatarClick}
                        title={user?.avatar_url ? (t("image_preview.view_avatar") || "Xem ảnh đại diện") : undefined}
                        className={`w-20 h-20 md:w-22 md:h-22 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 border-2 border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-center shadow-xs transition-transform ${
                            user?.avatar_url ? "cursor-pointer hover:opacity-90 active:scale-95" : ""
                        }`}
                    >
                        {user?.avatar_url ? (
                            <img
                                src={user.avatar_url}
                                alt={user.name || user.username}
                                className="w-full h-full object-cover"
                            />
                        ) : !isOwner && isInfoLoading ? (
                            <div className="w-full h-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
                        ) : (
                            <UserIcon className="w-10 h-10 text-neutral-400" />
                        )}
                    </div>
                </div>
            </div>

            {/* Nút hành động: "Chỉnh sửa trang cá nhân" (Chủ sở hữu) HOẶC "Theo dõi" / "Đang theo dõi" (Khách) */}
            <div className="mt-5 w-full">
                {isOwner ? (
                    <button
                        type="button"
                        onClick={onOpenEditModal}
                        className="w-full py-2 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700/90 font-semibold text-sm text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/80 active:scale-[0.99] transition-all cursor-pointer"
                    >
                        {t("profile.edit_profile") || "Chỉnh sửa trang cá nhân"}
                    </button>
                ) : isActionLoading ? (
                    /* Trạng thái tải thông tin ban đầu: Disable và hiển thị loader trung tính, ngăn click nhầm */
                    <button
                        type="button"
                        disabled
                        className="w-full py-2 px-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/70 dark:bg-neutral-800/40 font-semibold text-sm text-neutral-400 dark:text-neutral-500 cursor-not-allowed flex items-center justify-center gap-2 select-none"
                    >
                        <Loader2 className="w-4 h-4 animate-spin text-neutral-400 dark:text-neutral-500" />
                        <span>{t("profile.common_loading")}</span>
                    </button>
                ) : isFollowing ? (
                    <button
                        type="button"
                        onClick={onToggleFollow}
                        disabled={isFollowLoading}
                        className="w-full py-2 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700/90 font-semibold text-sm text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/80 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isFollowLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
                        ) : (
                            t("profile.following") || "Đang theo dõi"
                        )}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onToggleFollow}
                        disabled={isFollowLoading}
                        className="w-full py-2 px-4 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isFollowLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                        ) : (
                            t("profile.follow") || "Theo dõi"
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default ProfileHeader;
