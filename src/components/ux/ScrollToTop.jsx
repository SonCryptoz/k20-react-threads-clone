import { useEffect } from "react";
import { useLocation } from "react-router";

/**
 * ScrollToTop
 * Utility component tự động cuộn trang về tọa độ (0, 0) khi thay đổi đường dẫn (route navigation)
 */
const ScrollToTop = () => {
    const { pathname } = useLocation();
    
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
};

export default ScrollToTop;
