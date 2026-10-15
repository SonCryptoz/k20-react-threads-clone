import { useEffect } from "react";

/**
 * useLockBodyScroll
 * Custom hook quản lý khóa cuộn trang nền an toàn khi các Modal / Dialog mở:
 * - Bảo toàn 100% position: sticky của layout nền (không dùng overflow: hidden trên html/body gây giật UI)
 * - Khóa cứng và giữ nguyên vị trí scroll của window, tránh bị mất vị trí và không làm UI "bay đi"
 * - Ngăn chặn triệt để hiện tượng overscroll bounce và wheel chaining làm cuộn trang nền
 * - Chặn thao tác vuốt cảm ứng (touchmove) trên backdrop và các phím cuộn trang (Space, PageDown, Arrows...)
 * - Quản lý số lượng modal lồng nhau (`lockCount`) để chỉ gỡ khóa khi tất cả modal đã đóng
 */

// Số lượng modal đang mở đồng thời (hỗ trợ modal lồng nhau)
let lockCount = 0;
// Tọa độ cuộn dọc cố định của window tại thời điểm modal đầu tiên mở
let lockedScrollY = 0;
// Cờ đánh dấu các event listener chặn cuộn đã được gắn vào window hay chưa
let isListenersAttached = false;

// Ngăn chặn lăn chuột làm cuộn trang nền khi modal đang mở
const handleWheel = (e) => {
    // Kiểm tra xem vị trí con trỏ chuột có nằm trong vùng cuộn của modal không
    const scrollable = e.target.closest(
        ".overflow-y-auto, [data-slot='dialog-content'], [data-scrollable], .overflow-auto"
    );
    if (scrollable) {
        const { scrollTop, scrollHeight, clientHeight } = scrollable;
        const delta = e.deltaY;
        const isAtTop = scrollTop <= 0 && delta < 0;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1 && delta > 0;
        // Nếu đã cuộn đến kịch đỉnh hoặc kịch đáy của modal, ngăn không cho overscroll lan ra ngoài
        if (isAtTop || isAtBottom) {
            e.preventDefault();
        }
        return;
    }
    // Lăn chuột ở bên ngoài modal (vùng backdrop): chặn hoàn toàn
    e.preventDefault();
};

// Ngăn chặn thao tác vuốt cuộn màn hình trên thiết bị cảm ứng khi chạm vào backdrop
const handleTouchMove = (e) => {
    const scrollable = e.target.closest(
        ".overflow-y-auto, [data-slot='dialog-content'], [data-scrollable], .overflow-auto"
    );
    if (!scrollable) {
        e.preventDefault();
    }
};

// Ngăn chặn các phím cuộn trang (Space, PageDown, PageUp, ArrowUp, ArrowDown) nếu không gõ trong input/textarea
const handleKeyDown = (e) => {
    const scrollKeys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "];
    if (scrollKeys.includes(e.key)) {
        const isEditable =
            e.target.tagName === "INPUT" ||
            e.target.tagName === "TEXTAREA" ||
            e.target.isContentEditable;
        if (!isEditable) {
            e.preventDefault();
        }
    }
};

// Khóa cứng window.scrollY tại vị trí lúc mở modal, đảm bảo không thể dịch chuyển kể cả kéo scrollbar
const handleScroll = () => {
    if (typeof window !== "undefined" && window.scrollY !== lockedScrollY) {
        window.scrollTo({ top: lockedScrollY, behavior: "instant" });
    }
};

// Kích hoạt khóa cuộn: Thêm class modal-open và gắn các event listener chặn cuộn
const applyLock = () => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.add("modal-open");
    document.body.classList.add("modal-open");

    if (!isListenersAttached) {
        // Ghi nhớ vị trí scroll hiện tại để giữ cố định
        lockedScrollY = typeof window !== "undefined" ? window.scrollY : 0;
        window.addEventListener("wheel", handleWheel, { passive: false });
        window.addEventListener("touchmove", handleTouchMove, { passive: false });
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("scroll", handleScroll, { passive: false });
        isListenersAttached = true;
    }
};

// Gỡ bỏ khóa cuộn: Xóa class modal-open và tháo gỡ các event listener
const removeLock = () => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.remove("modal-open");
    document.body.classList.remove("modal-open");

    if (isListenersAttached) {
        window.removeEventListener("wheel", handleWheel);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("scroll", handleScroll);
        isListenersAttached = false;
    }
};

/**
 * useLockBodyScroll
 * Hook khóa cuộn trang nền an toàn khi Modal mở:
 * - Bảo toàn 100% position: sticky của layout nền (không dùng overflow: hidden trên html/body).
 * - Giữ nguyên vị trí scroll của window, không bị mất vị trí và không làm UI "bay đi".
 * - Ngăn chặn triệt để hiện tượng overscroll bounce và wheel chaining làm rung nội dung modal.
 */
export const useLockBodyScroll = (isLocked = false) => {
    useEffect(() => {
        if (!isLocked) return;

        // Nếu là modal đầu tiên mở -> Áp dụng khóa cuộn trang
        if (lockCount === 0) {
            applyLock();
        }
        // Tăng bộ đếm modal đang mở
        lockCount += 1;

        // Cleanup khi modal đóng hoặc component unmount
        return () => {
            lockCount = Math.max(0, lockCount - 1);
            // Chỉ gỡ khóa khi tất cả modal lồng nhau đã được đóng hoàn toàn
            if (lockCount === 0) {
                removeLock();
            }
        };
    }, [isLocked]);
};

export default useLockBodyScroll;
