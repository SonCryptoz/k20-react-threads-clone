import { useTranslation } from "react-i18next";

// eslint-disable-next-line react-refresh/only-export-components
export const ACTIVITY_TABS = [
    { key: "followers", labelKey: "activity.tab_followers", fallback: "Lượt theo dõi" },
    { key: "reposts", labelKey: "activity.tab_reposts", fallback: "Bài đăng lại" },
];

const ActivityHeader = ({ activeTab = "followers", onTabChange }) => {
    const { t } = useTranslation();

    return (
        <header className="sticky top-0 z-20 w-full backdrop-blur-md bg-white/85 dark:bg-[#101010]/85 border-b border-neutral-200/60 dark:border-neutral-800/80 transition-colors duration-200 select-none">
            <div className="grid grid-cols-2 w-full">
                {ACTIVITY_TABS.map((tab) => {
                    const isActive = activeTab === tab.key;
                    const label = t(tab.labelKey) || tab.fallback;

                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => onTabChange(tab.key)}
                            className="relative h-13 flex items-center justify-center text-sm font-semibold transition-colors cursor-pointer group"
                        >
                            <span
                                className={`transition-colors duration-200 ${
                                    isActive
                                        ? "text-neutral-950 dark:text-white font-bold"
                                        : "text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-700 dark:group-hover:text-neutral-300"
                                }`}
                            >
                                {label}
                            </span>

                            {/* Indicator gạch chân dưới tab đang active */}
                            {isActive && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-950 dark:bg-white rounded-full animate-in fade-in duration-200" />
                            )}
                        </button>
                    );
                })}
            </div>
        </header>
    );
};

export default ActivityHeader;
