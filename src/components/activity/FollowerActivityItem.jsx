import { User as UserIcon, BadgeCheck, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const FollowerActivityItem = ({
    user,
    isFollowing,
    isLoading,
    onToggleFollow,
    onUserClick,
}) => {
    const { t } = useTranslation();

    if (!user) return null;

    const displayName = user.name || user.username || "user";
    const username = user.username || user.name || "user";

    return (
        <div
            onClick={() => onUserClick?.(user)}
            className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-100 dark:border-neutral-900/80 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors cursor-pointer last:border-b-0"
        >
            <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                {/* Avatar kèm Badge icon User phong cách Threads */}
                <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center border border-neutral-200/60 dark:border-neutral-700/60">
                        {user.avatar_url ? (
                            <img
                                src={user.avatar_url}
                                alt={displayName}
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                        ) : (
                            <UserIcon className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                        )}
                    </div>
                    {/* Badge icon tím ở góc avatar */}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center border-2 border-white dark:border-[#101010] shadow-2xs">
                        <UserIcon className="w-2.5 h-2.5" />
                    </div>
                </div>

                {/* Thông tin username và hành động */}
                <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm text-neutral-950 dark:text-white truncate hover:underline">
                            {username}
                        </span>
                        {user.verified && (
                            <BadgeCheck className="w-4 h-4 text-sky-500 fill-sky-500/20 shrink-0" />
                        )}
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {t("activity.followed_you", "đã bắt đầu theo dõi bạn")}
                    </p>
                </div>
            </div>

            {/* Nút Theo dõi / Đang theo dõi */}
            <Button
                type="button"
                variant={isFollowing ? "outline" : "default"}
                size="sm"
                disabled={isLoading}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleFollow?.(user);
                }}
                className={`rounded-xl px-4 py-1.5 text-xs font-semibold h-8 shrink-0 transition-all cursor-pointer active:scale-95 ${
                    isFollowing
                        ? "border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        : "bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                }`}
            >
                {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isFollowing ? (
                    t("activity.following", "Đang theo dõi")
                ) : (
                    t("activity.follow_back", "Theo dõi lại")
                )}
            </Button>
        </div>
    );
};

export default FollowerActivityItem;
