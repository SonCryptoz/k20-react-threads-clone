import { lazy, Suspense } from "react";
import { Image as ImageIcon, Smile, MapPin, BarChart2, Loader2 } from "lucide-react";
import GifPicker from "@/components/common/GifPicker";
import { Input } from "@/components/ui/input";

// Tách riêng EmojiPicker thành lazy chunk (~500KB) chỉ tải khi người dùng click/hover nút emoji
const EmojiPicker = lazy(() => import("@/components/common/EmojiPicker"));

/**
 * ReplyToolbar
 * Component thanh công cụ 5 nút bên dưới textarea:
 * 1. Upload ảnh / video (kèm input file ẩn)
 * 2. Thêm GIF (GIPHY REST API modal)
 * 3. Bộ chọn emoji (tích hợp emoji-mart qua EmojiPicker)
 * 4. Bình chọn (Poll)
 * 5. Vị trí (Location)
 */
const ReplyToolbar = ({
    fileInputRef,
    handleFileChange,
    handleInsertEmoji,
    emojiBtnRef,
    isEmojiPickerOpen,
    toggleEmojiPicker,
    emojiPickerRef,
    pickerPos,
    handleSelectEmoji,
    theme,
    language,
    isGifPickerOpen,
    closeGifPicker,
    toggleGifPicker,
    handleSelectGif,
    isEditMode = false,
    t,
}) => {
    return (
        <>
            {/* Input ẩn để upload file ảnh / video */}
            <Input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                disabled={isEditMode}
                onChange={handleFileChange}
                className="hidden"
            />

            {/* Toolbar 5 nút chức năng */}
            <div className="flex items-center gap-3 mt-2 text-neutral-400 dark:text-neutral-500 select-none">
                {/* 1. Upload ảnh / video */}
                <button
                    type="button"
                    disabled={isEditMode}
                    onClick={() => !isEditMode && fileInputRef.current?.click()}
                    className={`transition-colors ${
                        isEditMode
                            ? "opacity-35 cursor-not-allowed text-neutral-400 dark:text-neutral-600"
                            : "hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                    }`}
                    title={
                        isEditMode
                            ? t("post.cannot_edit_media", "Không thể thay đổi phương tiện của bài viết đã đăng")
                            : t("post.toolbar_image")
                    }
                >
                    <ImageIcon size={19} />
                </button>

                {/* 2. GIF */}
                <button
                    type="button"
                    disabled={isEditMode}
                    onClick={isEditMode ? undefined : toggleGifPicker}
                    className={`font-bold text-xs border border-current px-1 py-0.5 rounded leading-none transition-colors ${
                        isEditMode
                            ? "opacity-35 cursor-not-allowed text-neutral-400 dark:text-neutral-600"
                            : `hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer ${
                                isGifPickerOpen ? "text-neutral-950 dark:text-white" : ""
                            }`
                    }`}
                    title={
                        isEditMode
                            ? t("post.cannot_edit_media", "Không thể thay đổi phương tiện của bài viết đã đăng")
                            : "GIF"
                    }
                >
                    GIF
                </button>

                {/* 3. Emoji */}
                <button
                    ref={emojiBtnRef}
                    type="button"
                    onClick={toggleEmojiPicker}
                    onMouseEnter={() => {
                        // Tải trước chunk emoji khi người dùng di chuột tới nút để khi click mở ngay 0ms
                        import("@/components/common/EmojiPicker");
                    }}
                    className={`hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer ${
                        isEmojiPickerOpen ? "text-neutral-950 dark:text-white" : ""
                    }`}
                    title="Emoji"
                >
                    <Smile size={19} />
                </button>

                {/* 4. Poll / Bình chọn */}
                <button
                    type="button"
                    onClick={() => handleInsertEmoji("📊")}
                    className="hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                    title={t("post.toolbar_poll")}
                >
                    <BarChart2 size={19} />
                </button>

                {/* 5. Location */}
                <button
                    type="button"
                    onClick={() => handleInsertEmoji("📍")}
                    className="hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                    title={t("post.toolbar_location")}
                >
                    <MapPin size={19} />
                </button>
            </div>

            {/* Popover chọn emoji từ thư viện emoji-mart (fixed positioning + lazy loaded) */}
            {isEmojiPickerOpen && (
                <div
                    ref={emojiPickerRef}
                    style={{
                        position: "fixed",
                        top: `${pickerPos.top}px`,
                        left: `${pickerPos.left}px`,
                        zIndex: 60,
                    }}
                    className="animate-in fade-in zoom-in-95 duration-150"
                >
                    <Suspense
                        fallback={
                            <div className="w-88 h-90 rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col items-center justify-center gap-2">
                                <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
                            </div>
                        }
                    >
                        <EmojiPicker
                            onEmojiSelect={handleSelectEmoji}
                            theme={theme === "dark" ? "dark" : "light"}
                            locale={language.startsWith("vi") ? "vi" : "en"}
                        />
                    </Suspense>
                </div>
            )}

            {/* Modal tìm kiếm và chọn ảnh GIF từ GIPHY */}
            <GifPicker
                isOpen={isGifPickerOpen}
                onClose={closeGifPicker || toggleGifPicker}
                onSelectGif={handleSelectGif}
            />
        </>
    );
};

export default ReplyToolbar;
