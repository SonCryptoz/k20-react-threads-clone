import { useEffect, useRef } from "react";
import { Picker } from "emoji-mart";
import data from "@emoji-mart/data";
import i18nVi from "@emoji-mart/data/i18n/vi.json";
import i18nEn from "@emoji-mart/data/i18n/en.json";

/**
 * EmojiPicker
 * Component bọc thư viện emoji-mart v5:
 * - Tự động tải data emoji
 * - Hỗ trợ đa ngôn ngữ (vi, en)
 * - Tự động theo theme (light/dark)
 * - Xử lý click outside và chọn emoji
 */
const EmojiPicker = ({ onEmojiSelect, theme = "auto", locale = "vi", onClickOutside }) => {
    const containerRef = useRef(null);
    const onSelectRef = useRef(onEmojiSelect);
    const onClickOutsideRef = useRef(onClickOutside);

    useEffect(() => {
        onSelectRef.current = onEmojiSelect;
    }, [onEmojiSelect]);

    useEffect(() => {
        onClickOutsideRef.current = onClickOutside;
    }, [onClickOutside]);

    useEffect(() => {
        const picker = new Picker({
            data,
            i18n: locale === "vi" ? i18nVi : i18nEn,
            theme,
            previewPosition: "none",
            skinTonePosition: "search",
            searchPosition: "sticky",
            perLine: 8,
            maxFrequentRows: 1,
            onEmojiSelect: (emoji) => {
                onSelectRef.current?.(emoji);
            },
            onClickOutside: (e) => {
                onClickOutsideRef.current?.(e);
            },
        });

        const container = containerRef.current;
        if (container) {
            container.innerHTML = "";
            container.appendChild(picker);
        }

        return () => {
            picker.remove();
        };
    }, [theme, locale]);

    return (
        <div
            ref={containerRef}
            className="emoji-mart-container shadow-2xl rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800"
            style={{
                display: "inline-block",
            }}
        />
    );
};

export default EmojiPicker;
