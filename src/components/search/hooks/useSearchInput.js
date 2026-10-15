import { useRef, useCallback } from "react";

/**
 * useSearchInput
 * Custom hook quản lý toàn bộ tương tác cho trường nhập liệu tìm kiếm (SearchInput):
 * - Quản lý ref tham chiếu phần tử input (hỗ trợ cả internalRef lẫn externalRef truyền từ ngoài vào)
 * - Xử lý xóa nhanh từ khóa (Clear) và tự động focus lại vào ô nhập
 * - Bắt phím tắt Escape (ESC) để xóa từ khóa tìm kiếm tức thì
 */
export const useSearchInput = ({ onClear, inputRef: externalRef } = {}) => {
    // Tham chiếu nội bộ nếu component cha không truyền ref từ ngoài vào
    const internalRef = useRef(null);
    // Sử dụng ref ngoài hoặc fallback về ref nội bộ
    const inputRef = externalRef || internalRef;

    // Xóa từ khóa tìm kiếm và tự động focus lại con trỏ chuột vào ô input
    const handleClear = useCallback(() => {
        onClear?.();
        inputRef.current?.focus();
    }, [onClear, inputRef]);

    // Bắt phím Escape để xóa nhanh nội dung tìm kiếm
    const handleKeyDown = useCallback(
        (e) => {
            if (e.key === "Escape") {
                handleClear();
            }
        },
        [handleClear],
    );

    return {
        inputRef,
        handleClear,
        handleKeyDown,
    };
};

export default useSearchInput;
