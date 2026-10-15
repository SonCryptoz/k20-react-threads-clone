import { Hash, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import useSearchTopicItem from "./hooks/useSearchTopicItem";

const SearchTopicItem = ({ topic, onTopicClick }) => {
    const { t } = useTranslation();
    const { cleanName, formattedCount, handleClick } = useSearchTopicItem({
        topic,
        onTopicClick,
    });

    if (!topic) return null;

    return (
        <div
            onClick={handleClick}
            className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-900/80 hover:bg-neutral-50/60 dark:hover:bg-neutral-900/30 transition-colors cursor-pointer last:border-b-0 group"
        >
            <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                {/* Topic Icon */}
                <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-center shrink-0 border border-neutral-200/60 dark:border-neutral-700/60 text-neutral-700 dark:text-neutral-300">
                    <Hash className="w-4 h-4" />
                </div>

                {/* Topic Info */}
                <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-semibold text-sm text-neutral-950 dark:text-white truncate group-hover:underline">
                        #{cleanName}
                    </span>
                    {formattedCount !== null && (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            {t("search.posts_count", {
                                count: formattedCount,
                                defaultValue: `${formattedCount} bài viết`,
                            })}
                        </span>
                    )}
                </div>
            </div>

            <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-transform group-hover:translate-x-0.5 shrink-0" />
        </div>
    );
};

export default SearchTopicItem;
