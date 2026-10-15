import { Sun, Moon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";

const ThemeToggle = ({ className = "" }) => {
    const { theme, toggleTheme } = useTheme();
    const { t } = useTranslation();
    const label = t(theme === "light" ? "theme.switch_to_dark" : "theme.switch_to_light");

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={`w-13 h-13 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500 ${className}`}
            title={label}
            aria-label={label}
        >
            {theme === "light" ? (
                <Moon className="w-5 h-5" />
            ) : (
                <Sun className="w-5 h-5" />
            )}
        </button>
    );
};

export default ThemeToggle;
