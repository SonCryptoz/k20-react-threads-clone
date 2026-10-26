import {
    X,
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Download,
    ExternalLink,
    Loader2,
    ImageOff,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import useImagePreviewModal from "./hooks/useImagePreviewModal";

/**
 * ImagePreviewModal
 * Component Modal xem trước ảnh toàn màn hình chuẩn Threads:
 * - Hỗ trợ cả 1 ảnh lẫn nhiều ảnh (Gallery / Carousel)
 * - Điều hướng: Nút Mũi tên Previous / Next, Bàn phím (ArrowLeft/ArrowRight/Esc), Vuốt chạm trên điện thoại (Swipe)
 * - Tương tác phóng to / thu nhỏ: Nút Zoom, phím tắt (+/-), Double click / Double tap, Kéo thả (Pan) khi phóng to
 * - Cử chỉ vuốt xuống (Swipe down) trên mobile để đóng modal như Threads native
 * - Tải ảnh (Download) và Mở ảnh gốc trong tab mới (ExternalLink)
 * - Responsive 100% trên mọi kích thước màn hình (Mobile, Tablet, Desktop)
 */
const ImagePreviewModal = ({
    isOpen = false,
    onClose,
    images = [],
    initialIndex = 0,
    author,
}) => {
    const { t } = useTranslation();
    const {
        normalizedImages,
        currentIndex,
        currentImage,
        totalImages,
        scale,
        position,
        isDragging,
        isLoading,
        setIsLoading,
        hasError,
        setHasError,
        isDownloading,
        swipeOffsetY,
        handleNext,
        handlePrev,
        handleSelectIndex,
        handleZoomIn,
        handleZoomOut,
        handleToggleZoom,
        resetZoom,
        handleDownload,
        handleOpenOriginal,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
    } = useImagePreviewModal({
        isOpen,
        onClose,
        images,
        initialIndex,
    });

    if (!isOpen || normalizedImages.length === 0) return null;

    const hasMultiple = totalImages > 1;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
            className="fixed inset-0 z-9999 flex flex-col bg-black/95 md:bg-black/92 backdrop-blur-md select-none overscroll-contain transition-opacity duration-200 animate-in fade-in"
            onClick={(e) => {
                // Đóng modal khi bấm vào vùng nền đen trống ngoài ảnh
                if (e.target === e.currentTarget && scale === 1) {
                    onClose?.();
                }
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            {/* 1. THANH ĐIỀU KHIỂN TRÊN CÙNG (TOP HEADER BAR) */}
            <header
                className="relative z-30 w-full px-3 md:px-6 py-2.5 md:py-3.5 flex items-center justify-between gap-3 text-white bg-linear-to-b from-black/80 via-black/40 to-transparent pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Góc trái: Nút Đóng (Mobile/Desktop) + Bộ đếm ảnh (Counter) */}
                <div className="flex items-center gap-2 md:gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        title={t("image_preview.close", "Đóng (Esc)")}
                        aria-label="Close image preview"
                        className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-neutral-900/70 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-700/50 backdrop-blur-xs transition-colors cursor-pointer active:scale-95"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Bộ đếm ảnh ví dụ: 1 / 4 (chỉ hiển thị khi có từ 2 ảnh trở lên) */}
                    {hasMultiple && (
                        <div className="px-3 py-1 rounded-full bg-neutral-900/80 border border-neutral-700/60 text-xs md:text-sm font-semibold tracking-wide text-neutral-200 backdrop-blur-xs">
                            {currentIndex + 1} / {totalImages}
                        </div>
                    )}

                    {/* Tên tác giả nếu được truyền vào */}
                    {author?.username && (
                        <span className="hidden sm:inline-block text-xs md:text-sm text-neutral-300 font-medium truncate max-w-40 md:max-w-64">
                            @{author.username}
                        </span>
                    )}
                </div>

                {/* Góc phải: Cụm công cụ Zoom, Reset, Mở tab mới, Tải ảnh */}
                <div className="flex items-center gap-1 sm:gap-2">
                    {/* Nút Thu nhỏ */}
                    <button
                        type="button"
                        onClick={handleZoomOut}
                        disabled={scale <= 1}
                        title={t("image_preview.zoom_out", "Thu nhỏ (-)")}
                        aria-label="Zoom out"
                        className="w-8 h-8 md:w-9 md:h-9 rounded-full hidden xs:flex items-center justify-center bg-neutral-900/70 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-700/50 backdrop-blur-xs transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none active:scale-95"
                    >
                        <ZoomOut className="w-4 h-4" />
                    </button>

                    {/* Hiển thị tỷ lệ phần trăm phóng to (Click để khôi phục về 100%) */}
                    {scale > 1 && (
                        <button
                            type="button"
                            onClick={resetZoom}
                            title={t("image_preview.reset_zoom", "Khôi phục kích thước ban đầu (0)")}
                            aria-label="Reset zoom"
                            className="px-2.5 py-1 rounded-full flex items-center gap-1 bg-neutral-800/90 hover:bg-neutral-700 text-white border border-neutral-600/60 text-xs font-semibold backdrop-blur-xs transition-colors cursor-pointer active:scale-95"
                        >
                            <RotateCcw className="w-3 h-3" />
                            <span>{Math.round(scale * 100)}%</span>
                        </button>
                    )}

                    {/* Nút Phóng to */}
                    <button
                        type="button"
                        onClick={handleZoomIn}
                        disabled={scale >= 3}
                        title={t("image_preview.zoom_in", "Phóng to (+)")}
                        aria-label="Zoom in"
                        className="w-8 h-8 md:w-9 md:h-9 rounded-full hidden xs:flex items-center justify-center bg-neutral-900/70 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-700/50 backdrop-blur-xs transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none active:scale-95"
                    >
                        <ZoomIn className="w-4 h-4" />
                    </button>

                    {/* Nút Tải ảnh về máy */}
                    <button
                        type="button"
                        onClick={handleDownload}
                        disabled={isDownloading}
                        title={t("image_preview.download", "Tải ảnh về máy")}
                        aria-label="Download image"
                        className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-neutral-900/70 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-700/50 backdrop-blur-xs transition-colors cursor-pointer active:scale-95"
                    >
                        {isDownloading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-neutral-300" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                    </button>

                    {/* Nút Mở ảnh trong tab mới */}
                    <button
                        type="button"
                        onClick={handleOpenOriginal}
                        title={t("image_preview.open_original", "Mở ảnh gốc trong tab mới")}
                        aria-label="Open original image"
                        className="w-9 h-9 md:w-10 md:h-10 rounded-full hidden sm:flex items-center justify-center bg-neutral-900/70 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-700/50 backdrop-blur-xs transition-colors cursor-pointer active:scale-95"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* 2. KHU VỰC CHÍNH HIỂN THỊ HÌNH ẢNH (VIEWPORT CONTAINER) */}
            <main
                className="relative flex-1 flex items-center justify-center min-h-0 min-w-0 w-full overflow-hidden p-2 sm:p-4 md:p-6"
                onClick={(e) => {
                    // Nếu click vào vùng đệm quanh ảnh khi không zoom -> đóng modal
                    if (e.target === e.currentTarget && scale === 1) {
                        onClose?.();
                    }
                }}
            >
                {/* Nút chuyển ảnh trước (Previous Button) */}
                {hasMultiple && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePrev();
                        }}
                        disabled={currentIndex === 0}
                        title={t("image_preview.prev", "Ảnh trước (Mũi tên trái)")}
                        aria-label="Previous image"
                        className="absolute left-2 sm:left-4 md:left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-neutral-900/75 hover:bg-neutral-800 text-white border border-neutral-700/60 shadow-xl backdrop-blur-sm transition-all duration-150 cursor-pointer disabled:opacity-20 disabled:pointer-events-none hover:scale-105 active:scale-95"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                )}

                {/* Vùng chứa ảnh với Transform Pan / Zoom / Swipe Offset */}
                <div
                    className="relative flex items-center justify-center max-w-full max-h-full"
                    style={{
                        transform: `translate(${position.x}px, ${position.y + swipeOffsetY}px) scale(${scale})`,
                        opacity:
                            swipeOffsetY > 0
                                ? Math.max(0.3, 1 - swipeOffsetY / 320)
                                : 1,
                        transition: isDragging
                            ? "none"
                            : "transform 180ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms ease-out",
                    }}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleToggleZoom();
                    }}
                >
                    {/* Hiệu ứng xoay tròn Loading khi ảnh đang tải */}
                    {isLoading && !hasError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-neutral-400">
                            <Loader2 className="w-8 h-8 animate-spin text-white" />
                        </div>
                    )}

                    {/* Hiển thị lỗi nếu không tải được ảnh */}
                    {hasError ? (
                        <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-neutral-900/80 border border-neutral-800 text-neutral-400 text-center gap-3">
                            <ImageOff className="w-10 h-10 text-neutral-500" />
                            <p className="text-sm font-medium">
                                {t("image_preview.load_error", "Không thể hiển thị hình ảnh")}
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setHasError(false);
                                    setIsLoading(true);
                                }}
                                className="px-4 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                            >
                                {t("image_preview.retry", "Thử lại")}
                            </button>
                        </div>
                    ) : (
                        <img
                            key={currentImage}
                            src={currentImage}
                            alt={`Preview ${currentIndex + 1}`}
                            draggable={false}
                            onLoad={() => setIsLoading(false)}
                            onError={() => {
                                setIsLoading(false);
                                setHasError(true);
                            }}
                            className={`max-h-[82vh] md:max-h-[86vh] max-w-[95vw] md:max-w-[90vw] w-auto h-auto object-contain select-none rounded-md shadow-2xl transition-opacity duration-200 ${
                                isLoading ? "opacity-0" : "opacity-100"
                            } ${
                                scale > 1
                                    ? isDragging
                                        ? "cursor-grabbing"
                                        : "cursor-grab"
                                    : "cursor-zoom-in"
                            }`}
                        />
                    )}
                </div>

                {/* Nút chuyển ảnh tiếp theo (Next Button) */}
                {hasMultiple && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleNext();
                        }}
                        disabled={currentIndex === totalImages - 1}
                        title={t("image_preview.next", "Ảnh kế tiếp (Mũi tên phải)")}
                        aria-label="Next image"
                        className="absolute right-2 sm:right-4 md:right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-neutral-900/75 hover:bg-neutral-800 text-white border border-neutral-700/60 shadow-xl backdrop-blur-sm transition-all duration-150 cursor-pointer disabled:opacity-20 disabled:pointer-events-none hover:scale-105 active:scale-95"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                )}
            </main>

            {/* 3. THANH DANH SÁCH ẢNH THU NHỎ DƯỚI CÙNG (BOTTOM THUMBNAILS CAROUSEL) */}
            {hasMultiple && (
                <footer
                    className="relative z-30 w-full px-4 py-2.5 md:py-3.5 flex items-center justify-center bg-linear-to-t from-black/80 via-black/40 to-transparent pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center gap-2 max-w-full overflow-x-auto py-1 px-2 no-scrollbar">
                        {normalizedImages.map((imgUrl, idx) => {
                            const isActive = idx === currentIndex;
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleSelectIndex(idx)}
                                    title={`Xem ảnh ${idx + 1}`}
                                    aria-label={`Jump to image ${idx + 1}`}
                                    className={`relative shrink-0 rounded-lg overflow-hidden transition-all duration-150 cursor-pointer ${
                                        isActive
                                            ? "w-11 h-11 md:w-13 md:h-13 ring-2 ring-white scale-105 opacity-100 shadow-md"
                                            : "w-9 h-9 md:w-11 md:h-11 opacity-45 hover:opacity-85 border border-neutral-700/70"
                                    }`}
                                >
                                    <img
                                        src={imgUrl}
                                        alt={`Thumbnail ${idx + 1}`}
                                        className="w-full h-full object-cover select-none"
                                        loading="lazy"
                                    />
                                </button>
                            );
                        })}
                    </div>
                </footer>
            )}
        </div>
    );
};

export default ImagePreviewModal;
