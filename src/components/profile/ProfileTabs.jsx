import { useTranslation } from "react-i18next";

const ProfileTabs = ({ activeTab, onTabChange, isOwner = true }) => {
    const { t } = useTranslation();

    const tabs = [
        {
            key: "threads",
            label: t("profile.threads_tab") || "Cuộc trò chuyện",
        },
        {
            key: "reposts",
            label: t("profile.reposts_tab") || "Bài đăng lại",
        },
        ...(isOwner
            ? [
                  {
                      key: "suggestions",
                      label:
                          t("profile.follow_suggestions_tab") ||
                          "Theo dõi các trang cá nhân",
                  },
              ]
            : []),
    ];

    return (
        <div className="w-full flex border-b border-neutral-200/80 dark:border-neutral-800 shrink-0 select-none mt-2">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => onTabChange?.(tab.key)}
                        className={`flex-1 py-3 text-sm font-semibold transition-colors relative cursor-pointer text-center ${
                            isActive
                                ? "text-neutral-950 dark:text-white font-bold"
                                : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                        }`}
                    >
                        {tab.label}
                        {isActive && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-950 dark:bg-white rounded-full" />
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default ProfileTabs;
