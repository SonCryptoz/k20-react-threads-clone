/**
 * formatTime
 * Hàm tiện ích định dạng mốc thời gian hiển thị theo phong cách Threads Web:
 * - Dưới 1 phút: "Vừa xong" / "Just now" (`time.now`)
 * - Dưới 1 giờ: "{m}m" (`time.minute`)
 * - Dưới 24 giờ: "{h}h" (`time.hour`)
 * - Dưới 7 ngày: "{d}d" (`time.day`)
 * - Dưới 4 tuần: "{w}w" (`time.week`)
 * - Trên 4 tuần: Định dạng ngày đầy đủ theo locale (vd: 15 thg 10, 2026 / Oct 15, 2026)
 */
export function formatTimeAgo(dateInput, t, locale = "vi-VN") {
    // Kiểm tra dữ liệu đầu vào rỗng
    if (!dateInput) return "";

    // Parse thời gian và kiểm tra tính hợp lệ của chuỗi ISO/timestamp
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "";

    // Tính khoảng cách chênh lệch thời gian (giây) so với thời điểm hiện tại
    const now = new Date();
    const diffInSeconds = Math.max(0, Math.floor((now - date) / 1000));

    // 1. Dưới 1 phút -> "Vừa xong"
    if (diffInSeconds < 60) {
        return t("time.now");
    }

    // 2. Dưới 1 giờ -> Số phút (vd: "15m")
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes}${t("time.minute")}`;
    }

    // 3. Dưới 24 giờ -> Số giờ (vd: "2h")
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours}${t("time.hour")}`;
    }

    // 4. Dưới 7 ngày -> Số ngày (vd: "3d")
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
        return `${diffInDays}${t("time.day")}`;
    }

    // 5. Dưới 4 tuần -> Số tuần (vd: "2w")
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
        return `${diffInWeeks}${t("time.week")}`;
    }

    // 6. Trên 4 tuần -> Hiển thị ngày tháng năm theo ngôn ngữ hiển thị (locale)
    return date.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

export default formatTimeAgo;
