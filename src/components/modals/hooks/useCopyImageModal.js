import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toPng, toBlob } from "html-to-image";
import { toast } from "@/components/ui/toast";
import { formatTimeAgo } from "@/utils/formatTime";
import { useTheme } from "@/hooks/useTheme";

/**
 * useCopyImageModal
 * Custom hook quản lý logic xuất ảnh bài viết (Copy / Download as image):
 * - Tự động đồng bộ giao diện card theo theme hệ thống của ứng dụng khi mở modal
 * - Quản lý cấu hình giao diện card (Dark / Light theme, ẩn / hiện số liệu tương tác)
 * - Quản lý khóa cuộn trang và phím tắt ESC
 * - Định dạng dữ liệu hiển thị (thời gian, tác giả, media)
 * - Xử lý xuất ảnh qua html-to-image (Tải xuống file PNG hoặc sao chép thẳng vào clipboard)
 */
export const useCopyImageModal = ({ isOpen, onClose, post }) => {
    const { t, i18n } = useTranslation();
    const { theme } = useTheme();

    // Ref trỏ đến node DOM của thẻ card xem trước cần chụp hình (html-to-image target)
    const cardRef = useRef(null);

    // State chủ đề giao diện được chọn trong modal xem trước ('light' | 'dark' | null)
    const [selectedTheme, setSelectedTheme] = useState(null);
    // Lưu lại trạng thái isOpen trước đó để phát hiện khoảnh khắc modal vừa được mở
    const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

    // Đồng bộ theme card xem trước theo theme hệ thống của app ngay khi modal vừa mở
    if (isOpen !== prevIsOpen) {
        setPrevIsOpen(isOpen);
        if (isOpen) {
            setSelectedTheme(theme === "light" ? "light" : "dark");
        }
    }

    // Theme màu hiệu dụng áp dụng cho thẻ card xem trước (ưu tiên selectedTheme, fallback về theme app)
    const colorTheme = selectedTheme || (theme === "light" ? "light" : "dark");
    const setColorTheme = setSelectedTheme;

    // State tùy chọn hiển thị / ẩn thanh số liệu tương tác (likes, replies, reposts)
    const [showStats, setShowStats] = useState(true);

    // State cờ đang trong tiến trình xuất file ảnh PNG về máy
    const [isDownloading, setIsDownloading] = useState(false);
    // State cờ đang trong tiến trình sao chép ảnh vào Clipboard của hệ điều hành
    const [isCopying, setIsCopying] = useState(false);

    // Lắng nghe phím Escape (ESC) để đóng modal khi không bận xuất ảnh
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape" && isOpen && !isDownloading && !isCopying) {
                onClose?.();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, isDownloading, isCopying, onClose]);

    // Nhận diện bài viết đăng lại thuần túy (không phải trích dẫn quote)
    const isRepost = Boolean(!post?.is_quote && post?.original_post);
    // Bài viết hiển thị chính (nếu là bài repost thì lấy bài gốc original_post)
    const displayPost = isRepost ? post.original_post : post;
    // Thông tin tác giả của bài viết hiển thị
    const user = displayPost?.user || post?.user || {};
    // Username hiển thị của tác giả (không có tiền tố @)
    const authorUsername = user.username || user.name || "user";
    // Xác định locale hiển thị thời gian theo ngôn ngữ hiện tại của app
    const language = i18n.resolvedLanguage || i18n.language || "vi";
    const dateLocale = language.startsWith("en") ? "en-US" : "vi-VN";
    // Mốc thời gian tương đối đã được định dạng (vd: "2h", "3d")
    const formattedTime = formatTimeAgo(displayPost?.created_at || post?.created_at, t, dateLocale);
    // Danh sách các đường dẫn ảnh đính kèm trong bài viết
    const mediaUrls = Array.isArray(displayPost?.media_urls)
        ? displayPost.media_urls
        : Array.isArray(post?.media_urls)
          ? post.media_urls
          : [];
    // Cờ nhận diện bài viết có trích dẫn bài khác (Quote Post)
    const isQuote = Boolean(displayPost?.is_quote && displayPost?.original_post);

    // Hàm tải ảnh về thiết bị dạng file .png
    const handleDownload = useCallback(async () => {
        // 1. Kiểm tra DOM node và tránh gọi trùng lặp khi đang xử lý
        if (!cardRef.current || isDownloading || isCopying) return;
        setIsDownloading(true);

        try {
            // 2. Chờ toàn bộ phông chữ web được tải xong để render text sắc nét
            if (document.fonts) {
                await document.fonts.ready;
            }
            // 3. Render DOM node thành dữ liệu ảnh base64 PNG (độ phân giải x2 cho màn hình retina)
            const dataUrl = await toPng(cardRef.current, {
                quality: 0.95,
                pixelRatio: 2,
                cacheBust: true,
            });

            // 4. Tạo thẻ <a> ẩn để kích hoạt cơ chế tải file của trình duyệt
            const link = document.createElement("a");
            link.download = `threads-${authorUsername}-${post?.id || Date.now()}.png`;
            link.href = dataUrl;
            link.click();
            toast.success(t("post.image_downloaded"));
        } catch (err) {
            console.error("Download image error:", err);
            toast.error(t("post.image_export_failed"));
        } finally {
            // 5. Giải phóng cờ trạng thái tải xuống
            setIsDownloading(false);
        }
    }, [isDownloading, isCopying, authorUsername, post, t]);

    // Hàm sao chép ảnh trực tiếp vào Clipboard để dán (Ctrl+V) ngay lập tức
    const handleCopy = useCallback(async () => {
        // 1. Kiểm tra DOM node và tránh gọi trùng lặp khi đang xử lý
        if (!cardRef.current || isDownloading || isCopying) return;
        setIsCopying(true);

        try {
            // 2. Chờ tải xong phông chữ
            if (document.fonts) {
                await document.fonts.ready;
            }
            // 3. Render DOM node thành Blob nhị phân dạng image/png
            const blob = await toBlob(cardRef.current, {
                quality: 0.95,
                pixelRatio: 2,
                cacheBust: true,
            });

            if (!blob) throw new Error("Could not create image blob");

            // 4. Ghi trực tiếp Blob ảnh vào Clipboard (Hỗ trợ trình duyệt hiện đại qua Async Clipboard API)
            if (navigator.clipboard?.write && window.ClipboardItem) {
                await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
                toast.success(t("post.image_copied"));
            } else {
                // Fallback: nếu trình duyệt không hỗ trợ ghi blob ảnh -> tự động tải file xuống
                const dataUrl = await toPng(cardRef.current, {
                    quality: 0.95,
                    pixelRatio: 2,
                    cacheBust: true,
                });
                const link = document.createElement("a");
                link.download = `threads-${authorUsername}-${post?.id || Date.now()}.png`;
                link.href = dataUrl;
                link.click();
                toast.success(t("post.image_downloaded"));
            }
        } catch (err) {
            console.error("Copy image error:", err);
            toast.error(t("post.image_export_failed"));
        } finally {
            // 5. Giải phóng cờ trạng thái sao chép
            setIsCopying(false);
        }
    }, [isDownloading, isCopying, authorUsername, post, t]);

    // Cờ tổng hợp đang xuất ảnh (đang tải hoặc đang sao chép)
    const isExporting = isDownloading || isCopying;

    return {
        cardRef,
        colorTheme,
        setColorTheme,
        theme,
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
    };
};

export default useCopyImageModal;
