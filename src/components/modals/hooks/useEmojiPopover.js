import { useState, useRef, useEffect } from "react";

/**
 * useEmojiPopover
 * Custom hook quản lý trạng thái, vị trí hiển thị và thao tác chèn emoji:
 * - Quản lý mở/đóng popover bộ chọn emoji
 * - Tự động tính toán vị trí hiển thị (fixed positioning) dựa vào tọa độ nút emoji
 * - Tự động căn chỉnh khi scroll hoặc resize màn hình
 * - Lắng nghe click outside (pointerdown) để tự đóng
 * - Chèn ký tự emoji vào đúng vị trí con trỏ (cursor) trong textarea
 */
export const useEmojiPopover = ({ textareaRef, content, setContent }) => {
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });

    const emojiBtnRef = useRef(null);
    const emojiPickerRef = useRef(null);

    // Mở / đóng / toggle bộ chọn emoji
    const openEmojiPicker = () => setIsEmojiPickerOpen(true);
    const closeEmojiPicker = () => setIsEmojiPickerOpen(false);

    const toggleEmojiPicker = () => {
        setIsEmojiPickerOpen((prev) => {
            const next = !prev;
            if (next && emojiBtnRef.current) {
                const rect = emojiBtnRef.current.getBoundingClientRect();
                const pickerWidth = 352;
                const pickerHeight = 360;

                let left = rect.left;
                if (left + pickerWidth > window.innerWidth - 16) {
                    left = Math.max(16, window.innerWidth - pickerWidth - 16);
                }
                if (left < 16) left = 16;

                let top = rect.bottom + 8;
                if (top + pickerHeight > window.innerHeight - 16) {
                    top = Math.max(16, rect.top - pickerHeight - 8);
                }

                setPickerPos({ top, left });
            }
            return next;
        });
    };

    // Chèn emoji vào textarea tại vị trí con trỏ chuột
    const handleSelectEmoji = (emoji) => {
        const emojiChar = emoji?.native || emoji;
        if (!emojiChar) return;

        const textarea = textareaRef?.current;
        if (textarea) {
            const start = textarea.selectionStart ?? content.length;
            const end = textarea.selectionEnd ?? content.length;
            const newContent =
                content.substring(0, start) + emojiChar + content.substring(end);
            setContent(newContent);

            requestAnimationFrame(() => {
                textarea.focus();
                const nextCursor = start + emojiChar.length;
                textarea.setSelectionRange(nextCursor, nextCursor);
            });
        } else {
            setContent((prev) => prev + emojiChar);
        }
    };

    // Thêm emoji mẫu nhanh
    const handleInsertEmoji = (emoji = "❤️") => {
        handleSelectEmoji(emoji);
    };

    // Tự động căn chỉnh vị trí picker khi scroll/resize & lắng nghe click bên ngoài
    useEffect(() => {
        if (!isEmojiPickerOpen) return;

        const updatePosition = () => {
            if (!emojiBtnRef.current) return;
            const rect = emojiBtnRef.current.getBoundingClientRect();
            const pickerWidth = 352;
            const pickerHeight = 360;

            let left = rect.left;
            if (left + pickerWidth > window.innerWidth - 16) {
                left = Math.max(16, window.innerWidth - pickerWidth - 16);
            }
            if (left < 16) left = 16;

            let top = rect.bottom + 8;
            if (top + pickerHeight > window.innerHeight - 16) {
                top = Math.max(16, rect.top - pickerHeight - 8);
            }

            setPickerPos({ top, left });
        };

        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);

        const handleClickOutside = (e) => {
            if (
                emojiPickerRef.current &&
                !emojiPickerRef.current.contains(e.target) &&
                emojiBtnRef.current &&
                !emojiBtnRef.current.contains(e.target)
            ) {
                setIsEmojiPickerOpen(false);
            }
        };

        document.addEventListener("pointerdown", handleClickOutside);

        return () => {
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
            document.removeEventListener("pointerdown", handleClickOutside);
        };
    }, [isEmojiPickerOpen]);

    return {
        isEmojiPickerOpen,
        setIsEmojiPickerOpen,
        pickerPos,
        emojiBtnRef,
        emojiPickerRef,
        openEmojiPicker,
        closeEmojiPicker,
        toggleEmojiPicker,
        handleSelectEmoji,
        handleInsertEmoji,
    };
};

export default useEmojiPopover;
