import { useTranslation } from "react-i18next";

const LanguageSwitcher = () => {
    const { i18n, t } = useTranslation();
    const currentLang = (i18n.resolvedLanguage || i18n.language || "vi").slice(0, 2);
    const nextLang = currentLang === "vi" ? "en" : "vi";
    const label = t(`language.switch_to_${nextLang}`);

    return (
        <button
            type="button"
            onClick={() => i18n.changeLanguage(nextLang)}
            className="w-13 h-13 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
            title={label}
            aria-label={label}
        >
            <span className="text-xs font-semibold tracking-wide">
                {currentLang.toUpperCase()}
            </span>
        </button>
    );
};

export default LanguageSwitcher;