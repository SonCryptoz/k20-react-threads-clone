/**
 * tokenStorage
 * Module quản lý lưu trữ và truy xuất JWT tokens trong Web Storage (localStorage):
 * - getAccessToken / getRefreshToken: Lấy token xác thực từ bộ nhớ
 * - setAccessToken / setRefreshToken: Lưu token vào bộ nhớ
 * - setTokens: Cập nhật đồng thời cả access_token và refresh_token
 * - clearTokens: Xóa sạch toàn bộ tokens khi người dùng đăng xuất hoặc hết hạn phiên
 */
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/constants/token";


// Lấy JWT Access Token từ localStorage để đính kèm vào Authorization header
export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);

// Lấy JWT Refresh Token từ localStorage để cấp lại Access Token mới khi bị 401
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

// Lưu Access Token vào localStorage
export const setAccessToken = (token) => {
    if (token) {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
    }
};

// Lưu Refresh Token vào localStorage
export const setRefreshToken = (token) => {
    if (token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, token);
    }
};

// Cập nhật đồng bộ cả Access Token và Refresh Token (hỗ trợ cả camelCase và snake_case từ backend)
export const setTokens = ({ accessToken, refreshToken, access_token, refresh_token } = {}) => {
    const access = accessToken || access_token;
    const refresh = refreshToken || refresh_token;

    if (access) setAccessToken(access);
    if (refresh) setRefreshToken(refresh);
};

// Xóa sạch toàn bộ tokens khỏi localStorage khi người dùng đăng xuất hoặc hết hạn phiên
export const clearTokens = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
};

const tokenStorage = {
    getAccessToken,
    getRefreshToken,
    setAccessToken,
    setRefreshToken,
    setTokens,
    clearTokens,
};

export default tokenStorage;
