import {
    Heart,
    MessageCircle,
    Repeat,
    Send,
    Download,
    Check,
    Loader2,
    Pencil,
    User as UserIcon,
} from "lucide-react";
import useCopyImageModal from "./hooks/useCopyImageModal";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import MediaGallery from "@/components/common/MediaGallery";

// SVG chính thức logo Threads
const ThreadsLogo = ({ className = "w-5 h-5" }) => (
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
 * CopyImageModal
 * Modal chụp ảnh bài viết (Copy / Download as image):
 * - Toàn bộ logic xuất ảnh, xử lý theme và sự kiện phím được tách vào `useCopyImageModal`
 * - Giao diện thuần túy render khung xem trước (Card preview) và các thanh điều khiển
 */
const CopyImageModal = ({ isOpen, onClose, post }) => {
    // Khóa cuộn trang nền ngoài khi modal đang mở
    useLockBodyScroll(isOpen);

    const {
        cardRef,
        colorTheme,
        setColorTheme,
        showStats,
        setShowStats,
        isDownloading,
        isCopying,
        isExporting,
        handleDownload,
        handleCopy,
        user,
        authorUsername,
        formattedTime,
        mediaUrls,
        isQuote,
        displayPost,
        t,
    } = useCopyImageModal({ isOpen, onClose, post });

    if (!isOpen || !post) return null;

    const activePost = displayPost || post;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs overscroll-contain transition-opacity duration-200 animate-in fade-in"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isExporting) {
                    onClose?.();
                }
            }}
        >
            <div
                className="w-full max-w-135 flex flex-col gap-4 rounded-[26px] md:rounded-[30px] border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-[#181818] p-5 md:p-6 shadow-2xl text-neutral-900 dark:text-neutral-100 select-none transition-colors"
                onClick={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
            >
                {/* 1. KHUNG THẺ BÀI VIẾT ĐƯỢC CHỤP HÌNH (CARD PREVIEW) */}
                <div
                    ref={cardRef}
                    className={`w-full rounded-[22px] p-5 transition-colors duration-150 border ${
                        colorTheme === "dark"
                            ? "bg-[#0c0c0c] text-white border-neutral-800/80 shadow-md"
                            : "bg-white text-neutral-950 border-neutral-200 shadow-md"
                    }`}
                >
                    {/* Hàng Header thẻ bài viết */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            {/* Avatar tác giả */}
                            <div
                                className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 border ${
                                    colorTheme === "dark"
                                        ? "bg-neutral-800 border-neutral-700/60"
                                        : "bg-neutral-200 border-neutral-300/60"
                                }`}
                            >
                                {user.avatar_url ? (
                                    <img
                                        src={user.avatar_url}
                                        alt={authorUsername}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <UserIcon
                                        className={`w-5 h-5 ${
                                            colorTheme === "dark" ? "text-neutral-500" : "text-neutral-400"
                                        }`}
                                    />
                                )}
                            </div>

                            {/* Tên & Chủ đề & Thời gian */}
                            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                <span
                                    className={`font-bold text-sm truncate ${
                                        colorTheme === "dark" ? "text-white" : "text-neutral-950"
                                    }`}
                                >
                                    {authorUsername}
                                </span>

                                {activePost.topic_name && (
                                    <>
                                        <span
                                            className={`text-xs ${
                                                colorTheme === "dark" ? "text-neutral-400" : "text-neutral-500"
                                            }`}
                                        >
                                            ›
                                        </span>
                                        <span
                                            className={`font-semibold text-sm truncate ${
                                                colorTheme === "dark" ? "text-white" : "text-neutral-950"
                                            }`}
                                        >
                                            {activePost.topic_name}
                                        </span>
                                    </>
                                )}

                                <span
                                    className={`text-xs shrink-0 ${
                                        colorTheme === "dark" ? "text-neutral-400" : "text-neutral-500"
                                    }`}
                                >
                                    {formattedTime}
                                </span>
                            </div>
                        </div>

                        {/* Icon bút chì góc trên bên phải */}
                        <Pencil
                            size={15}
                            className={`shrink-0 ${
                                colorTheme === "dark" ? "text-neutral-500" : "text-neutral-400"
                            }`}
                        />
                    </div>

                    {/* Nội dung bài viết */}
                    {activePost.content && (
                        <div
                            className={`mt-3.5 text-sm leading-relaxed whitespace-pre-line wrap-break-word [word-break:break-word] font-normal ${
                                colorTheme === "dark" ? "text-neutral-100" : "text-neutral-900"
                            }`}
                        >
                            {activePost.content}
                        </div>
                    )}

                    {/* Hình ảnh đính kèm nếu có */}
                    {mediaUrls.length > 0 && (
                        <MediaGallery
                            media={mediaUrls}
                            crossOrigin="anonymous"
                            className="mt-3.5"
                        />
                    )}

                    {/* Trích dẫn bài viết gốc nếu là quote post */}
                    {isQuote && (
                        <div
                            className={`mt-3.5 p-3.5 rounded-2xl border text-xs ${
                                colorTheme === "dark"
                                    ? "border-neutral-800 bg-neutral-900/60 text-neutral-300"
                                    : "border-neutral-200 bg-neutral-50 text-neutral-700"
                            }`}
                        >
                            <div
                                className={`font-semibold mb-1 ${
                                    colorTheme === "dark" ? "text-white" : "text-neutral-950"
                                }`}
                            >
                                @{activePost.original_post?.user?.username || activePost.original_post?.user?.name || "user"}
                            </div>
                            <p className="text-neutral-700 dark:text-neutral-300 leading-normal whitespace-pre-line">
                                {activePost.original_post?.content}
                            </p>
                            {((Array.isArray(activePost.original_post?.media_urls) && activePost.original_post.media_urls.length > 0) ||
                                (Array.isArray(activePost.original_post?.images) && activePost.original_post.images.length > 0) ||
                                (Array.isArray(activePost.original_post?.media) && activePost.original_post.media.length > 0)) && (
                                <MediaGallery
                                    media={
                                        activePost.original_post?.media_urls ||
                                        activePost.original_post?.images ||
                                        activePost.original_post?.media
                                    }
                                    compact={true}
                                    crossOrigin="anonymous"
                                    className="mt-2.5"
                                />
                            )}
                        </div>
                    )}

                    {/* Hàng Footer thẻ bài viết: Số liệu & Logo Threads */}
                    <div className="mt-5 pt-1 flex items-center justify-between">
                        {/* Nhóm icon số liệu (ẩn / hiện theo toggle showStats) */}
                        {showStats ? (
                            <div
                                className={`flex items-center gap-4 text-xs font-semibold ${
                                    colorTheme === "dark" ? "text-neutral-400" : "text-neutral-500"
                                }`}
                            >
                                <span className="flex items-center gap-1.5">
                                    <Heart size={16} />
                                    <span>{activePost.likes_count || 0}</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <MessageCircle size={16} />
                                    <span>{activePost.replies_count || 0}</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Repeat size={16} />
                                    <span>{activePost.reposts_count || activePost.reposts_and_quotes_count || 0}</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Send size={15} />
                                    <span>{activePost.shares_count || 0}</span>
                                </span>
                            </div>
                        ) : (
                            <div />
                        )}

                        {/* Logo Threads */}
                        <ThreadsLogo
                            className={`w-5 h-5 shrink-0 ${
                                colorTheme === "dark" ? "text-white" : "text-neutral-950"
                            }`}
                        />
                    </div>
                </div>

                {/* 2. NÚT CHỌN MÀU THEME (WHITE / BLACK DOTS) */}
                <div className="flex items-center gap-2.5 pt-1">
                    {/* Nút màu trắng */}
                    <button
                        type="button"
                        onClick={() => setColorTheme("light")}
                        className={`w-6 h-6 rounded-full bg-white border border-neutral-300 transition-all cursor-pointer ${
                            colorTheme === "light"
                                ? "ring-2 ring-sky-500 ring-offset-2 ring-offset-white dark:ring-offset-[#181818]"
                                : "opacity-75 hover:opacity-100"
                        }`}
                        title="Light Theme"
                    />

                    {/* Nút màu đen */}
                    <button
                        type="button"
                        onClick={() => setColorTheme("dark")}
                        className={`w-6 h-6 rounded-full bg-black border border-neutral-700 transition-all cursor-pointer ${
                            colorTheme === "dark"
                                ? "ring-2 ring-sky-500 ring-offset-2 ring-offset-white dark:ring-offset-[#181818]"
                                : "opacity-75 hover:opacity-100"
                        }`}
                        title="Dark Theme"
                    />
                </div>

                {/* 3. FOOTER THANH ĐIỀU KHIỂN & NÚT THAO TÁC */}
                <div className="flex items-center justify-between pt-1">
                    {/* Toggle hiển thị số liệu */}
                    <button
                        type="button"
                        onClick={() => setShowStats((prev) => !prev)}
                        className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-white hover:opacity-85 transition-opacity cursor-pointer select-none"
                    >
                        <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                                showStats
                                    ? "bg-neutral-950 text-white dark:bg-white dark:text-black"
                                    : "border border-neutral-400 dark:border-neutral-500 text-transparent"
                            }`}
                        >
                            <Check size={13} strokeWidth={3} />
                        </span>
                        <span>{t("post.show_metrics")}</span>
                    </button>

                    {/* Bộ nút Tải về & Sao chép */}
                    <div className="flex items-center gap-2">
                        {/* Nút Tải ảnh */}
                        <button
                            type="button"
                            onClick={handleDownload}
                            disabled={isExporting}
                            className="w-10 h-10 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-300/80 text-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border-neutral-700 dark:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                            title={t("post.download")}
                        >
                            {isDownloading ? (
                                <Loader2 className="w-4 h-4 animate-spin text-neutral-800 dark:text-white" />
                            ) : (
                                <Download size={18} />
                            )}
                        </button>

                        {/* Nút Sao chép */}
                        <button
                            type="button"
                            onClick={handleCopy}
                            disabled={isExporting}
                            className="h-10 px-5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-950 font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isCopying ? (
                                <Loader2 className="w-4 h-4 animate-spin text-white dark:text-neutral-950" />
                            ) : (
                                t("post.copy_image_button")
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CopyImageModal;
