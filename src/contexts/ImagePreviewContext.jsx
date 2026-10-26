import { createContext, useState, useCallback } from "react";
import ImagePreviewModal from "@/components/modals/ImagePreviewModal";

// eslint-disable-next-line react-refresh/only-export-components
export const ImagePreviewContext = createContext(null);

/**
 * ImagePreviewProvider
 * Context Provider cung cấp khả năng mở Modal xem trước ảnh toàn màn hình chuẩn Threads
 * từ bất kỳ component nào trong toàn bộ ứng dụng mà không cần truyền props lồng nhau.
 */
export const ImagePreviewProvider = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [images, setImages] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [extraInfo, setExtraInfo] = useState({});

    const openPreview = useCallback((imgs, initialIndex = 0, options = {}) => {
        const rawList = Array.isArray(imgs) ? imgs : [imgs];
        const normalized = rawList
            .map((item) => (typeof item === "string" ? item : item?.url || item?.preview_url || ""))
            .filter(Boolean);

        if (normalized.length === 0) return;

        setImages(normalized);
        setCurrentIndex(Math.max(0, Math.min(initialIndex, normalized.length - 1)));
        setExtraInfo(options || {});
        setIsOpen(true);
    }, []);

    const closePreview = useCallback(() => {
        setIsOpen(false);
    }, []);

    return (
        <ImagePreviewContext.Provider
            value={{
                openPreview,
                closePreview,
                isOpen,
                images,
                currentIndex,
            }}
        >
            {children}
            {isOpen && (
                <ImagePreviewModal
                    isOpen={isOpen}
                    onClose={closePreview}
                    images={images}
                    initialIndex={currentIndex}
                    author={extraInfo?.author}
                />
            )}
        </ImagePreviewContext.Provider>
    );
};

export default ImagePreviewProvider;
