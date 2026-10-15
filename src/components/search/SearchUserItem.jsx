import { User as UserIcon, BadgeCheck, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import useSearchUserItem from "./hooks/useSearchUserItem";

const SearchUserItem = ({
    user,
    isFollowing = false,
    isLoading = false,
    isSelf = false,
    onToggleFollow,
    onUserClick,
}) => {
    const { t } = useTranslation();
    const {
        displayName,
        username,
        formattedFollowers,
        handleFollowClick,
        handleRowClick,
    } = useSearchUserItem({ user, onToggleFollow, onUserClick });

    if (!user) return null;

    return (
        <div
            onClick={handleRowClick}
            className="flex items-start justify-between px-4 py-3.5 border-b border-neutral-100 dark:border-neutral-900/80 hover:bg-neutral-50/60 dark:hover:bg-neutral-900/30 transition-colors cursor-pointer last:border-b-0 group"
        >
            <div className="flex items-start gap-3 min-w-0 flex-1 mr-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-200/60 dark:border-neutral-700/60 mt-0.5">
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

                {/* Info */}
                <div className="flex flex-col min-w-0 flex-1">
                    {/* Tên hiển thị + Tích xanh */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm text-neutral-950 dark:text-white truncate group-hover:underline">
                            {displayName}
                        </span>
                        {user.verified && (
                            <BadgeCheck className="w-4 h-4 text-sky-500 fill-sky-500/20 shrink-0" />
                        )}
                    </div>

                    {/* @username */}
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        @{username}
                    </span>

                    {/* Bio (nếu có) */}
                    {Boolean(user.bio) && (
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-1 line-clamp-2 wrap-break-word">
                            {user.bio}
                        </p>
                    )}

                    {/* Số lượng người theo dõi */}
                    {formattedFollowers !== null && (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5">
                            {t("search.followers_count", {
                                count: formattedFollowers,
                                defaultValue: `${formattedFollowers} người theo dõi`,
                            })}
                        </span>
                    )}
                </div>
            </div>

            {/* Nút Theo dõi / Đang theo dõi */}
            {!isSelf && (
                <Button
                    type="button"
                    variant={isFollowing ? "outline" : "default"}
                    size="sm"
                    disabled={isLoading}
                    onClick={handleFollowClick}
                    className={`rounded-xl px-4 py-1.5 text-xs font-semibold h-8 shrink-0 transition-all cursor-pointer active:scale-95 ${
                        isFollowing
                            ? "border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            : "bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                    }`}
                >
                    {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isFollowing ? (
                        t("search.following", "Đang theo dõi")
                    ) : (
                        t("search.follow", "Theo dõi")
                    )}
                </Button>
            )}
        </div>
    );
};

export default SearchUserItem;
