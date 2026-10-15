import { useState, useRef, useEffect } from "react";
import giphyService from "@/services/giphyService";

/**
 * useReplyMedia
 * Custom hook quản lý toàn bộ tệp đính kèm (ảnh/video tải lên và ảnh GIF từ GIPHY):
 * - Quản lý danh sách file đính kèm với trạng thái tải ngầm (isLoading)
 * - Tự động tạo và dọn dẹp (revoke) URL blob an toàn để tránh rò rỉ bộ nhớ
 * - Xử lý tải và chuyển đổi ảnh GIF thành File object dưới background
 * - Hỗ trợ AbortController: Hủy ngay request HTTP nếu người dùng bấm X xóa preview hoặc unmount
 * - Cung cấp danh sách readyFiles sẵn sàng để gửi FormData
 */
export const useReplyMedia = ({ onGifError, textareaRef } = {}) => {
    const [mediaItems, setMediaItems] = useState([]);
    const [isGifPickerOpen, setIsGifPickerOpen] = useState(false);

    const fileInputRef = useRef(null);
    const createdObjectUrlsRef = useRef(new Set());
    const abortControllersRef = useRef(new Map());

    // Các giá trị phái sinh tính toán sẵn
    const isAnyMediaLoading = mediaItems.some((item) => item.isLoading);
    const readyFiles = mediaItems.filter((item) => item.file && !item.isLoading).map((item) => item.file);

    // Dọn dẹp an toàn các Object URL blob và hủy mọi request tải GIF khi component unmount
    useEffect(() => {
        const createdUrls = createdObjectUrlsRef.current;
        const controllers = abortControllersRef.current;

        return () => {
            // Hủy toàn bộ request tải GIF đang chạy ngầm
            controllers.forEach((controller) => controller.abort());
            controllers.clear();

            // Thu hồi các Object URL blob
            createdUrls.forEach((url) => URL.revokeObjectURL(url));
            createdUrls.clear();
        };
    }, []);

    // Xử lý khi người dùng chọn ảnh / video từ thiết bị
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const newItems = files.map((file, idx) => {
            const url = URL.createObjectURL(file);
            createdObjectUrlsRef.current.add(url);
            return {
                id: `local-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
                url,
                file,
                isLoading: false,
                isLocal: true,
            };
        });

        setMediaItems((prev) => [...prev, ...newItems]);
        e.target.value = "";
    };

    // Xóa một thẻ media đã chọn (hỗ trợ xóa theo ID hoặc index)
    // Nếu item đang trong quá trình tải ngầm -> Hủy ngay request lập tức!
    const handleRemoveMedia = (targetId) => {
        setMediaItems((prev) => {
            const itemToRemove =
                typeof targetId === "string"
                    ? prev.find((item) => item.id === targetId)
                    : prev[targetId];

            if (itemToRemove) {
                // Hủy request tải GIF ngầm nếu đang chạy
                const controller = abortControllersRef.current.get(itemToRemove.id);
                if (controller) {
                    controller.abort();
                    abortControllersRef.current.delete(itemToRemove.id);
                }

                // Thu hồi blob URL nếu là file local
                if (itemToRemove.isLocal && itemToRemove.url) {
                    URL.revokeObjectURL(itemToRemove.url);
                    createdObjectUrlsRef.current.delete(itemToRemove.url);
                }
            }

            return typeof targetId === "string"
                ? prev.filter((item) => item.id !== targetId)
                : prev.filter((_, idx) => idx !== targetId);
        });
    };

    // Các hàm đóng / mở bảng chọn GIF
    const openGifPicker = () => setIsGifPickerOpen(true);
    const closeGifPicker = () => setIsGifPickerOpen(false);
    const toggleGifPicker = () => setIsGifPickerOpen((prev) => !prev);

    // Xử lý khi chọn một ảnh GIF từ GIPHY:
    // Đóng modal tức thì (0ms latency), thêm thẻ preview tạm với isLoading: true,
    // và tải chuyển đổi File ngầm ở background kèm AbortSignal để có thể hủy khi xóa
    const handleSelectGif = (selected) => {
        if (!selected) return;

        // 1. Đóng modal GIF và đưa con trỏ chuột quay lại textarea ngay lập tức
        setIsGifPickerOpen(false);
        textareaRef?.current?.focus();

        // Trường hợp nhận trực tiếp File (nếu có caller truyền File)
        if (selected instanceof File) {
            const url = URL.createObjectURL(selected);
            createdObjectUrlsRef.current.add(url);
            setMediaItems((prev) => [
                ...prev,
                {
                    id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    url,
                    file: selected,
                    isLoading: false,
                    isLocal: true,
                },
            ]);
            return;
        }

        const gifId = selected.id || `${Date.now()}`;
        const uniqueId = `gif-${gifId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const previewUrl = selected.previewUrl || selected.downloadUrl;
        const downloadUrl = selected.downloadUrl || selected.previewUrl;
        const fileName = `${gifId}.gif`;

        // 2. Thêm ngay thẻ preview vào danh sách với trạng thái isLoading: true
        const placeholderItem = {
            id: uniqueId,
            url: previewUrl,
            file: null,
            isLoading: true,
            isLocal: false,
        };

        setMediaItems((prev) => [...prev, placeholderItem]);

        // Tạo AbortController riêng cho request này để hủy khi người dùng bấm X xóa
        const controller = new AbortController();
        abortControllersRef.current.set(uniqueId, controller);

        // 3. Tải và chuyển đổi GIF thành File ở background kèm signal
        giphyService
            .gifUrlToFile(downloadUrl, fileName, controller.signal)
            .then((file) => {
                abortControllersRef.current.delete(uniqueId);

                setMediaItems((prev) => {
                    // Nếu người dùng đã xóa preview này trong lúc đang tải thì bỏ qua
                    const exists = prev.some((item) => item.id === uniqueId);
                    if (!exists) return prev;

                    return prev.map((item) =>
                        item.id === uniqueId
                            ? { ...item, file, isLoading: false }
                            : item,
                    );
                });
            })
            .catch((err) => {
                abortControllersRef.current.delete(uniqueId);

                // Nếu request bị chủ động hủy (AbortError) do người dùng bấm X xóa, không hiện lỗi
                if (err?.name === "AbortError") {
                    return;
                }

                console.error("Failed to load GIF in background:", err);
                // Xóa item bị lỗi và gọi callback thông báo
                setMediaItems((prev) => prev.filter((item) => item.id !== uniqueId));
                onGifError?.(err);
            });
    };

    // 6. Xóa toàn bộ media đã chọn
    const clearMedia = () => {
        abortControllersRef.current.forEach((controller) => controller.abort());
        abortControllersRef.current.clear();
        createdObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        createdObjectUrlsRef.current.clear();
        setMediaItems([]);
    };

    return {
        mediaItems,
        setMediaItems,
        fileInputRef,
        handleFileChange,
        handleRemoveMedia,
        handleSelectGif,
        isGifPickerOpen,
        setIsGifPickerOpen,
        openGifPicker,
        closeGifPicker,
        toggleGifPicker,
        isAnyMediaLoading,
        readyFiles,
        mediaFiles: readyFiles,
        mediaPreviews: mediaItems.map((item) => item.url),
        clearMedia,
    };
};

export default useReplyMedia;
