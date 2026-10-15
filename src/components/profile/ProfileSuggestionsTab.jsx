import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Loader2, User as UserIcon, BadgeCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import userCache from "@/utils/userCache";
import useProfileSuggestions from "./hooks/useProfileSuggestions";

/**
 * ProfileSuggestionsSkeleton
 * Skeleton hiển thị khi đang nạp danh sách gợi ý theo dõi
 */
const ProfileSuggestionsSkeleton = () => {
    return (
        <div className="w-full flex flex-col divide-y divide-neutral-100 dark:divide-neutral-900/60 animate-pulse">
            {[1, 2, 3, 4, 5].map((key) => (
                <div key={key} className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
                        <div className="w-11 h-11 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3.5 bg-neutral-200 dark:bg-neutral-800 rounded-md w-28" />
                            <div className="h-2.5 bg-neutral-200 dark:bg-neutral-800 rounded-md w-20" />
                        </div>
                    </div>
                    <div className="w-20 h-7 bg-neutral-200 dark:bg-neutral-800 rounded-xl shrink-0" />
                </div>
            ))}
        </div>
    );
};

/**
 * ProfileSuggestionsTab
 * Component hiển thị danh sách các tài khoản gợi ý theo dõi trong Tab thứ 3 của Profile:
 * - Thay thế cho Card 2 trong ProfileOnboarding cũ
 * - Cho phép theo dõi / bỏ theo dõi trực tiếp với Optimistic UI
 * - Bấm vào tài khoản chuyển hướng đến trang cá nhân tương ứng
 */
const ProfileSuggestionsTab = ({ onFollowChange }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const {
        suggestions,
        isLoading,
        error,
        followingMap,
        actionLoadingMap,
        handleToggleFollow,
        reload,
    } = useProfileSuggestions({ onFollowChange });

    const handleUserClick = (user) => {
        if (user?.username) {
            userCache.saveUser(user);
            navigate(`/${user.username}`, { state: { user } });
        }
    };

    if (isLoading) {
        return <ProfileSuggestionsSkeleton />;
    }

    if (error) {
        return (
            <div className="p-8 text-center flex flex-col items-center justify-center">
                <p className="text-sm text-rose-500 mb-3">{error}</p>
                <Button
                    type="button"
                    variant="outline"
                    onClick={reload}
                    className="rounded-xl gap-2 cursor-pointer"
                >
                    <RefreshCw className="w-4 h-4" />
                    {t("post.reload") || "Thử lại"}
                </Button>
            </div>
        );
    }

    if (suggestions.length === 0) {
        return (
            <div className="py-16 text-center text-sm text-neutral-400 dark:text-neutral-500">
                {t("profile.no_suggestions") || "Không có gợi ý nào"}
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col">
            {suggestions.map((item) => {
                const isFollowing = Boolean(followingMap[item.id]);
                const isActionLoading = Boolean(actionLoadingMap[item.id]);

                return (
                    <div
                        key={item.id}
                        className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-100 dark:border-neutral-900/80 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors last:border-b-0"
                    >
                        <div className="flex items-start gap-3 min-w-0 flex-1 mr-3">
                            {/* Avatar */}
                            <div
                                onClick={() => handleUserClick(item)}
                                className="w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 shrink-0 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-center cursor-pointer"
                            >
                                {item.avatar_url ? (
                                    <img
                                        src={item.avatar_url}
                                        alt={item.username || item.name}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <UserIcon className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                                )}
                            </div>

                            {/* User details */}
                            <div className="min-w-0 flex-1 flex flex-col pt-0.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span
                                        onClick={() => handleUserClick(item)}
                                        className="font-semibold text-sm text-neutral-950 dark:text-white truncate hover:underline cursor-pointer"
                                    >
                                        {item.name || item.username}
                                    </span>
                                    {item.verified && (
                                        <BadgeCheck className="w-4 h-4 text-sky-500 fill-sky-500/20 shrink-0" />
                                    )}
                                </div>

                                <span
                                    onClick={() => handleUserClick(item)}
                                    className="text-xs text-neutral-400 dark:text-neutral-500 truncate cursor-pointer hover:underline"
                                >
                                    @{item.username}
                                </span>

                                {item.bio && (
                                    <p className="text-xs text-neutral-700 dark:text-neutral-300 line-clamp-1 mt-1 leading-relaxed">
                                        {item.bio}
                                    </p>
                                )}

                                {typeof item.followers_count === "number" && (
                                    <span className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
                                        {t("profile.followers_count", {
                                            count: item.followers_count,
                                        }) ||
                                            `${item.followers_count} ${t("profile.followers_title") || "người theo dõi"}`}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Nút Theo dõi / Đang theo dõi */}
                        <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleToggleFollow(item)}
                            className={`shrink-0 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center min-w-24 ${
                                isFollowing
                                    ? "border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white hover:border-neutral-400 dark:hover:border-neutral-600 active:scale-95"
                                    : "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 active:scale-95 shadow-2xs"
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
                    </div>
                );
            })}
        </div>
    );
};

export default ProfileSuggestionsTab;
