import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

import SearchHeader from "@/components/search/SearchHeader";
import SearchUserItem from "@/components/search/SearchUserItem";
import SearchTopicItem from "@/components/search/SearchTopicItem";
import SearchSkeleton from "@/components/search/SearchSkeleton";
import SearchEmptyState from "@/components/search/SearchEmptyState";

import useSearchPage from "./hooks/useSearchPage";

const SearchPage = () => {
    const { t } = useTranslation();

    const {
        query,
        setQuery,
        handleClear,
        isSearching,
        isSearchMode,
        debouncedQuery,
        suggestions,
        isSuggestionsLoading,
        searchResults,
        isSearchLoading,
        isEmpty,
        error,
        reload,
        followingMap,
        actionLoadingMap,
        currentUserId,
        handleToggleFollow,
        handleUserClick,
        handleTopicClick,
        cardRef,
        contentRef,
        spacerHeight,
        handleCardScroll,
    } = useSearchPage();

    const hasTopics = searchResults.topics.length > 0;
    const hasUsers = searchResults.users.length > 0;
    const isSingleChar = query.trim().length === 1;

    return (
        <div className="w-full h-full md:h-auto relative">
            {/* Khung dính cố định container đồng bộ tuyệt đối với HomePage */}
            <div className="w-full h-full flex flex-col md:sticky md:top-3 md:h-[calc(100dvh-0.75rem)]">
                {/* 1. Header đầu trang: h-13, border-b đồng bộ với FeedHeader & ActivityHeader */}
                <SearchHeader
                    query={query}
                    onChange={setQuery}
                    onClear={handleClear}
                    isSearching={isSearching}
                />

                {/* 2. Khung post card container: CỐ ĐỊNH TRÊN MÀN HÌNH, CHIỀU CAO VÀ VỊ TRÍ ĐỒNG BỘ TUYỆT ĐỐI VỚI HOME */}
                <div className="w-full flex-1 min-h-0 pt-2.5 md:pt-3">
                    <div
                        ref={cardRef}
                        onScroll={handleCardScroll}
                        className="w-full h-full rounded-t-[24px] md:rounded-b-none border-[1.5px] md:border-b-0 border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-[#101010] overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    >
                        <div ref={contentRef} className="w-full">
                            {/* Trạng thái gặp lỗi khi gọi API */}
                            {!isSearchLoading && !isSuggestionsLoading && error && (
                                <div className="p-8 text-center flex flex-col items-center justify-center">
                                    <p className="text-sm text-rose-500 mb-3">
                                        {error === "load_error"
                                            ? t(
                                                  "search.load_error",
                                                  "Không thể tải dữ liệu tìm kiếm. Vui lòng thử lại sau.",
                                              )
                                            : error}
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={reload}
                                        className="rounded-xl gap-2 cursor-pointer"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        {t("search.reload", "Tải lại")}
                                    </Button>
                                </div>
                            )}

                            {/* Trạng thái đang tải Skeleton */}
                            {((!isSearchMode && isSuggestionsLoading) ||
                                (isSearchMode && isSearchLoading)) && (
                                <SearchSkeleton count={7} />
                            )}

                            {/* Trạng thái không tìm thấy kết quả (Search Empty State) */}
                            {isEmpty && !error && (
                                <SearchEmptyState query={debouncedQuery.trim()} />
                            )}

                            {/* Trạng thái hiển thị kết quả tìm kiếm (Query >= 2 ký tự) */}
                            {!isSearchLoading && !error && isSearchMode && !isEmpty && (
                                <div className="flex flex-col">
                                    {/* Nhóm Chủ đề (Topics) */}
                                    {hasTopics && (
                                        <div>
                                            <div className="px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 bg-neutral-50/70 dark:bg-neutral-900/40 border-b border-neutral-100 dark:border-neutral-900/80">
                                                {t("search.topics_title", "Chủ đề")}
                                            </div>
                                            {searchResults.topics.map((topic, index) => {
                                                const key = topic.id || topic.name || index;
                                                return (
                                                    <SearchTopicItem
                                                        key={key}
                                                        topic={topic}
                                                        onTopicClick={handleTopicClick}
                                                    />
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Nhóm Người dùng (Users) */}
                                    {hasUsers && (
                                        <div>
                                            <div className="px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 bg-neutral-50/70 dark:bg-neutral-900/40 border-b border-neutral-100 dark:border-neutral-900/80">
                                                {t("search.users_title", "Người dùng")}
                                            </div>
                                            {searchResults.users.map((user) => (
                                                <SearchUserItem
                                                    key={user.id}
                                                    user={user}
                                                    isFollowing={Boolean(followingMap[user.id])}
                                                    isLoading={Boolean(actionLoadingMap[user.id])}
                                                    isSelf={
                                                        Boolean(currentUserId) &&
                                                        String(currentUserId) === String(user.id)
                                                    }
                                                    onToggleFollow={handleToggleFollow}
                                                    onUserClick={handleUserClick}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Trạng thái mặc định: Gợi ý theo dõi (Query < 2 ký tự) */}
                            {!isSuggestionsLoading && !error && !isSearchMode && (
                                <div className="flex flex-col">
                                    {/* Gợi ý nhập thêm ký tự khi mới gõ 1 ký tự */}
                                    {isSingleChar && (
                                        <div className="px-4 py-2 text-xs text-neutral-400 dark:text-neutral-500 bg-neutral-50/80 dark:bg-neutral-900/50 border-b border-neutral-100 dark:border-neutral-900/80">
                                            {t(
                                                "search.min_chars_hint",
                                                "Nhập tối thiểu 2 ký tự để tìm kiếm",
                                            )}
                                        </div>
                                    )}

                                    {/* Tiêu đề nhóm Gợi ý */}
                                    <div className="px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 bg-neutral-50/70 dark:bg-neutral-900/40 border-b border-neutral-100 dark:border-neutral-900/80">
                                        {t("search.suggestions_title", "Gợi ý theo dõi")}
                                    </div>

                                    {suggestions.length === 0 ? (
                                        <SearchEmptyState />
                                    ) : (
                                        suggestions.map((user) => (
                                            <SearchUserItem
                                                key={user.id}
                                                user={user}
                                                isFollowing={Boolean(followingMap[user.id])}
                                                isLoading={Boolean(actionLoadingMap[user.id])}
                                                isSelf={
                                                    Boolean(currentUserId) &&
                                                    String(currentUserId) === String(user.id)
                                                }
                                                onToggleFollow={handleToggleFollow}
                                                onUserClick={handleUserClick}
                                            />
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Spacer đệm chân trang để đồng bộ cuộn mượt mà trên desktop */}
                            <div
                                style={{ height: `${spacerHeight}px` }}
                                className="w-full shrink-0"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SearchPage;
