import { BadgeCheck, User as UserIcon, Repeat2, Plus, Check, Loader2 } from "lucide-react";
import InteractionBar from "./InteractionBar";
import PostMenu from "./PostMenu";
import MediaGallery from "@/components/common/MediaGallery";
import usePostCard from "./hooks/usePostCard";

/**
 * PostCard
 * Component hiển thị thẻ bài viết giao diện chuẩn Threads:
 * - Tiếp nhận các props sự kiện tương tác và dữ liệu bài viết
 * - Toàn bộ logic nghiệp vụ (repost, quote, nạp dữ liệu fallback, click handlers) được tách biệt vào hook `usePostCard`
 */
const PostCard = ({
    post,
    onLike,
    onComment,
    onRepost,
    onQuote,
    onShare,
    onCopyLink,
    onCopyAsImage,
    onGetEmbedCode,
    onDelete,
    onEdit,
    onHide,
    onSave,
    onBlock,
    onFollow,
    isDetail = false,
    avatarSize,
}) => {
    const {
        isCurrentUser,
        isFollowing,
        isFollowLoading,
        handleFollowClick,
        isRepost,
        reposter,
        isCurrentUserReposter,
        displayPost,
        author,
        formattedTime,
        mediaUrls,
        displayQuote,
        quotedPost,
        quotedAuthor,
        quotedFormattedTime,
        quotedMediaUrls,
        isQuoteUnavailable,
        effectivePost,
        handleCardClick,
        handleAuthorClick,
        handleReposterClick,
        handleQuotedCardClick,
        t,
    } = usePostCard({ post, isDetail, onFollow });

    if (!post) return null;

    // Bảo vệ hiển thị cấp giao diện: Không render bài viết mồ côi (repost của bài đã bị xóa, không có bài gốc và không có nội dung)
    const hasOriginal = Boolean(
        post.original_post &&
            (post.original_post.content ||
                post.original_post.media_urls?.length ||
                post.original_post.images?.length ||
                post.original_post.id),
    );
    const hasContent = Boolean(
        post.content ||
            post.media_urls?.length ||
            post.images?.length ||
            post.poll,
    );
    if (!hasOriginal && !hasContent) {
        return null;
    }

    return (
        <article
            onClick={handleCardClick}
            className={`w-full max-w-full overflow-hidden px-4 pt-3.5 pb-2 border-b-[1.5px] border-neutral-200/80 dark:border-neutral-700/80 last:border-b-0 transition-colors duration-150 flex flex-col text-neutral-900 dark:text-neutral-100 ${
                isDetail ? "" : "hover:bg-neutral-50/40 dark:hover:bg-neutral-900/30 cursor-pointer"
            }`}
        >
            {/* Header thông báo Đăng lại (Repost Banner) nếu là bài viết đăng lại */}
            {isRepost && (
                <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mb-1.5 pl-10 md:pl-11 select-none">
                    <Repeat2 className="w-3.5 h-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
                    <span
                        onClick={handleReposterClick}
                        className="font-medium hover:underline cursor-pointer"
                    >
                        {isCurrentUserReposter
                            ? t("post.you_reposted")
                            : t("post.user_reposted", {
                                  username: reposter?.username || reposter?.name || "user",
                              })}
                    </span>
                </div>
            )}

            <div className="flex gap-3 min-w-0 max-w-full">
                {/* Cột trái: Avatar của tác giả kèm nút Badge Follow/Unfollow */}
                <div className="flex flex-col items-center shrink-0 pt-0.5">
                    <div className="relative inline-block shrink-0">
                        <div
                            onClick={handleAuthorClick}
                            className={`${avatarSize || "w-10 h-10"} rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-200/60 dark:border-neutral-700/60 cursor-pointer`}
                        >
                            {author.avatar_url ? (
                                <img
                                    src={author.avatar_url}
                                    alt={author.name || author.username || "avatar"}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            ) : (
                                <UserIcon
                                    className={`${avatarSize ? "w-4 h-4" : "w-5 h-5"} text-neutral-400 dark:text-neutral-500`}
                                />
                            )}
                        </div>

                        {/* Nút Follow / Unfollow Badge ở góc dưới avatar */}
                        {!isCurrentUser && Boolean(author?.id) && (
                            <button
                                type="button"
                                disabled={isFollowLoading}
                                onClick={handleFollowClick}
                                className={`absolute -bottom-1 -right-1 ${
                                    avatarSize?.includes("w-8") ? "w-4 h-4" : "w-5 h-5"
                                } rounded-full flex items-center justify-center border-2 border-white dark:border-[#101010] shadow-sm transition-transform select-none ${
                                    isFollowLoading
                                        ? "opacity-80 cursor-not-allowed bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
                                        : isFollowing
                                          ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer active:scale-90"
                                          : "bg-black text-white dark:bg-white dark:text-black hover:opacity-90 cursor-pointer active:scale-90"
                                }`}
                                title={
                                    isFollowing
                                        ? t("profile.unfollow", "Bỏ theo dõi")
                                        : t("profile.follow", "Theo dõi")
                                }
                                aria-label={isFollowing ? "Unfollow" : "Follow"}
                            >
                                {isFollowLoading ? (
                                    <Loader2
                                        className={`${
                                            avatarSize?.includes("w-8") ? "w-2.5 h-2.5" : "w-3 h-3"
                                        } animate-spin`}
                                    />
                                ) : isFollowing ? (
                                    <Check
                                        className={`${
                                            avatarSize?.includes("w-8") ? "w-2.5 h-2.5" : "w-3 h-3"
                                        } stroke-3`}
                                    />
                                ) : (
                                    <Plus
                                        className={`${
                                            avatarSize?.includes("w-8") ? "w-2.5 h-2.5" : "w-3 h-3"
                                        } stroke-3`}
                                    />
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Cột phải: Toàn bộ thông tin & nội dung bài viết */}
                <div className="flex-1 min-w-0 max-w-full">
                    {/* Header: Tên, Verified Badge, Thời gian & Menu 3 chấm */}
                    <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span
                                onClick={handleAuthorClick}
                                className="font-semibold text-sm text-neutral-950 dark:text-white truncate hover:underline cursor-pointer"
                            >
                                {author.username || author.name}
                            </span>
                            {author.verified && (
                                <BadgeCheck className="w-4 h-4 text-sky-500 fill-sky-500/20 shrink-0" />
                            )}
                            <time className="text-neutral-400 dark:text-neutral-500 shrink-0 text-xs">
                                {formattedTime}
                            </time>
                        </div>

                        {/* Nút 3 chấm mở menu tùy chọn */}
                        <div className="shrink-0">
                            <PostMenu
                                post={effectivePost}
                                onDelete={onDelete}
                                onEdit={onEdit}
                                onHide={onHide}
                                onSave={onSave}
                                onBlock={onBlock}
                            />
                        </div>
                    </div>

                    {/* Nội dung text của bài viết */}
                    {displayPost.content && (
                        <div className="mt-1 text-sm md:text-base leading-relaxed whitespace-pre-line wrap-break-word [word-break:break-word] max-w-full overflow-hidden text-neutral-900 dark:text-neutral-100">
                            {displayPost.content}
                        </div>
                    )}

                    {/* Hình ảnh/Media đính kèm nếu có */}
                    {mediaUrls.length > 0 && (
                        <MediaGallery media={mediaUrls} className="mt-3" />
                    )}

                    {/* Trích dẫn bài viết gốc (Quote post) */}
                    {displayQuote && quotedPost && (
                        <div
                            onClick={handleQuotedCardClick}
                            className="mt-3 p-3.5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 text-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors cursor-pointer select-none"
                        >
                            <div className="flex items-center gap-2 mb-1.5">
                                <div className="w-5 h-5 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 shrink-0 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-center">
                                    {quotedAuthor.avatar_url ? (
                                        <img
                                            src={quotedAuthor.avatar_url}
                                            alt={quotedAuthor.username || "avatar"}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <UserIcon className="w-3 h-3 text-neutral-400" />
                                    )}
                                </div>
                                <span className="font-semibold text-neutral-900 dark:text-white truncate">
                                    {quotedAuthor.username || quotedAuthor.name || "user"}
                                </span>
                                {quotedAuthor.verified && (
                                    <BadgeCheck className="w-3.5 h-3.5 text-sky-500 fill-sky-500/20 shrink-0" />
                                )}
                                {quotedFormattedTime && (
                                    <time className="text-neutral-400 dark:text-neutral-500 shrink-0 ml-auto">
                                        {quotedFormattedTime}
                                    </time>
                                )}
                            </div>

                            {quotedPost.content && (
                                <p className="text-neutral-800 dark:text-neutral-200 text-sm leading-relaxed whitespace-pre-line wrap-break-word [word-break:break-word] max-w-full overflow-hidden">
                                    {quotedPost.content}
                                </p>
                            )}

                            {quotedMediaUrls.length > 0 && (
                                <MediaGallery media={quotedMediaUrls} compact={true} className="mt-2.5" />
                            )}
                        </div>
                    )}

                    {/* Hiển thị khi bài viết trích dẫn không tồn tại hoặc đã bị xóa */}
                    {isQuoteUnavailable && (
                        <div className="mt-3 p-3.5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-900/30 text-xs text-neutral-400 dark:text-neutral-500 italic select-none">
                            {t("post.post_not_found", "Bài viết không tồn tại hoặc đã bị xóa.")}
                        </div>
                    )}

                    {/* Thanh tương tác 4 nút dưới bài viết */}
                    <div className="mt-2.5">
                        <InteractionBar
                            post={effectivePost}
                            onLike={onLike}
                            onComment={onComment}
                            onRepost={onRepost}
                            onQuote={onQuote}
                            onShare={onShare}
                            onCopyLink={onCopyLink}
                            onCopyAsImage={onCopyAsImage || onShare}
                            onGetEmbedCode={onGetEmbedCode}
                        />
                    </div>
                </div>
            </div>
        </article>
    );
};

export default PostCard;
