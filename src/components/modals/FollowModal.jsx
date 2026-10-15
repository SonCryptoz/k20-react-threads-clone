import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Loader2, User as UserIcon, X } from "lucide-react";

import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import userCache from "@/utils/userCache";
import useFollowModal from "./hooks/useFollowModal";

const FollowModalContent = ({
    onClose,
    userId,
    initialTab = "followers",
    onFollowChange,
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const {
        currentUser,
        activeTab,
        users,
        isLoading,
        error,
        followingMap,
        actionLoadingMap,
        handleTabChange,
        handleToggleFollow,
    } = useFollowModal({
        userId,
        initialTab,
        onFollowChange,
    });

    const handleUserClick = (user) => {
        if (user?.username) {
            userCache.saveUser(user);
            onClose?.();
            navigate(`/${user.username}`, { state: { user } });
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs overscroll-contain transition-opacity duration-200 animate-in fade-in"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose?.();
                }
            }}
        >
            <div
                className="w-full max-w-md h-130 max-h-[85vh] flex flex-col rounded-[24px] border-[1.5px] border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-[#181818] shadow-2xl text-neutral-900 dark:text-neutral-100 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
            >
                {/* 1. Header & Tabs */}
                <header className="px-4 pt-3 border-b-[1.5px] border-neutral-200/80 dark:border-neutral-700/80 shrink-0 select-none">
                    <div className="flex items-center justify-between pb-2">
                        <div className="w-7" />
                        <h2 className="text-sm font-bold text-neutral-950 dark:text-white">
                            {activeTab === "followers"
                                ? t("profile.followers_title") || "Người theo dõi"
                                : t("profile.following_title") || "Đang theo dõi"}
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Tab Navigation Switcher */}
                    <div className="flex w-full mt-1">
                        <button
                            type="button"
                            onClick={() => handleTabChange("followers")}
                            className={`flex-1 pb-3 text-sm font-semibold text-center transition-colors relative cursor-pointer ${
                                activeTab === "followers"
                                    ? "text-neutral-950 dark:text-white font-bold"
                                    : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                            }`}
                        >
                            {t("profile.followers_title") || "Người theo dõi"}
                            {activeTab === "followers" && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-950 dark:bg-white rounded-full" />
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => handleTabChange("following")}
                            className={`flex-1 pb-3 text-sm font-semibold text-center transition-colors relative cursor-pointer ${
                                activeTab === "following"
                                    ? "text-neutral-950 dark:text-white font-bold"
                                    : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                            }`}
                        >
                            {t("profile.following_title") || "Đang theo dõi"}
                            {activeTab === "following" && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-950 dark:bg-white rounded-full" />
                            )}
                        </button>
                    </div>
                </header>

                {/* 2. Danh sách User */}
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1 scrollbar-none">
                    {/* Đang tải */}
                    {isLoading && (
                        <div className="flex-1 flex items-center justify-center py-16">
                            <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
                        </div>
                    )}

                    {/* Thông báo lỗi */}
                    {!isLoading && error && (
                        <div className="p-4 text-center text-sm text-rose-500">{error}</div>
                    )}

                    {/* Trạng thái trống */}
                    {!isLoading && !error && users.length === 0 && (
                        <div className="flex-1 flex items-center justify-center py-20 text-center text-sm text-neutral-400 dark:text-neutral-500">
                            {activeTab === "followers"
                                ? t("profile.no_followers") || "Chưa có người theo dõi nào"
                                : t("profile.no_following") || "Chưa theo dõi người dùng nào"}
                        </div>
                    )}

                    {/* Render từng user */}
                    {!isLoading &&
                        users.map((item) => {
                            const isMe = item.id === currentUser?.id;
                            const isFollowing = Boolean(followingMap[item.id]);
                            const isActionLoading = Boolean(actionLoadingMap[item.id]);

                            return (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                                >
                                    <div
                                        onClick={() => handleUserClick(item)}
                                        className="flex items-center gap-3 min-w-0 cursor-pointer group"
                                    >
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 shrink-0 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-center">
                                            {item.avatar_url ? (
                                                <img
                                                    src={item.avatar_url}
                                                    alt={item.username || item.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <UserIcon className="w-5 h-5 text-neutral-400" />
                                            )}
                                        </div>

                                        <div className="min-w-0 flex flex-col">
                                            <span className="font-bold text-sm text-neutral-900 dark:text-white truncate group-hover:underline">
                                                {item.name || item.username}
                                            </span>
                                            <span className="text-xs text-neutral-400 dark:text-neutral-500 truncate">
                                                @{item.username}
                                            </span>
                                            {item.bio && (
                                                <span className="text-xs text-neutral-600 dark:text-neutral-300 truncate mt-0.5 line-clamp-1">
                                                    {item.bio}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Nút Theo dõi / Đang theo dõi */}
                                    {!isMe && (
                                        <button
                                            type="button"
                                            disabled={isActionLoading}
                                            onClick={() => handleToggleFollow(item)}
                                            className={`ml-3 shrink-0 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center min-w-24 ${
                                                isFollowing
                                                    ? "border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white hover:border-neutral-400 dark:hover:border-neutral-500"
                                                    : "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 shadow-2xs"
                                            }`}
                                        >
                                            {isActionLoading ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : isFollowing ? (
                                                t("profile.following") || "Đang theo dõi"
                                            ) : (
                                                t("profile.follow") || "Theo dõi"
                                            )}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
    );
};

const FollowModal = ({
    isOpen,
    onClose,
    userId,
    initialTab = "followers",
    onFollowChange,
}) => {
    useLockBodyScroll(isOpen);

    if (!isOpen) return null;

    return (
        <FollowModalContent
            key={`${userId}-${initialTab}`}
            onClose={onClose}
            userId={userId}
            initialTab={initialTab}
            onFollowChange={onFollowChange}
        />
    );
};

export default FollowModal;
