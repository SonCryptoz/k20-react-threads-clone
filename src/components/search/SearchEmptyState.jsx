import { SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";

const SearchEmptyState = ({ query = "" }) => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center select-none">
            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-center text-neutral-400 dark:text-neutral-500 mb-4 shadow-2xs">
                <SearchX className="w-8 h-8" />
            </div>

            {/* Title */}
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1.5">
                {t("search.no_results_title", "Không tìm thấy kết quả")}
            </h3>

            {/* Description */}
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm leading-relaxed">
                {query
                    ? t("search.no_results_desc", {
                          query,
                          defaultValue: `Không có kết quả nào khớp với "${query}". Hãy thử tìm kiếm bằng từ khóa khác.`,
                      })
                    : t("profile.no_suggestions", "Không có gợi ý nào")}
            </p>
        </div>
    );
};

export default SearchEmptyState;
