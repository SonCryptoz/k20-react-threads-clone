import { useRef, useCallback } from "react";

/**
 * useInfiniteScroll
 * Custom hook quản lý cơ chế cuộn vô tận (Infinite Scrolling) bằng IntersectionObserver API:
 * - Tự động phát hiện khi phần tử cuối cùng (Sentinel / lastElementRef) xuất hiện trong viewport
 * - Kích hoạt callback `onLoadMore` để nạp thêm dữ liệu phân trang
 * - Hỗ trợ `rootMargin` để nạp trước nội dung trước khi người dùng chạm đáy danh sách
 * - Chống gọi lặp request khi đang trong quá trình tải (`isLoading`) hoặc đã hết dữ liệu (`!hasMore`)
 * - Tự động dọn dẹp và ngắt kết nối observer cũ khi node DOM thay đổi
 */
export const useInfiniteScroll = ({
    onLoadMore,
    hasMore,
    isLoading,
    rootMargin = "200px",
}) => {
    // Lưu tham chiếu đối tượng IntersectionObserver để dọn dẹp hoặc ngắt kết nối
    const observerRef = useRef(null);

    // Callback Ref gán vào phần tử DOM cuối cùng của danh sách (Sentinel Element)
    const lastElementRef = useCallback(
        (node) => {
            // Đang tải dữ liệu: không kích hoạt observer mới để tránh spam request
            if (isLoading) return;

            // Ngắt kết nối observer của node trước đó khi node DOM thay đổi hoặc render lại
            if (observerRef.current) {
                observerRef.current.disconnect();
            }

            // Khởi tạo IntersectionObserver mới theo dõi node cuối cùng
            observerRef.current = new IntersectionObserver(
                (entries) => {
                    // Kiểm tra: phần tử đã lọt vào viewport (hoặc vùng rootMargin) VÀ còn dữ liệu để tải VÀ không bận
                    if (entries[0]?.isIntersecting && hasMore && !isLoading) {
                        onLoadMore();
                    }
                },
                { rootMargin },
            );

            // Gắn observer vào phần tử DOM hiện tại nếu tồn tại
            if (node) {
                observerRef.current.observe(node);
            }
        },
        [isLoading, hasMore, onLoadMore, rootMargin],
    );

    return { lastElementRef };
};

export default useInfiniteScroll;
