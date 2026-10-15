import {
    Heart,
    MessageCircle,
    Repeat,
    Send,
    User as UserIcon,
    BadgeCheck,
    Loader2,
} from "lucide-react";
import useEmbed from "./hooks/useEmbed";
import MediaGallery from "@/components/common/MediaGallery";

// Logo SVG chính thức của Threads
const ThreadsLogo = ({ className = "w-4 h-4" }) => (
    <svg
        viewBox="0 0 976.98 1082"
        fill="currentColor"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M770.347,500.347c-1.355-156.85-86.386-251.367-230.025-251.367-95.872,0-176.499,43.362-218.846,112.472l92.823,64.705c24.053-37.942,57.252-69.448,118.231-69.448,68.77,0,104.341,38.281,114.504,109.423-33.2-5.081-66.399-7.791-100.615-7.791-185.646,0-273.049,84.015-273.049,195.131,0,113.149,87.403,179.548,216.136,179.548,141.267,0,225.621-95.194,260.176-213.086,35.91,16.261,60.64,54.203,60.64,111.116,0,152.447-175.822,235.446-324.881,235.446-219.862,0-363.501-144.316-363.501-379.084,0-287.616,190.05-471.907,445.483-471.907,171.418,0,256.11,75.207,313.701,176.16l94.856-66.399C913.308,94.501,773.396,1,563.358,1,228.653,1,.999,238.478.999,583.008c0,315.057,222.911,497.992,488.507,497.992,219.523,0,441.418-128.055,441.418-347.24,0-114.504-65.721-190.389-160.577-233.413ZM485.441,718.854c-48.444,0-91.129-23.036-91.129-65.383,0-66.738,81.983-87.064,162.271-87.064,30.489,0,60.301,2.032,86.725,7.792-18.971,86.725-75.207,144.655-157.867,144.655Z" />
    </svg>
);

/**
 * EmbedPage
 * Route: /:username/post/:postId/embed
 * Trang phục vụ nhúng bài viết vào iframe
 */
const EmbedPage = () => {
    const {
        post,
        isLoading,
        error,
        user,
        authorUsername,
        postUrl,
        mediaUrls,
        formattedDate,
        isQuote,
        t,
    } = useEmbed();

    if (isLoading) {
        return (
            <div className="w-full flex items-center justify-center min-h-60 bg-white dark:bg-[#0c0c0c] rounded-[22px] border border-neutral-200 dark:border-neutral-800">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-400 dark:text-neutral-500" />
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="w-full p-6 text-center bg-white dark:bg-[#0c0c0c] rounded-[22px] border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 text-sm">
                <p className="mb-3">{error || t("post.post_not_found")}</p>
                <a
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
                >
                    <ThreadsLogo className="w-3.5 h-3.5" />
                    <span>Threads</span>
                </a>
            </div>
        );
    }

    return (
        <article className="w-full rounded-[22px] bg-white dark:bg-[#0c0c0c] text-neutral-950 dark:text-neutral-100 border border-neutral-200/90 dark:border-neutral-800/80 shadow-xs p-4 sm:p-5 flex flex-col select-none transition-colors">
                {/* 1. Header: Avatar, Username, Theo dõi & Nút Xem trên Threads */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        {/* Avatar */}
                        <a
                            href={`/${authorUsername}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-9 h-9 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-200 dark:border-neutral-700/60 hover:opacity-90 transition-opacity"
                        >
                            {user.avatar_url ? (
                                <img
                                    src={user.avatar_url}
                                    alt={authorUsername}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <UserIcon className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                            )}
                        </a>

                        {/* Tên & Link Theo dõi */}
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                            <a
                                href={`/${authorUsername}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-bold text-sm text-neutral-950 dark:text-white truncate hover:underline"
                            >
                                {authorUsername}
                            </a>
                            {user.verified && (
                                <BadgeCheck className="w-3.5 h-3.5 text-sky-500 fill-sky-500/20 shrink-0" />
                            )}
                            <span className="text-neutral-400 dark:text-neutral-500 text-xs">·</span>
                            <a
                                href={`/${authorUsername}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-sm text-neutral-950 dark:text-white hover:underline cursor-pointer"
                            >
                                {t("post.follow", "Theo dõi")}
                            </a>
                        </div>
                    </div>

                    {/* Nút Xem trên Threads */}
                    <a
                        href={postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200/90 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-900 dark:text-neutral-100 transition-colors shrink-0 cursor-pointer"
                    >
                        <span>{t("post.view_on_threads", "Xem trên Threads")}</span>
                        <ThreadsLogo className="w-3.5 h-3.5 text-neutral-950 dark:text-white" />
                    </a>
                </div>

                {/* 2. Nội dung text của bài viết */}
                {post.content && (
                    <div className="mt-3.5 text-sm leading-relaxed whitespace-pre-line wrap-break-word [word-break:break-word] font-normal text-neutral-900 dark:text-neutral-100">
                        {post.content}
                    </div>
                )}

                {/* 3. Media đính kèm (nếu có) */}
                {mediaUrls.length > 0 && (
                    <MediaGallery media={mediaUrls} className="mt-3.5" />
                )}

                {/* 4. Trích dẫn bài viết gốc (nếu là bài Quote) */}
                {isQuote && (
                    <div className="mt-3.5 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/60 text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-neutral-950 dark:text-white mb-1">
                            <span>
                                @{post.original_post?.user?.username ||
                                    post.original_post?.user?.name ||
                                    "user"}
                            </span>
                        </div>
                        {post.original_post?.content && (
                            <p className="text-neutral-700 dark:text-neutral-300 leading-normal whitespace-pre-line">
                                {post.original_post.content}
                            </p>
                        )}
                        {((Array.isArray(post.original_post?.media_urls) && post.original_post.media_urls.length > 0) ||
                            (Array.isArray(post.original_post?.images) && post.original_post.images.length > 0) ||
                            (Array.isArray(post.original_post?.media) && post.original_post.media.length > 0)) && (
                            <MediaGallery
                                media={
                                    post.original_post?.media_urls ||
                                    post.original_post?.images ||
                                    post.original_post?.media
                                }
                                compact={true}
                                className="mt-2"
                            />
                        )}
                    </div>
                )}

                {/* 5. Timestamp (Thời gian tạo bài) */}
                {formattedDate && (
                    <div className="mt-3.5 text-xs text-neutral-400 dark:text-neutral-500">
                        {formattedDate}
                    </div>
                )}

                {/* 6. Interaction bar: Các chỉ số tương tác */}
                <div className="mt-3 pt-1 flex items-center gap-4 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                    <span className="flex items-center gap-1.5">
                        <Heart size={16} />
                        <span>{post.likes_count || 0}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <MessageCircle size={16} />
                        <span>{post.replies_count || 0}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Repeat size={16} />
                        <span>{post.reposts_count || 0}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Send size={15} />
                        <span>{post.shares_count || 0}</span>
                    </span>
                </div>
            </article>
    );
};

export default EmbedPage;
