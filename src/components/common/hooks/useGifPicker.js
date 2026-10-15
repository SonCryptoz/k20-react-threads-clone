import { useState, useEffect, useRef, useCallback } from "react";
import giphyService from "@/services/giphyService";

/**
 * useGifPicker
 * Custom hook quản lý toàn bộ logic tìm kiếm và chọn ảnh GIF từ GIPHY API:
 * - Tự động tải danh sách ảnh GIF thịnh hành (Trending) khi mở modal
 * - Tìm kiếm ảnh GIF với cơ chế Debounce 250ms
 * - Hủy request cũ qua AbortController khi người dùng gõ từ khóa mới
 * - Xử lý phím Escape để đóng nhanh
 * - Trích xuất link ảnh preview & download khi người dùng chọn GIF
 */
export const useGifPicker = ({ onClose, onSelectGif } = {}) => {
    const [query, setQuery] = useState("");
    const [gifs, setGifs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const inputRef = useRef(null);
    const debounceTimeoutRef = useRef(null);
    const abortControllerRef = useRef(null);

    // Tải danh sách GIF khi tìm kiếm (có cơ chế hủy request cũ nếu gõ nhanh)
    const fetchGifs = useCallback(async (searchQuery = "") => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        setError(null);

        try {
            const res = searchQuery.trim()
                ? await giphyService.searchGifs({
                      query: searchQuery.trim(),
                      limit: 20,
                      signal: controller.signal,
                  })
                : await giphyService.getTrendingGifs({
                      limit: 20,
                      signal: controller.signal,
                  });

            setGifs(res?.data || []);
        } catch (err) {
            // Bỏ qua lỗi do chủ động hủy request (CanceledError)
            if (err?.name !== "CanceledError" && err?.code !== "ERR_CANCELED") {
                setError("post.reply_failed");
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Mở modal -> tải trending ban đầu & tự động focus ô tìm kiếm
    useEffect(() => {
        let ignore = false;

        giphyService
            .getTrendingGifs({ limit: 20 })
            .then((res) => {
                if (!ignore) {
                    setGifs(res?.data || []);
                    setIsLoading(false);
                }
            })
            .catch(() => {
                if (!ignore) {
                    setError("post.reply_failed");
                    setIsLoading(false);
                }
            });

        const timer = setTimeout(() => {
            inputRef.current?.focus();
        }, 100);

        return () => {
            ignore = true;
            clearTimeout(timer);
        };
    }, []);

    // Xử lý debounce tìm kiếm (250ms)
    const handleQueryChange = (e) => {
        const value = e.target.value;
        setQuery(value);

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        debounceTimeoutRef.current = setTimeout(() => {
            fetchGifs(value);
        }, 250);
    };

    // Xóa từ khóa tìm kiếm
    const handleClearQuery = () => {
        setQuery("");
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        fetchGifs("");
        inputRef.current?.focus();
    };

    // Đóng modal khi bấm ESC
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                onClose?.();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    // Dọn dẹp timer & abort controller khi unmount
    useEffect(() => {
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Xử lý khi người dùng chọn 1 ảnh GIF:
    // Trích xuất link ảnh và đóng modal
    const handlePickGif = (gif) => {
        const previewUrl =
            gif.images?.fixed_width_downsampled?.url ||
            gif.images?.fixed_width?.url ||
            gif.images?.downsized?.url ||
            gif.images?.original?.url;

        const downloadUrl =
            gif.images?.downsized?.url ||
            gif.images?.fixed_width?.url ||
            gif.images?.original?.url;

        if (!downloadUrl && !previewUrl) return;

        onSelectGif?.({
            id: gif.id,
            title: gif.title || "gif",
            previewUrl: previewUrl || downloadUrl,
            downloadUrl: downloadUrl || previewUrl,
            gif,
        });
        onClose?.();
    };

    return {
        query,
        gifs,
        isLoading,
        error,
        inputRef,
        fetchGifs,
        handleQueryChange,
        handleClearQuery,
        handlePickGif,
    };
};

export default useGifPicker;
