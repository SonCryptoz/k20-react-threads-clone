import { useTranslation } from "react-i18next";
import { User as UserIcon } from "lucide-react";

const ProfileComposer = ({ currentUser, onOpenCreateModal }) => {
    const { t } = useTranslation();

    return (
        <div
            onClick={onOpenCreateModal}
            className="w-full flex items-center justify-between py-3.5 px-4 md:px-6 border-b border-neutral-200/80 dark:border-neutral-800/80 cursor-pointer group select-none transition-colors"
        >
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 shrink-0 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-center">
                    {currentUser?.avatar_url ? (
                        <img
                            src={currentUser.avatar_url}
                            alt="avatar"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <UserIcon className="w-5 h-5 text-neutral-400" />
                    )}
                </div>

                <span className="text-sm text-neutral-400 dark:text-neutral-500 font-normal">
                    {t("profile.whats_new") || "Có gì mới?"}
                </span>
            </div>

            <button
                type="button"
                className="px-4 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 font-semibold text-xs text-neutral-900 dark:text-white group-hover:bg-neutral-100 dark:group-hover:bg-neutral-800 transition-colors pointer-events-none"
            >
                {t("profile.post_btn") || "Đăng"}
            </button>
        </div>
    );
};

export default ProfileComposer;
