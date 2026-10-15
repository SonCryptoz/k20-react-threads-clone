/**
 * searchHelpers.js
 * Tập hợp các hàm tiện ích hỗ trợ định dạng số liệu và trích xuất dữ liệu cho module Search
 */

/**
 * Định dạng số lượng người theo dõi (VD: 1250 -> 1.3k, 1200000 -> 1.2M)
 */
export const formatFollowerCount = (count) => {
    if (count === undefined || count === null || isNaN(count)) return null;
    const num = Number(count);
    if (num >= 1_000_000) {
        return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    }
    if (num >= 1_000) {
        return `${(num / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
    }
    return num.toLocaleString();
};

/**
 * Định dạng số lượng bài viết của chủ đề
 */
export const formatTopicCount = (count) => {
    if (count === undefined || count === null || isNaN(count)) return null;
    const num = Number(count);
    if (num >= 1_000_000) {
        return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    }
    if (num >= 1_000) {
        return `${(num / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
    }
    return num.toLocaleString();
};

/**
 * Chuẩn hóa username (loại bỏ ký tự @ và khoảng trắng)
 */
export const cleanUsername = (username) => {
    if (!username) return "user";
    return String(username).replace(/^@/, "").trim();
};

/**
 * Chuẩn hóa tên chủ đề (loại bỏ ký tự # và khoảng trắng)
 */
export const cleanTopicName = (topic) => {
    if (!topic) return "";
    const raw =
        typeof topic === "string"
            ? topic
            : topic.name || topic.hashtag || topic.title || "";
    return String(raw).replace(/^#/, "").trim();
};

/**
 * Trích xuất danh sách users từ kết quả API linh hoạt
 */
export const extractUserList = (res) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.users)) return res.users;
    if (Array.isArray(res.data?.users)) return res.data.users;
    if (Array.isArray(res.data?.data)) return res.data.data;
    return [];
};

/**
 * Trích xuất danh sách topics từ kết quả API linh hoạt
 */
export const extractTopicList = (res) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.topics)) return res.topics;
    if (Array.isArray(res.data?.topics)) return res.data.topics;
    if (Array.isArray(res.data?.data)) return res.data.data;
    return [];
};
