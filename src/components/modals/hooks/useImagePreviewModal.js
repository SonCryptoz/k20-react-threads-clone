import { useState, useCallback, useRef, useEffect } from "react";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";

/**
 * useImagePreviewModal
 * Custom hook quản lý logic hiển thị, điều hướng, phóng to/thu nhỏ, kéo thả và cử chỉ vuốt
 * cho modal xem trước hình ảnh chuẩn Threads.
 */
export const useImagePreviewModal = ({
    isOpen = false,
    onClose,
    images = [],
    initialIndex = 0,
}) => {
    // Khóa cuộn trang nền an toàn khi modal đang mở
    useLockBodyScroll(isOpen);

    // Chuẩn hóa danh sách URL ảnh (hỗ trợ cả mảng string lẫn object chứa url/preview_url)
    const normalizedImages = (Array.isArray(images) ? images : [images])
        .map((img) => (typeof img === "string" ? img : img?.url || img?.preview_url || ""))
        .filter(Boolean);

    const [currentIndex, setCurrentIndex] = useState(() =>
        Math.max(0, Math.min(initialIndex, Math.max(0, normalizedImages.length - 1)))
    );
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [swipeOffsetY, setSwipeOffsetY] = useState(0);

    // Đồng bộ trạng thái khi modal mở lại hoặc initialIndex thay đổi (Pattern chuẩn React tránh effect cascading render)
    const [prevInitialIndex, setPrevInitialIndex] = useState(initialIndex);
    const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

    if (isOpen !== prevIsOpen || initialIndex !== prevInitialIndex) {
        setPrevIsOpen(isOpen);
        setPrevInitialIndex(initialIndex);
        if (isOpen) {
            const validIndex = Math.max(
                0,
                Math.min(initialIndex, Math.max(0, normalizedImages.length - 1))
            );
            setCurrentIndex(validIndex);
            setScale(1);
            setPosition({ x: 0, y: 0 });
            setIsLoading(true);
            setHasError(false);
            setSwipeOffsetY(0);
        }
    }

    const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
    const isSwipingDownRef = useRef(false);

    // Reset zoom & vị trí khi đổi ảnh
    const resetZoom = useCallback(() => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    }, []);

    const handleNext = useCallback(() => {
        if (currentIndex < normalizedImages.length - 1) {
            setCurrentIndex((prev) => prev + 1);
            resetZoom();
            setIsLoading(true);
            setHasError(false);
        }
    }, [currentIndex, normalizedImages.length, resetZoom]);

    const handlePrev = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
            resetZoom();
            setIsLoading(true);
            setHasError(false);
        }
    }, [currentIndex, resetZoom]);

    const handleSelectIndex = useCallback(
        (index) => {
            if (index >= 0 && index < normalizedImages.length && index !== currentIndex) {
                setCurrentIndex(index);
                resetZoom();
                setIsLoading(true);
                setHasError(false);
            }
        },
        [currentIndex, normalizedImages.length, resetZoom]
    );

    // Phóng to / Thu nhỏ
    const handleZoomIn = useCallback(() => {
        setScale((prev) => Math.min(Number((prev + 0.5).toFixed(1)), 3));
    }, []);

    const handleZoomOut = useCallback(() => {
        setScale((prev) => {
            const next = Math.max(Number((prev - 0.5).toFixed(1)), 1);
            if (next === 1) {
                setPosition({ x: 0, y: 0 });
            }
            return next;
        });
    }, []);

    const handleToggleZoom = useCallback(() => {
        if (scale > 1) {
            resetZoom();
        } else {
            setScale(2);
        }
    }, [scale, resetZoom]);

    // Tải ảnh về thiết bị
    const handleDownload = useCallback(async () => {
        const currentUrl = normalizedImages[currentIndex];
        if (!currentUrl || isDownloading) return;

        setIsDownloading(true);
        try {
            const response = await fetch(currentUrl, { mode: "cors" });
            if (!response.ok) throw new Error("Network response was not ok");
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = blobUrl;
            const urlParts = currentUrl.split("/").pop()?.split("?")[0];
            const filename = urlParts && urlParts.includes(".") ? urlParts : `threads-image-${Date.now()}.jpg`;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
        } catch {
            // Nếu chặn CORS từ server bên ngoài, mở trực tiếp trong tab mới
            window.open(currentUrl, "_blank", "noopener,noreferrer");
        } finally {
            setIsDownloading(false);
        }
    }, [currentIndex, isDownloading, normalizedImages]);

    // Mở ảnh gốc trong tab mới
    const handleOpenOriginal = useCallback(() => {
        const currentUrl = normalizedImages[currentIndex];
        if (currentUrl) {
            window.open(currentUrl, "_blank", "noopener,noreferrer");
        }
    }, [currentIndex, normalizedImages]);

    // Xử lý kéo thả (Pan) khi ảnh đang phóng to (scale > 1)
    const handleMouseDown = useCallback(
        (e) => {
            if (scale > 1) {
                e.preventDefault();
                setIsDragging(true);
                setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
            }
        },
        [scale, position]
    );

    const handleMouseMove = useCallback(
        (e) => {
            if (!isDragging || scale <= 1) return;
            e.preventDefault();
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y,
            });
        },
        [isDragging, scale, dragStart]
    );

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Xử lý cử chỉ cảm ứng trên điện thoại (Swipe left/right, Swipe down to close, Pan when zoomed)
    const handleTouchStart = useCallback(
        (e) => {
            const touch = e.touches[0];
            touchStartRef.current = {
                x: touch.clientX,
                y: touch.clientY,
                time: Date.now(),
            };
            isSwipingDownRef.current = false;

            if (scale > 1) {
                setIsDragging(true);
                setDragStart({
                    x: touch.clientX - position.x,
                    y: touch.clientY - position.y,
                });
            }
        },
        [scale, position]
    );

    const handleTouchMove = useCallback(
        (e) => {
            const touch = e.touches[0];
            if (scale > 1) {
                if (!isDragging) return;
                setPosition({
                    x: touch.clientX - dragStart.x,
                    y: touch.clientY - dragStart.y,
                });
            } else {
                const deltaY = touch.clientY - touchStartRef.current.y;
                const deltaX = touch.clientX - touchStartRef.current.x;

                // Nếu kéo dọc nhiều hơn kéo ngang và đang kéo xuống
                if (deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
                    isSwipingDownRef.current = true;
                    setSwipeOffsetY(deltaY);
                }
            }
        },
        [scale, isDragging, dragStart]
    );

    const handleTouchEnd = useCallback(
        (e) => {
            if (scale > 1) {
                setIsDragging(false);
                return;
            }

            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - touchStartRef.current.x;
            const deltaY = touch.clientY - touchStartRef.current.y;
            const deltaTime = Date.now() - touchStartRef.current.time;

            // Nếu vuốt xuống đủ khoảng cách hoặc vận tốc nhanh -> đóng modal
            if (isSwipingDownRef.current) {
                if (deltaY > 120 || (deltaY > 60 && deltaTime < 250)) {
                    onClose?.();
                    return;
                }
                setSwipeOffsetY(0);
                isSwipingDownRef.current = false;
                return;
            }

            // Vuốt ngang chuyển ảnh
            const minSwipeDistance = 45;
            if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaY) < 80) {
                if (deltaX < 0) {
                    handleNext();
                } else {
                    handlePrev();
                }
            }
        },
        [scale, onClose, handleNext, handlePrev]
    );

    // Lắng nghe phím tắt điều khiển bàn phím (Desktop UX)
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (
                e.target.tagName === "INPUT" ||
                e.target.tagName === "TEXTAREA" ||
                e.target.isContentEditable
            ) {
                return;
            }

            switch (e.key) {
                case "Escape":
                    e.preventDefault();
                    onClose?.();
                    break;
                case "ArrowLeft":
                    e.preventDefault();
                    handlePrev();
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    handleNext();
                    break;
                case "+":
                case "=":
                    e.preventDefault();
                    handleZoomIn();
                    break;
                case "-":
                case "_":
                    e.preventDefault();
                    handleZoomOut();
                    break;
                case "0":
                    e.preventDefault();
                    resetZoom();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose, handlePrev, handleNext, handleZoomIn, handleZoomOut, resetZoom]);

    return {
        normalizedImages,
        currentIndex,
        currentImage: normalizedImages[currentIndex] || "",
        totalImages: normalizedImages.length,
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
    };
};

export default useImagePreviewModal;
