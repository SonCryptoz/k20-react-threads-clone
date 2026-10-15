import { useState, useEffect } from "react";

/**
 * useDebounce
 * Custom hook trì hoãn việc cập nhật giá trị (Debouncing) cho đến khi người dùng ngừng thao tác:
 * - Dùng cho các trường nhập liệu tìm kiếm, validation form (email, username) khi đang gõ
 * - Tự động dọn dẹp bộ đếm thời gian cũ khi giá trị thay đổi liên tục
 * - Giảm thiểu số lượng request HTTP không cần thiết gửi lên máy chủ
 */
const useDebounce = (value, delay = 500) => {
    // State lưu trữ giá trị đã được debounce sau khoảng thời gian trễ
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        // Thiết lập bộ đếm thời gian (timer) để trì hoãn cập nhật giá trị sau delay ms
        const timer = setTimeout(() => {
            // Cập nhật giá trị debounced khi người dùng đã dừng thao tác đủ thời gian quy định
            setDebouncedValue(value);
        }, delay);

        // Cleanup: Hủy timer cũ nếu value hoặc delay thay đổi trước khi hết hạn (tránh trigger sớm)
        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    // Trả về giá trị đã debounce để component sử dụng cho query hoặc validate
    return debouncedValue;
};

export default useDebounce;
