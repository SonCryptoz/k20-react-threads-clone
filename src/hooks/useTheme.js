import { ThemeContext } from "@/contexts/ThemeContext";
import { useContext } from "react";

/**
 * useTheme
 * Custom hook truy cập ngữ cảnh giao diện Theme (Sáng / Tối - Light / Dark):
 * - Cung cấp trạng thái theme hiện tại (`theme`, `isDark`)
 * - Cung cấp hàm chuyển đổi giao diện (`toggleTheme`, `setTheme`)
 * - Tự động đồng bộ với `localStorage` và class `dark` trên thẻ `<html>`
 */
export const useTheme = () => useContext(ThemeContext);