import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useWindowScrollSync
 * Custom hook quản lý đồng bộ cuộn 2 chiều giữa khung Card cố định (Sticky) và thanh cuộn trình duyệt (Window Scroll):
 * - Mô phỏng trải nghiệm giao diện chuẩn Threads Web trên máy tính (Desktop)
 * - Tự động đo lường chiều cao nội dung (`contentRef`) qua `ResizeObserver`
 * - Tính toán chiều cao khoảng đệm tàng hình (`spacerHeight`) bên ngoài trang bằng đúng khoảng cách cuộn của khung card
 * - Đồng bộ vị trí cuộn 2 chiều mượt mà theo tần số quét màn hình qua `requestAnimationFrame`
 * - Cơ chế khóa nguồn cuộn (`activeDriverRef`) chống hiện tượng giật rung (Scroll Loop / Feedback Loop)
 * - Tự động phục hồi hoặc reset vị trí cuộn khi chuyển tab hoặc thay đổi dữ liệu phụ thuộc (`deps`)
 */
export const useWindowScrollSync = ({
    cardRef,
    contentRef,
    deps = [],
    resetTrigger,
} = {}) => {
    // Chiều cao spacer ngoài trang (đúng bằng khoảng cách cuộn của khung card)
    const [spacerHeight, setSpacerHeight] = useState(0);

    // Xác định nguồn cuộn đang hoạt động: 'card' | 'window' | 'system' | null
    const activeDriverRef = useRef(null);
    const driverTimeoutRef = useRef(null);

    // RAF IDs để throttle và đồng bộ theo frame hình mượt mà (60Hz / 120Hz / 144Hz)
    const cardRafIdRef = useRef(null);
    const windowRafIdRef = useRef(null);

    // Hàm thiết lập driver với thời gian nhả tự động
    const setDriver = useCallback((driver) => {
        activeDriverRef.current = driver;
        if (driverTimeoutRef.current) {
            clearTimeout(driverTimeoutRef.current);
        }
        driverTimeoutRef.current = setTimeout(() => {
            activeDriverRef.current = null;
        }, 150);
    }, []);

    // Kiểm tra xem có modal nào đang mở không (nếu có -> tạm dừng toàn bộ đồng bộ cuộn nền)
    const isModalActive = useCallback(() => {
        if (typeof document === "undefined") return false;
        return (
            document.body.classList.contains("modal-open") ||
            document.documentElement.classList.contains("modal-open")
        );
    }, []);

    // Tự động đo kích thước nội dung và khung bằng ResizeObserver (chỉ kích hoạt trên Desktop >= 768px)
    useEffect(() => {
        if (!contentRef?.current || !cardRef?.current) return;

        const updateHeight = () => {
            if (isModalActive()) return;
            if (!contentRef.current || !cardRef.current) return;
            const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
            if (!isDesktop) {
                setSpacerHeight(0);
                if (window.scrollY > 0) {
                    window.scrollTo({ top: 0, behavior: "instant" });
                }
                return;
            }

            const contentHeight = contentRef.current.scrollHeight;
            const cardHeight = cardRef.current.clientHeight;
            // Chiều cao spacer CHÍNH XÁC bằng lượng nội dung vượt ngoài khung
            const maxScroll = Math.max(0, contentHeight - cardHeight);
            setSpacerHeight(maxScroll);
        };

        updateHeight();
        const resizeObserver = new ResizeObserver(updateHeight);
        resizeObserver.observe(contentRef.current);
        if (cardRef.current) resizeObserver.observe(cardRef.current);

        window.addEventListener("resize", updateHeight);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", updateHeight);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contentRef, cardRef, ...deps]);

    // Lắng nghe tương tác wheel trên card để gán driver = 'card' (chỉ Desktop)
    useEffect(() => {
        const cardEl = cardRef?.current;
        if (!cardEl) return;

        const handleCardInteraction = () => {
            if (typeof window !== "undefined" && window.innerWidth < 768) return;
            if (isModalActive()) return;
            setDriver("card");
        };

        cardEl.addEventListener("wheel", handleCardInteraction, { passive: true });

        return () => {
            cardEl.removeEventListener("wheel", handleCardInteraction);
        };
    }, [cardRef, setDriver, isModalActive]);

    // Lắng nghe wheel trên window (bên ngoài card) để gán driver = 'window' (chỉ Desktop)
    useEffect(() => {
        const handleWindowWheel = (e) => {
            if (typeof window !== "undefined" && window.innerWidth < 768) return;
            if (isModalActive()) return;
            if (cardRef?.current && !cardRef.current.contains(e.target)) {
                setDriver("window");
            }
        };

        window.addEventListener("wheel", handleWindowWheel, { passive: true });
        return () => window.removeEventListener("wheel", handleWindowWheel);
    }, [cardRef, setDriver, isModalActive]);

    // Đồng bộ từ Card sang Window (khi người dùng cuộn trong khung card trên Desktop)
    const handleCardScroll = useCallback(
        (e) => {
            // Trên mobile (< 768px), không can thiệp window scroll để giữ khung cố định sát đáy
            if (typeof window !== "undefined" && window.innerWidth < 768) return;
            if (isModalActive()) return;

            // Nếu window đang là driver (người dùng đang kéo scrollbar window hoặc lăn ngoài card),
            // bỏ qua để tránh phản hồi ngược gây giật
            if (activeDriverRef.current === "window") return;

            setDriver("card");
            const targetTop = e.currentTarget.scrollTop;

            if (Math.abs(window.scrollY - targetTop) < 1) return;

            if (cardRafIdRef.current) {
                cancelAnimationFrame(cardRafIdRef.current);
            }

            cardRafIdRef.current = requestAnimationFrame(() => {
                window.scrollTo({
                    top: targetTop,
                    behavior: "instant",
                });
            });
        },
        [setDriver, isModalActive],
    );

    // Đồng bộ từ Window sang Card (khi người dùng kéo thanh cuộn window hoặc lăn ngoài card trên Desktop)
    useEffect(() => {
        const handleWindowScroll = () => {
            if (typeof window !== "undefined" && window.innerWidth < 768) return;
            if (isModalActive()) return;

            // Nếu card đang là driver (người dùng đang lăn chuột trong card),
            // bỏ qua để card tự cuộn mượt mà theo native browser compositor
            if (activeDriverRef.current === "card") return;

            if (!cardRef?.current) return;

            // Nếu người dùng đang kéo thanh cuộn trình duyệt (không phải do wheel event)
            if (!activeDriverRef.current) {
                setDriver("window");
            }

            const targetTop = window.scrollY;
            if (Math.abs(cardRef.current.scrollTop - targetTop) < 1) return;

            if (windowRafIdRef.current) {
                cancelAnimationFrame(windowRafIdRef.current);
            }

            windowRafIdRef.current = requestAnimationFrame(() => {
                if (cardRef.current && activeDriverRef.current !== "card") {
                    cardRef.current.scrollTop = targetTop;
                }
            });
        };

        window.addEventListener("scroll", handleWindowScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", handleWindowScroll);
            if (windowRafIdRef.current) cancelAnimationFrame(windowRafIdRef.current);
            if (cardRafIdRef.current) cancelAnimationFrame(cardRafIdRef.current);
            if (driverTimeoutRef.current) clearTimeout(driverTimeoutRef.current);
        };
    }, [cardRef, setDriver, isModalActive]);

    // Reset vị trí cuộn về 0 mượt mà (khi đổi tab)
    const resetScroll = useCallback(() => {
        activeDriverRef.current = "system";
        if (typeof window !== "undefined" && window.innerWidth >= 768) {
            window.scrollTo({ top: 0, behavior: "instant" });
        }
        if (cardRef?.current) {
            cardRef.current.scrollTop = 0;
        }
        setTimeout(() => {
            activeDriverRef.current = null;
        }, 100);
    }, [cardRef]);

    // Tự động reset khi resetTrigger thay đổi
    useEffect(() => {
        resetScroll();
    }, [resetTrigger, resetScroll]);

    return {
        spacerHeight,
        handleCardScroll,
        resetScroll,
    };
};

export default useWindowScrollSync;
