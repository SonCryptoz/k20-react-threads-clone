import { Search, X, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import useSearchInput from "./hooks/useSearchInput";

const SearchInput = ({
    value = "",
    onChange,
    onClear,
    isSearching = false,
    inputRef: externalRef,
    className = "",
}) => {
    const { t } = useTranslation();
    const { inputRef, handleClear, handleKeyDown } = useSearchInput({
        onClear,
        inputRef: externalRef,
    });

    return (
        <div
            className={`w-full relative flex items-center h-9.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800/80 rounded-xl px-3.5 transition-all duration-150 focus-within:border-neutral-400 dark:focus-within:border-neutral-600 focus-within:ring-2 focus-within:ring-neutral-200/40 dark:focus-within:ring-neutral-800/60 shadow-2xs ${className}`}
        >
            {/* Search Icon */}
            <Search className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0 mr-2.5 select-none" />

            {/* Input field */}
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("search.placeholder", "Tìm kiếm")}
                aria-label={t("search.placeholder", "Tìm kiếm")}
                autoComplete="off"
                spellCheck="false"
                className="w-full bg-transparent text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none pr-1"
            />

            {/* Right Status Actions: Spinner & Clear */}
            <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                {isSearching && (
                    <Loader2 className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 animate-spin" />
                )}

                {Boolean(value) && (
                    <button
                        type="button"
                        onClick={handleClear}
                        aria-label={t("search.clear", "Xóa")}
                        className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/70 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default SearchInput;
