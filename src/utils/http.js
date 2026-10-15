/**
 * http
 * Cấu hình Axios HTTP Client trung tâm cho toàn bộ ứng dụng:
 * - Khởi tạo httpClient chính và refreshClient phụ (chống lặp vô hạn khi refresh)
 * - Request Interceptor: Tự động đính kèm Bearer token vào Authorization header
 * - Response Interceptor: Bắt mã lỗi 401 Unauthorized, cơ chế xếp hàng đợi (Queue) khi refresh token
 * - Tự động cập nhật accessToken mới hoặc điều hướng đăng xuất và dọn dẹp phiên (userCache) nếu refresh thất bại
 * - Hỗ trợ đầy đủ các phương thức tiện ích: get, post, put, patch, del (delete)
 */
import axios from "axios";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "./tokenStorage";
import userCache from "./userCache";
import { BASE_URL } from "@/constants/api";

// Instance chính dùng cho các request trong ứng dụng
export const httpClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Instance phụ chuyên dùng để gọi refresh token (tránh dính interceptor lặp vô tận)
const refreshClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Biến cờ và hàng đợi chống gọi trùng lặp (race condition) khi nhiều request cùng 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((promise) => {
        if (error) {
            promise.reject(error);
        } else {
            promise.resolve(token);
        }
    });
    failedQueue = [];
};

// ==========================================
// 1. REQUEST INTERCEPTOR: Đính kèm access_token
// ==========================================
httpClient.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

// ==========================================
// 2. RESPONSE INTERCEPTOR: Xử lý 401 & Refresh Token
// ==========================================
httpClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Nếu không có response hoặc không phải mã 401 thì trả về lỗi thông thường
        if (!error.response || error.response.status !== 401) {
            return Promise.reject(error);
        }

        // Bỏ qua các endpoint auth không cần refresh khi nhận 401 (như đăng nhập, đăng ký, đăng xuất...)
        const isAuthEndpoint = [
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/logout",
            "/api/auth/refresh",
            "/api/auth/refresh-token",
            "/auth/login",
            "/auth/register",
            "/auth/logout",
            "/auth/refresh",
            "/auth/refresh-token",
        ].some((url) => originalRequest.url?.includes(url));

        if (isAuthEndpoint) {
            return Promise.reject(error);
        }

        // Nếu request này đã từng thử retry 1 lần mà vẫn 401 thì dừng, tránh lặp vô tận
        if (originalRequest._retry) {
            clearTokens();
            userCache.clearSession();
            if (typeof window !== "undefined" && window.location.pathname !== "/login") {
                window.location.href = "/login";
            }
            return Promise.reject(error);
        }

        const refreshToken = getRefreshToken();

        // Không có refresh_token trong localStorage thì đăng xuất luôn
        if (!refreshToken) {
            clearTokens();
            userCache.clearSession();
            if (typeof window !== "undefined" && window.location.pathname !== "/login") {
                window.location.href = "/login";
            }
            return Promise.reject(error);
        }

        // Nếu đang có 1 tiến trình refresh token chạy ngầm, đẩy request này vào hàng đợi (Queue)
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            })
                .then((newAccessToken) => {
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    return httpClient(originalRequest);
                })
                .catch((err) => Promise.reject(err));
        }

        // Đánh dấu bắt đầu tiến trình refresh
        originalRequest._retry = true;
        isRefreshing = true;

        try {
            // Gọi API refresh token
            const response = await refreshClient.post("/api/auth/refresh", {
                refresh_token: refreshToken,
            });

            // Xử lý linh hoạt format dữ liệu trả về từ backend
            const resData = response.data?.data || response.data;
            const newAccessToken = resData?.access_token || resData?.accessToken;
            const newRefreshToken = resData?.refresh_token || resData?.refreshToken || refreshToken;

            if (!newAccessToken) {
                throw new Error("Không nhận được access_token mới từ phản hồi API refresh");
            }

            // Lưu token mới vào localStorage
            setTokens({
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            });

            // Cập nhật lại Authorization header cho client & request hiện tại
            httpClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

            // Giải phóng hàng đợi các request đang chờ
            processQueue(null, newAccessToken);

            // Gửi lại request ban đầu vừa bị 401
            return httpClient(originalRequest);
        } catch (refreshError) {
            // Refresh token thất bại (hết hạn hoặc không hợp lệ) -> hủy hàng đợi, xóa token và chuyển về /login
            processQueue(refreshError, null);
            clearTokens();

            if (typeof window !== "undefined" && window.location.pathname !== "/login") {
                window.location.href = "/login";
            }

            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    },
);

// Hàm tiện ích gửi HTTP request tập trung qua httpClient
const _send = async (method, pathname, data, config) => {
    const response = await httpClient.request({
        ...config,
        method,
        url: pathname,
        data,
    });

    return response.data;
};

// Phương thức GET: Truy vấn dữ liệu từ API server
const get = async (pathname, config) => {
    return await _send("get", pathname, null, config);
};

// Phương thức POST: Tạo mới dữ liệu hoặc thực hiện tác vụ trên server
const post = async (pathname, data, config) => {
    return await _send("post", pathname, data, config);
};

// Phương thức PUT: Cập nhật thay thế toàn bộ bản ghi
const put = async (pathname, data, config) => {
    return await _send("put", pathname, data, config);
};

// Phương thức PATCH: Cập nhật từng phần bản ghi
const patch = async (pathname, data, config) => {
    return await _send("patch", pathname, data, config);
};

// Phương thức DELETE: Xóa bản ghi khỏi hệ thống
const del = async (pathname, config) => {
    return await _send("delete", pathname, null, config);
};

const http = { get, post, put, patch, del, client: httpClient };

export default http;
