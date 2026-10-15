import { useState } from "react";
import { Search, X, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import useGifPicker from "./hooks/useGifPicker";

/**
 * GifItem
 * Component hiển thị từng thẻ GIF riêng lẻ kèm hiệu ứng skeleton mượt mà trong khi ảnh tải
 */
const GifItem = ({ gif, onPick }) => {
    const [isLoaded, setIsLoaded] = useState(false);

    // Ưu tiên fixed_width_downsampled (~48KB) để tải siêu nhanh
    const previewUrl =
        gif.images?.fixed_width_downsampled?.url ||
        gif.images?.fixed_width?.webp ||
        gif.images?.fixed_width?.url ||
        gif.images?.downsized?.url;

    return (
        <button
            type="button"
            onClick={() => onPick(gif)}
            className="relative group rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 aspect-4/3 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all hover:opacity-90 active:scale-98"
        >
            {/* Skeleton placeholder hiển thị ngay lập tức trong lúc tải ảnh */}
            {!isLoaded && (
                <div className="absolute inset-0 bg-neutral-200/70 dark:bg-neutral-800 animate-pulse" />
            )}

            <img
                src={previewUrl}
                alt={gif.title || "gif"}
                loading="lazy"
                decoding="async"
                onLoad={() => setIsLoaded(true)}
                className={`w-full h-full object-cover transition-opacity duration-200 ${
                    isLoaded ? "opacity-100" : "opacity-0"
                }`}
            />
        </button>
    );
};

/**
 * GifPickerContent
 * Giao diện bảng chọn ảnh GIF chuẩn Threads sử dụng GIPHY REST API:
 * - Toàn bộ logic nghiệp vụ (debounce, abort request, fetch API, phím ESC...) được tách vào useGifPicker
 */
const GifPickerContent = ({ onClose, onSelectGif }) => {
    const { t } = useTranslation();

    const {
        query,
        gifs,
        isLoading,
        error,
        inputRef,
        fetchGifs,
        handleQueryChange,
        handleClearQuery,
        handlePickGif,
    } = useGifPicker({ onClose, onSelectGif });

    return (
        <div
            className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose?.();
                }
            }}
        >
            <div
                className="w-full max-w-lg h-135 max-h-[88vh] flex flex-col rounded-[22px] md:rounded-[24px] border-[1.5px] border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-[#181818] shadow-2xl text-neutral-900 dark:text-neutral-100 overflow-hidden animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 1. Header: Ô tìm kiếm & Nút đóng */}
                <header className="px-4 py-3 border-b-[1.5px] border-neutral-200/80 dark:border-neutral-700/80 flex items-center gap-3 shrink-0">
                    <div className="relative flex-1">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                        />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={handleQueryChange}
                            placeholder={t("post.search_gif")}
                            className="w-full bg-neutral-100 dark:bg-neutral-800/80 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 rounded-xl pl-9 pr-8 py-2 outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600 transition-all"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={handleClearQuery}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </header>

                {/* 2. Tiêu đề danh sách & GIPHY branding */}
                <div className="px-4 pt-2.5 pb-1 flex items-center justify-between text-xs text-neutral-400 select-none">
                    <span className="font-medium">
                        {query ? `Kết quả: "${query}"` : t("post.trending_gifs")}
                    </span>
                    <span className="font-bold tracking-wider text-[10px] text-neutral-400/80 uppercase">
                        Powered by GIPHY
                    </span>
                </div>

                {/* 3. Lưới hiển thị các ảnh GIF */}
                <div className="flex-1 overflow-y-auto px-4 pb-4 pt-1.5 scrollbar-none">
                    {/* Trạng thái đang tải */}
                    {isLoading && (
                        <div className="grid grid-cols-2 gap-2">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="h-36 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse"
                                />
                            ))}
                        </div>
                    )}

                    {/* Trạng thái gặp lỗi */}
                    {!isLoading && error && (
                        <div className="py-20 text-center flex flex-col items-center justify-center">
                            <p className="text-sm text-rose-500 mb-3">
                                {t(error, { defaultValue: error })}
                            </p>
                            <button
                                type="button"
                                onClick={() => fetchGifs(query)}
                                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                            >
                                <RefreshCw size={13} />
                                {t("post.reload")}
                            </button>
                        </div>
                    )}

                    {/* Trạng thái không có kết quả */}
                    {!isLoading && !error && gifs.length === 0 && (
                        <div className="py-24 text-center text-sm text-neutral-400 dark:text-neutral-500 select-none">
                            {t("post.no_gifs_found")}
                        </div>
                    )}

                    {/* Danh sách ảnh GIF 2 cột */}
                    {!isLoading && gifs.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                            {gifs.map((gif) => (
                                <GifItem key={gif.id} gif={gif} onPick={handlePickGif} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * GifPicker
 * Wrapper quản lý việc mount / unmount GifPickerContent
 */
const GifPicker = ({ isOpen, onClose, onSelectGif }) => {
    if (!isOpen) return null;
    return <GifPickerContent onClose={onClose} onSelectGif={onSelectGif} />;
};

export default GifPicker;
