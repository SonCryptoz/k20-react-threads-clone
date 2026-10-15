/**
 * getApiError
 * Hàm tiện ích phân tích và chuẩn hóa lỗi trả về từ Axios / API server:
 * - Xử lý lỗi mất kết nối mạng, timeout, CORS hoặc server ngừng phản hồi
 * - Bóc tách lỗi validation chi tiết theo từng trường dữ liệu (`fieldErrors`)
 * - Trích xuất thông báo lỗi tổng quát (`message`) từ backend hoặc áp dụng chuỗi `fallback`
 */
export const getApiError = (error, fallback = "Đã có lỗi xảy ra. Vui lòng thử lại.") => {
    // Không có response: mất mạng, server sập, CORS, timeout...
    if (!error?.response) {
        return {
            message: "Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.",
            fieldErrors: {},
        };
    }

    const data = error.response.data;

    // Chuyển { field: [msg1, msg2] } thành { field: "msg1" }
    const fieldErrors = {};
    if (data?.errors && typeof data.errors === "object") {
        for (const [field, messages] of Object.entries(data.errors)) {
            fieldErrors[field] = Array.isArray(messages) ? messages[0] : String(messages);
        }
    }

    const hasFieldErrors = Object.keys(fieldErrors).length > 0;

    return {
        // Có lỗi từng field thì không cần hiện "Validation failed" ở trên
        message: hasFieldErrors ? null : data?.message || data?.error || fallback,
        fieldErrors,
    };
};