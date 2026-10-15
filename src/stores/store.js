/**
 * store
 * Cấu hình Redux Store trung tâm của toàn bộ ứng dụng:
 * - Tích hợp Redux Toolkit `configureStore`
 * - Đăng ký root reducer (authSlice) quản lý thông tin xác thực
 */
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/features/authSlice";

export const store = configureStore({
    reducer: {
        auth: authReducer,
    },
});

export default store;
