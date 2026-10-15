import axios from "axios";

import { GIPHY_API_BASE_URL, GIPHY_API_KEY } from "@/constants/api";

// Bộ nhớ cache tạm trong phiên (in-memory cache) giúp truy vấn tức thì (0ms) khi lặp lại từ khóa
const gifCache = new Map();
const CACHE_MAX_ENTRIES = 50;

/**
 * giphyService
 * Quản lý gọi API tìm kiếm và lấy ảnh GIF từ GIPHY:
 * - getTrendingGifs: Lấy danh sách GIF thịnh hành (kèm cache)
 * - searchGifs: Tìm kiếm GIF theo từ khóa (kèm cache + hỗ trợ AbortSignal)
 * - gifUrlToFile: Tải GIF từ URL và chuyển thành File object để gửi lên backend F8
 */
const giphyService = {
    /**
     * Lấy danh sách GIF thịnh hành (Trending)
     */
    async getTrendingGifs({ limit = 18, offset = 0, rating = "g", signal } = {}) {
        const cacheKey = `trending_${limit}_${offset}_${rating}`;
        if (gifCache.has(cacheKey)) {
            return gifCache.get(cacheKey);
        }

        const response = await axios.get(`${GIPHY_API_BASE_URL}/trending`, {
            params: {
                api_key: GIPHY_API_KEY,
                limit,
                offset,
                rating,
            },
            signal,
        });

        const data = response.data;
        if (gifCache.size >= CACHE_MAX_ENTRIES) {
            const firstKey = gifCache.keys().next().value;
            gifCache.delete(firstKey);
        }
        gifCache.set(cacheKey, data);

        return data;
    },

    /**
     * Tìm kiếm GIF theo từ khóa (Search)
     */
    async searchGifs({ query, limit = 18, offset = 0, rating = "g", signal } = {}) {
        const trimmedQuery = query?.trim();
        if (!trimmedQuery) {
            return this.getTrendingGifs({ limit, offset, rating, signal });
        }

        const cacheKey = `search_${trimmedQuery.toLowerCase()}_${limit}_${offset}_${rating}`;
        if (gifCache.has(cacheKey)) {
            return gifCache.get(cacheKey);
        }

        const response = await axios.get(`${GIPHY_API_BASE_URL}/search`, {
            params: {
                api_key: GIPHY_API_KEY,
                q: trimmedQuery,
                limit,
                offset,
                rating,
            },
            signal,
        });

        const data = response.data;
        if (gifCache.size >= CACHE_MAX_ENTRIES) {
            const firstKey = gifCache.keys().next().value;
            gifCache.delete(firstKey);
        }
        gifCache.set(cacheKey, data);

        return data;
    },

    /**
     * Chuyển đổi URL ảnh GIF thành File object để gửi vào FormData media[] (hỗ trợ AbortSignal để hủy request)
     */
    async gifUrlToFile(url, filename, signal) {
        const actualName = filename || `threads-${Date.now()}.gif`;
        const response = await fetch(url, { signal });
        const blob = await response.blob();
        return new File([blob], actualName, {
            type: blob.type || "image/gif",
        });
    },
};

export default giphyService;
