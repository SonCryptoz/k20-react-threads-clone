import { BadgeCheck, User as UserIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatTimeAgo } from "@/utils/formatTime";
import MediaGallery from "@/components/common/MediaGallery";

/**
 * QuotedPostPreview
 * Khung hiển thị nội dung bài viết gốc được trích dẫn bên trong QuoteModal:
 * - Avatar nhỏ, tên tác giả, tick xanh verified, thời gian tạo bài
 * - Nội dung text của bài viết gốc
 * - Preview ảnh/media nếu bài viết gốc có đính kèm (MediaGallery hỗ trợ đầy đủ nhiều ảnh)
 */
const QuotedPostPreview = ({ post }) => {
    const { t, i18n } = useTranslation();

    if (!post) return null;

    const author = post.user || {};
    const language = i18n.resolvedLanguage || i18n.language || "vi";
    const dateLocale = language.startsWith("en") ? "en-US" : "vi-VN";
    const formattedTime = formatTimeAgo(post.created_at, t, dateLocale);
    const mediaUrls = Array.isArray(post.media_urls)
        ? post.media_urls
        : Array.isArray(post.images)
          ? post.images
          : Array.isArray(post.media)
            ? post.media
            : [];

    return (
        <div className="w-full mt-3 p-3.5 rounded-[18px] border border-neutral-200/80 dark:border-neutral-700/80 bg-neutral-50/60 dark:bg-neutral-900/60 text-xs select-none">
            {/* Header: Avatar, Username, Tick xanh & Thời gian */}
            <div className="flex items-center gap-2 mb-1.5">
                <div className="w-5 h-5 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 shrink-0 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-center">
                    {author.avatar_url ? (
                        <img
                            src={author.avatar_url}
                            alt={author.username || "avatar"}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <UserIcon className="w-3 h-3 text-neutral-400" />
                    )}
                </div>
                <span className="font-semibold text-neutral-950 dark:text-white truncate">
                    {author.username || author.name || "user"}
                </span>
                {author.verified && (
                    <BadgeCheck className="w-3.5 h-3.5 text-sky-500 fill-sky-500/20 shrink-0" />
                )}
                <span className="text-neutral-400 dark:text-neutral-500 shrink-0 ml-auto">
                    {formattedTime}
                </span>
            </div>

            {/* Nội dung text của bài viết được trích dẫn */}
            {post.content && (
                <p className="text-neutral-800 dark:text-neutral-200 text-sm leading-relaxed whitespace-pre-line wrap-break-word [word-break:break-word] max-w-full">
                    {post.content}
                </p>
            )}

            {/* Hiển thị đầy đủ danh sách ảnh/media đính kèm (hỗ trợ nhiều ảnh qua MediaGallery) */}
            {mediaUrls.length > 0 && (
                <MediaGallery media={mediaUrls} compact={true} className="mt-2.5" />
            )}
        </div>
    );
};

export default QuotedPostPreview;
