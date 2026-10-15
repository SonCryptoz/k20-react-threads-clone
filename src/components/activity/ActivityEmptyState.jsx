import { UserPlus, Repeat2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const ActivityEmptyState = ({ activeTab = "followers" }) => {
    const { t } = useTranslation();

    const isFollowers = activeTab === "followers";

    const title = isFollowers
        ? t("activity.no_followers_title", "Chưa có lượt theo dõi nào")
        : t("activity.no_reposts_title", "Chưa có bài đăng lại nào");

    const description = isFollowers
        ? t("activity.no_followers_desc", "Khi có người theo dõi bạn, bạn sẽ thấy họ tại đây.")
        : t("activity.no_reposts_desc", "Các bài viết bạn đã đăng lại sẽ xuất hiện tại đây.");

    return (
        <div className="py-24 px-6 flex flex-col items-center justify-center text-center select-none">
            <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800/60 flex items-center justify-center text-neutral-400 dark:text-neutral-500 mb-4 border border-neutral-200/60 dark:border-neutral-700/60 shadow-2xs">
                {isFollowers ? (
                    <UserPlus size={28} strokeWidth={1.7} />
                ) : (
                    <Repeat2 size={28} strokeWidth={1.7} />
                )}
            </div>

            <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-1.5">
                {title}
            </h3>

            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs leading-relaxed">
                {description}
            </p>
        </div>
    );
};

export default ActivityEmptyState;
