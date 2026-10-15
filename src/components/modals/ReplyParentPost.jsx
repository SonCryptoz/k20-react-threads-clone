import { BadgeCheck, User as UserIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatTimeAgo } from "@/utils/formatTime";
import MediaGallery from "@/components/common/MediaGallery";

/**
 * ReplyParentPost
 * Component hiển thị thông tin bài viết gốc ở phần đầu modal phản hồi:
 * - Avatar tác giả bài viết
 * - Đường Thread-Line nối dọc xuống avatar phản hồi
 * - Username, Verified badge, thời gian tạo bài
 * - Nội dung text của bài viết gốc
 */
const ReplyParentPost = ({ post }) => {
    const { t, i18n } = useTranslation();

    if (!post) return null;

    const parentUser = post.user || {};
    const language = i18n.resolvedLanguage || i18n.language || "vi";
    const dateLocale = language.startsWith("en") ? "en-US" : "vi-VN";
    const formattedTime = formatTimeAgo(post.created_at, t, dateLocale);
    const mediaUrls = Array.isArray(post.media_urls)
        ? post.media_urls
        : Array.isArray(post.images)
          ? post.images
          : [];
    const isQuote = Boolean(post.is_quote && post.original_post);

    return (
        <div className="flex gap-3">
            {/* Cột Avatar tác giả + Thread line dọc */}
            <div className="flex flex-col items-center shrink-0">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 shrink-0 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-center">
                    {parentUser.avatar_url ? (
                        <img
                            src={parentUser.avatar_url}
                            alt={parentUser.username || "avatar"}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <UserIcon className="w-5 h-5 text-neutral-400" />
                    )}
                </div>
                {/* Đường Thread-Line nối dọc xuống avatar phản hồi */}
                <div className="w-0.5 grow bg-neutral-200 dark:bg-neutral-800 my-1 min-h-7.5" />
            </div>

            {/* Cột thông tin bài viết gốc */}
            <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-neutral-950 dark:text-white truncate">
                        {parentUser.username || parentUser.name}
                    </span>
                    {parentUser.verified && (
                        <BadgeCheck className="w-3.5 h-3.5 text-sky-500 fill-sky-500/20 shrink-0" />
                    )}
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 shrink-0">
                        {formattedTime}
                    </span>
                </div>

                {post.content && (
                    <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-line wrap-break-word [word-break:break-word] max-w-full">
                        {post.content}
                    </p>
                )}

                {/* Hình ảnh/Media đính kèm nếu có */}
                {mediaUrls.length > 0 && (
                    <MediaGallery media={mediaUrls} compact={true} className="mt-2.5" />
                )}

                {/* Trích dẫn bài viết gốc (Quote post) nếu có */}
                {isQuote && (
                    <div className="mt-2.5 p-3 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-neutral-900 dark:text-white mb-1">
                            <span>
                                @{post.original_post?.user?.username ||
                                    post.original_post?.user?.name ||
                                    "user"}
                            </span>
                        </div>
                        {post.original_post?.content && (
                            <p className="text-neutral-700 dark:text-neutral-300 leading-normal whitespace-pre-line wrap-break-word [word-break:break-word] max-w-full">
                                {post.original_post.content}
                            </p>
                        )}
                        {(Array.isArray(post.original_post?.media_urls) ||
                            Array.isArray(post.original_post?.images)) && (
                            <MediaGallery
                                media={
                                    post.original_post?.media_urls ||
                                    post.original_post?.images
                                }
                                compact={true}
                                className="mt-2"
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReplyParentPost;
