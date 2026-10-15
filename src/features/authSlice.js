/**
 * authSlice
 * Redux Toolkit Slice quản lý toàn bộ trạng thái xác thực và phiên làm việc của người dùng:
 * - `user`: Dữ liệu hồ sơ người dùng hiện tại
 * - `isAuthenticated`: Trạng thái đã đăng nhập (dựa trên token hợp lệ)
 * - `isInitialized`: Trạng thái đã nạp và xác minh phiên ban đầu khi mở app
 * - `isLoading` / `error`: Trạng thái tải và thông báo lỗi đăng nhập
 * - `fetchCurrentUser`: Async Thunk lấy thông tin user hiện tại kèm minDelay tạo hiệu ứng mượt mà
 * - Tích hợp chặt chẽ với `userCache` để cô lập hoặc dọn dẹp cache follow theo từng phiên người dùng
 */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import authService from "@/services/authService";
import { getAccessToken, clearTokens } from "@/utils/tokenStorage";
import userCache from "@/utils/userCache";

// Thunk lấy thông tin user hiện tại
export const fetchCurrentUser = createAsyncThunk(
    "auth/fetchCurrentUser",
    async (options, { rejectWithValue }) => {
        try {
            const minDelay = typeof options === "number" ? options : options?.minDelay || 0;
            const [response] = await Promise.all([
                authService.getCurrentUser(),
                // dùng cho animation skeleton khi đăng nhập thành công
                minDelay
                    ? new Promise((resolve) => setTimeout(resolve, minDelay))
                    : Promise.resolve(),
            ]);
            return response.data || response;
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message || "Không thể lấy thông tin người dùng",
            );
        }
    },
);

// Trạng thái khởi tạo mặc định của Auth Slice
const initialState = {
    // Thông tin người dùng hiện tại
    user: null,
    // Trạng thái đã đăng nhập (kiểm tra tức thì sự tồn tại của token)
    isAuthenticated: Boolean(getAccessToken()),
    // Cờ trạng thái đang tải dữ liệu xác thực
    isLoading: false,
    // Cờ đánh dấu đã hoàn tất kiểm tra và xác minh phiên ban đầu
    isInitialized: !getAccessToken(),
    // Thông báo lỗi xác thực (nếu có)
    error: null,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        // Lưu thông tin người dùng và kích hoạt sessionCache tương ứng với userId
        setUser: (state, action) => {
            state.user = action.payload;
            state.isAuthenticated = true;
            state.error = null;
            if (action.payload?.id) {
                userCache.setSessionUser(action.payload.id);
            }
        },
        // Cập nhật từng phần thông tin profile của người dùng hiện tại
        updateUser: (state, action) => {
            if (state.user) {
                state.user = { ...state.user, ...action.payload };
            } else {
                state.user = action.payload;
            }
        },
        // Đánh dấu trạng thái đã hoàn tất nạp và xác thực phiên
        setInitialized: (state, action) => {
            state.isInitialized = action.payload;
        },
        // Đăng xuất: Reset toàn bộ Redux state và xóa sạch token, userCache
        logout: (state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.isLoading = false;
            state.isInitialized = true;
            state.error = null;
            clearTokens();
            userCache.clearSession();
        },
        // Xóa thông báo lỗi xác thực
        clearAuthError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Bắt đầu gọi API lấy thông tin user hiện tại
            .addCase(fetchCurrentUser.pending, (state) => {
                state.isLoading = true;
                state.isInitialized = false;
                state.error = null;
            })
            // Lấy thông tin user thành công -> Đồng bộ session cache
            .addCase(fetchCurrentUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload;
                state.isAuthenticated = true;
                state.isInitialized = true; // Đã xác thực xong
                if (action.payload?.id) {
                    userCache.setSessionUser(action.payload.id);
                }
            })
            // Lấy thông tin user thất bại (token hết hạn hoặc không hợp lệ) -> Dọn dẹp phiên sạch sẽ
            .addCase(fetchCurrentUser.rejected, (state, action) => {
                state.isLoading = false;
                state.user = null;
                state.isAuthenticated = false;
                state.isInitialized = true; // Xong phiên (dù lỗi/hết hạn)
                state.error = action.payload;
                userCache.clearSession();
            });
    },
});

export const { setUser, updateUser, setInitialized, logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
