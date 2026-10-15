import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import postService from "@/services/postService";
import { formatEmbedDate } from "@/utils/formatEmbedDate";

/**
 * useEmbed
 * Custom hook quản lý logic trang Embed bài viết:
 * - Lấy thông tin bài viết từ API theo postId trên URL params
 * - Đồng bộ theme sáng / tối (Dark / Light) từ URL query param, postMessage hoặc hệ thống
 * - Xử lý trạng thái tải (isLoading) và lỗi (error)
 * - Tự động đồng bộ và gửi chiều cao thực tế (scrollHeight) lên parent window qua postMessage
 * - Định dạng dữ liệu hiển thị (user, authorUsername, postUrl, mediaUrls, formattedDate, isQuote)
 */
export const useEmbed = () => {
    const { username: paramUsername, postId } = useParams();
    const [searchParams] = useSearchParams();
    const urlTheme = searchParams.get("theme");
    const { t } = useTranslation();

    // ==========================================
    // State: Dữ liệu bài viết nhúng & trạng thái
    // ==========================================
    // State lưu dữ liệu bài viết nhúng nhận từ API (nội dung, tác giả, media, thống kê)
    const [post, setPost] = useState(null);
    // Cờ loading khi đang tải chi tiết bài viết nhúng (hiển thị skeleton)
    const [isLoading, setIsLoading] = useState(true);
    // State lưu thông báo lỗi khi không tìm thấy bài viết hoặc tải thất bại
    const [error, setError] = useState(null);

    // Trích xuất thông tin tác giả bài viết
    const user = post?.user || {};
    // Username hiển thị của tác giả bài viết
    const authorUsername = user.username || user.name || paramUsername || "user";
    // Đường dẫn permalink tới bài viết gốc
    const postUrl = post?.id ? `/${authorUsername}/post/${post.id}` : "/";
    // Danh sách URL hình ảnh/video của bài viết
    const mediaUrls = Array.isArray(post?.media_urls)
        ? post.media_urls
        : Array.isArray(post?.images)
          ? post.images
          : [];
    // Định dạng mốc thời gian hiển thị theo chuẩn Embed
    const formattedDate = formatEmbedDate(post?.created_at);
    // Cờ nhận diện bài viết trích dẫn (Quote Post)
    const isQuote = Boolean(post?.is_quote && post?.original_post);

    // Xóa scrollbar-gutter và ẩn overflow của iframe để căn giữa tuyệt đối, không bị lệch lề phải
    useEffect(() => {
        document.documentElement.style.scrollbarGutter = "auto";
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
        document.body.style.margin = "0";
    }, []);

    // Đồng bộ theme: ưu tiên param theme trên URL, sau đó đến localStorage, cuối cùng là system
    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const targetTheme = urlTheme || savedTheme || (prefersDark ? "dark" : "light");

        if (targetTheme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [urlTheme]);

    // Lắng nghe thông điệp đổi theme từ parent window qua postMessage
    useEffect(() => {
        const handleThemeMessage = (e) => {
            if (
                e.data?.type === "THEME_CHANGE" &&
                (e.data.theme === "dark" || e.data.theme === "light")
            ) {
                if (e.data.theme === "dark") {
                    document.documentElement.classList.add("dark");
                } else {
                    document.documentElement.classList.remove("dark");
                }
            }
        };

        window.addEventListener("message", handleThemeMessage);
        return () => window.removeEventListener("message", handleThemeMessage);
    }, []);

    // Tải chi tiết bài viết nhúng theo postId từ URL
    useEffect(() => {
        let isMounted = true;
        // 1. Kiểm tra guard: không tải nếu thiếu postId
        if (!postId) return;

        // 2. Gọi API lấy thông tin bài viết
        postService
            .getPost(postId)
            .then((response) => {
                if (isMounted) {
                    // 3. Cập nhật state bài viết và tắt loading
                    const data = response?.data || response;
                    setPost(data);
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    // 4. Bắt lỗi bài viết không tồn tại hoặc lỗi mạng
                    console.error("Fetch embed post error:", err);
                    setError(err?.response?.data?.message || t("post.post_not_found"));
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [postId, t]);

    // Gửi chiều cao thực tế chính xác của thẻ card lên parent window để iframe tự động co giãn vừa khít
    useEffect(() => {
        // 1. Đo lường chiều cao thực tế chính xác của thẻ card (article hoặc loader)
        const getExactHeight = () => {
            const article = document.querySelector("article");
            if (article) {
                const rect = article.getBoundingClientRect();
                return Math.ceil(rect.height);
            }
            const loader = document.querySelector("main > div");
            if (loader) {
                return Math.ceil(loader.getBoundingClientRect().height);
            }
            return 0;
        };

        // 2. Gửi thông điệp EMBED_RESIZE lên cửa sổ cha để tự động resize iframe
        const notifyHeight = () => {
            const height = getExactHeight();
            if (height > 0) {
                window.parent?.postMessage({ type: "EMBED_RESIZE", height }, "*");
            }
        };

        // 3. Kích hoạt thông báo chiều cao lần đầu
        notifyHeight();

        // 4. Đăng ký ResizeObserver theo dõi mọi thay đổi chiều cao DOM bên trong (khi ảnh load xong, font load xong)
        const targetEl = document.querySelector("article") || document.querySelector("main");
        let observer = null;
        if (targetEl) {
            observer = new ResizeObserver(notifyHeight);
            observer.observe(targetEl);
        }

        // 5. Chờ web fonts sẵn sàng để tính toán lại chiều cao chính xác
        if (document.fonts) {
            document.fonts.ready.then(notifyHeight);
        }

        // 6. Lắng nghe sự kiện window resize
        window.addEventListener("resize", notifyHeight);

        return () => {
            window.removeEventListener("resize", notifyHeight);
            observer?.disconnect();
        };
    }, [post, isLoading, error]);

    return {
        post,
        isLoading,
        error,
        user,
        authorUsername,
        postUrl,
        mediaUrls,
        formattedDate,
        isQuote,
        t,
    };
};

export default useEmbed;
