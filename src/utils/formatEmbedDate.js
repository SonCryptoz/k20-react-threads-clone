/**
 * formatEmbedDate
 * Định dạng mốc thời gian hiển thị theo chuẩn bài viết nhúng Embed (HH:mm · DD-MM-YYYY)
 */
export const formatEmbedDate = (dateStr) => {
    // Trả về rỗng nếu không có dữ liệu đầu vào
    if (!dateStr) return "";

    // Parse thời gian và kiểm tra tính hợp lệ của timestamp
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";

    // Định dạng 2 chữ số có số 0 đứng trước (Zero-padded)
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    // Kết hợp theo định dạng chuẩn hiển thị của Embed Card
    return `${hours}:${minutes} · ${day}-${month}-${year}`;
};
