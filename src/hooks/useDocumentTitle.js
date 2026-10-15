import { useEffect } from "react";

/**
 * useDocumentTitle
 * Custom hook quản lý tiêu đề trang web (document.title):
 * - Tự động cập nhật tiêu đề trên tab trình duyệt khi chuyển route hoặc thay đổi nội dung
 * - Hỗ trợ đính kèm tiền tố thương hiệu `Threads • [Title]` hoặc sử dụng tiêu đề tùy biến
 * - Tự động phục hồi về tiêu đề mặc định ("Threads") nếu không có title
 */
export const useDocumentTitle = (title, withSuffix = true) => {
    useEffect(() => {
        // Tiêu đề thương hiệu mặc định khi không truyền title
        const defaultTitle = "Threads";

        // Trường hợp không có title -> Phục hồi tiêu đề mặc định
        if (!title) {
            document.title = defaultTitle;
            return;
        }

        // Đính kèm hậu tố thương hiệu ("Threads • [Title]") hoặc sử dụng tiêu đề tùy biến đơn thuần
        document.title = withSuffix ? `Threads • ${title}` : title;
    }, [title, withSuffix]);
};

export default useDocumentTitle;
