import { Check } from "lucide-react";
import useEmbedModal from "./hooks/useEmbedModal";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";

/**
 * EmbedModal
 * Modal lấy mã nhúng bài viết (Get embed code):
 * - Preview bài viết nhúng thông qua iframe trỏ đến /:username/post/:postId/embed
 * - Thanh hiển thị chuỗi mã nhúng iframe kèm nút "Sao chép" (Copy)
 * - Tự động đồng bộ giao diện theo theme sáng/tối
 * - Khóa cuộn trang nền ngoài khi modal đang mở
 */
const EmbedModal = ({ isOpen, onClose, post }) => {
    // Khóa cuộn trang nền ngoài khi EmbedModal đang mở
    useLockBodyScroll(isOpen);

    const { embedUrl, embedCode, iframeHeight, isCopied, handleCopyCode, t } =
        useEmbedModal({ isOpen, onClose, post });

    if (!isOpen || !post) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs overscroll-contain transition-opacity duration-200 animate-in fade-in"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose?.();
                }
            }}
        >
            <div
                className="w-full max-w-135 flex flex-col gap-4 rounded-[26px] md:rounded-[30px] border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-[#181818] p-5 md:p-6 shadow-2xl text-neutral-900 dark:text-neutral-100 select-none transition-colors"
                onClick={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
            >
                {/* 1. KHUNG PREVIEW BÀI VIẾT BẰNG IFRAME */}
                <div className="w-full rounded-[22px] overflow-hidden flex items-center justify-center">
                    <iframe
                        src={embedUrl}
                        title="Embed Post Preview"
                        style={{ height: `${iframeHeight}px` }}
                        className="w-full bg-transparent transition-[height] duration-150 border-0 block"
                    />
                </div>

                {/* 2. THANH HIỂN THỊ MÃ NHÚNG VÀ NÚT SAO CHÉP */}
                <div className="w-full rounded-[20px] bg-neutral-100 dark:bg-[#121212] border border-neutral-200/90 dark:border-neutral-800 p-1.5 pl-4 flex items-center justify-between gap-3 text-sm">
                    {/* Chuỗi mã iframe */}
                    <div
                        className="font-mono text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 truncate select-all cursor-text min-w-0"
                        title={embedCode}
                    >
                        {embedCode}
                    </div>

                    {/* Nút Sao chép */}
                    <button
                        type="button"
                        onClick={handleCopyCode}
                        className="px-5 py-2.5 rounded-full bg-neutral-950 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 font-semibold text-sm shrink-0 cursor-pointer transition-colors shadow-sm flex items-center gap-1.5 active:scale-95"
                    >
                        {isCopied && <Check size={15} strokeWidth={2.5} />}
                        <span>{t("post.copy_embed_code", "Sao chép")}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmbedModal;
