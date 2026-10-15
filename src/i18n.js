/**
 * i18n
 * Cấu hình đa ngôn ngữ (Internationalization - i18n) cho toàn bộ ứng dụng:
 * - Hỗ trợ song ngữ Tiếng Việt (`vi`) và Tiếng Anh (`en`)
 * - Tự động nhận diện ngôn ngữ từ `localStorage` (`i18nextLng`) hoặc trình duyệt (`navigator`)
 * - Tự động đồng bộ thuộc tính `document.documentElement.lang` khi người dùng chuyển đổi ngôn ngữ
 * - Cấu hình fallbackLng về `vi` và vô hiệu hóa escapeValue phục vụ JSX
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import vi from "./locales/vi.json";
import en from "./locales/en.json";

export const defaultNS = "translation";
export const supportedLngs = ["vi", "en"];

// Lấy trực tiếp ngôn ngữ đã lưu từ localStorage
const getSavedLanguage = () => {
    try {
        if (typeof window !== "undefined" && window.localStorage) {
            const saved = window.localStorage.getItem("i18nextLng");
            if (saved) {
                const clean = saved.slice(0, 2).toLowerCase();
                if (supportedLngs.includes(clean)) return clean;
            }
        }
    } catch {
        // Bỏ qua nếu môi trường không có localStorage
    }
    return undefined;
};

const savedLng = getSavedLanguage();

i18n.use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            vi: { translation: vi },
            en: { translation: en },
        },
        lng: savedLng, // Đảm bảo nếu localStorage có "en", i18n sẽ nạp ngay "en" đồng bộ
        fallbackLng: "vi",
        supportedLngs,
        load: "languageOnly",
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ["localStorage", "navigator"],
            caches: ["localStorage"],
            lookupLocalStorage: "i18nextLng",
        },
        react: {
            useSuspense: false, // Bắt buộc khi dùng react-i18next mà không bọc <Suspense>
        },
    });

// Đồng bộ thuộc tính lang trên thẻ <html> phục vụ SEO & a11y
i18n.on("languageChanged", (lng) => {
    document.documentElement.lang = lng;
});

export default i18n;