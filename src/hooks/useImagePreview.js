import { useContext } from "react";
import { ImagePreviewContext } from "@/contexts/ImagePreviewContext";

/**
 * useImagePreview
 * Custom hook truy cập context xem trước hình ảnh toàn màn hình chuẩn Threads:
 * - Cung cấp hàm `openPreview(images, initialIndex, options)`
 * - Cung cấp hàm `closePreview()`
 * - Cung cấp trạng thái `isOpen`, `images`, `currentIndex`
 */
export const useImagePreview = () => {
    const context = useContext(ImagePreviewContext);
    if (!context) {
        return {
            openPreview: () => {},
            closePreview: () => {},
            isOpen: false,
            images: [],
            currentIndex: 0,
        };
    }
    return context;
};

export default useImagePreview;
