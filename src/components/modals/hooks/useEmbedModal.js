import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import copy from "copy-to-clipboard";
import { toast } from "@/components/ui/toast";
import { useTheme } from "@/hooks/useTheme";
import { formatEmbedDate } from "@/utils/formatEmbedDate";

const escapeHtml = (str) => {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

/**
 * useEmbedModal
 * Custom hook quản lý toàn bộ logic cho EmbedModal:
 * - Khóa cuộn trang và lắng nghe phím Escape
 * - Lắng nghe postMessage từ iframe để tự động điều chỉnh iframeHeight
 * - Tạo URL nhúng và chuỗi HTML iframe code đồng bộ theo theme
 * - Xử lý sao chép mã nhúng vào clipboard kèm thông báo toast
 */
export const useEmbedModal = ({ isOpen, onClose, post }) => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const [iframeHeight, setIframeHeight] = useState(170);
    const [isCopied, setIsCopied] = useState(false);

    // Bắt phím Escape để đóng modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape" && isOpen) {
                onClose?.();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    // Lắng nghe thông báo chiều cao thực tế từ iframe để preview vừa khít không bị cuộn thừa
    useEffect(() => {
        const handleMessage = (e) => {
            if (e.data?.type === "EMBED_RESIZE" && typeof e.data.height === "number") {
                const newHeight = Math.max(100, Math.min(1000, e.data.height));
                setIframeHeight(newHeight);
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    // Gửi theme sang iframe nếu theme thay đổi trong lúc modal đang mở
    useEffect(() => {
        const iframeEl = document.querySelector("iframe[title='Embed Post Preview']");
        if (iframeEl?.contentWindow) {
            iframeEl.contentWindow.postMessage({ type: "THEME_CHANGE", theme }, "*");
        }
    }, [theme]);

    // Tạo URL trang embed
    const isRepost = Boolean(!post?.is_quote && post?.original_post);
    const targetPost = isRepost ? post.original_post : post;
    const authorUsername = targetPost?.user?.username || targetPost?.user?.name || "user";
    const postId = targetPost?.id;

    // URL bài viết gốc
    const postPermalink = useMemo(() => {
        if (!postId) return "";
        return `${window.location.origin}/${authorUsername}/post/${postId}`;
    }, [authorUsername, postId]);

    // URL trang embed phục vụ iframe preview
    const embedUrl = useMemo(() => {
        if (!postId) return "";
        const base = `${window.location.origin}/${authorUsername}/post/${postId}/embed`;
        return theme ? `${base}?theme=${theme}` : base;
    }, [authorUsername, postId, theme]);

    // Tạo chuỗi mã nhúng chuẩn Threads (sử dụng thẻ blockquote ngữ nghĩa với UI đúng tỉ lệ PostCard kèm script embed.js)
    const embedCode = useMemo(() => {
        if (!postPermalink || !post) return "";
        const scriptUrl = `${window.location.origin}/embed.js`;
        const activePost = (!post?.is_quote && post?.original_post ? post.original_post : post) || {};
        const user = activePost.user || {};
        const isDark = theme === "dark";

        // Bảng màu đồng bộ theo theme tương đương trang Embed
        const bg = isDark ? "#0c0c0c" : "#ffffff";
        const text = isDark ? "#f5f5f5" : "#0a0a0a";
        const border = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
        const subText = isDark ? "#a3a3a3" : "#737373";
        const btnBg = isDark ? "#262626" : "#f5f5f5";

        const userAvatar = user.avatar_url;
        const formattedDate = formatEmbedDate(activePost.created_at);
        const mediaUrls = Array.isArray(activePost.media_urls)
            ? activePost.media_urls
            : Array.isArray(activePost.images)
              ? activePost.images
              : [];
        const firstMedia = mediaUrls[0];
        const mediaUrl = typeof firstMedia === "string" ? firstMedia : firstMedia?.url;
        const isQuote = Boolean(activePost.is_quote && activePost.original_post);
        const quotedUser =
            activePost.original_post?.user?.username || activePost.original_post?.user?.name || "user";

        // 1. Header: Avatar + Tên + Nút xem trên Threads
        const avatarHtml = userAvatar
            ? `<img src="${userAvatar}" alt="${escapeHtml(authorUsername)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid ${border};flex-shrink:0;" />`
            : `<div style="width:36px;height:36px;border-radius:50%;background:${isDark ? "#262626" : "#e5e5e5"};display:flex;align-items:center;justify-content:center;color:${subText};font-size:14px;font-weight:700;flex-shrink:0;">${escapeHtml(authorUsername.charAt(0).toUpperCase())}</div>`;

        const headerHtml = `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;"><div style="display:flex;align-items:center;gap:10px;min-width:0;"><a href="${window.location.origin}/${authorUsername}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:flex;align-items:center;gap:10px;">${avatarHtml}<span style="font-weight:700;font-size:14px;color:${text};">${escapeHtml(authorUsername)}</span></a><span style="color:${subText};font-size:12px;">·</span><a href="${window.location.origin}/${authorUsername}" target="_blank" rel="noopener noreferrer" style="font-weight:600;font-size:14px;color:${text};text-decoration:none;">${t("post.follow", "Theo dõi")}</a></div><a href="${postPermalink}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:9999px;background:${btnBg};color:${text};font-size:12px;font-weight:600;text-decoration:none;flex-shrink:0;"><span>${t("post.view_on_threads", "Xem trên Threads")}</span><svg viewBox="0 0 976.98 1082" width="13" height="13" fill="currentColor" style="display:inline-block;"><path d="M770.347,500.347c-1.355-156.85-86.386-251.367-230.025-251.367-95.872,0-176.499,43.362-218.846,112.472l92.823,64.705c24.053-37.942,57.252-69.448,118.231-69.448,68.77,0,104.341,38.281,114.504,109.423-33.2-5.081-66.399-7.791-100.615-7.791-185.646,0-273.049,84.015-273.049,195.131,0,113.149,87.403,179.548,216.136,179.548,141.267,0,225.621-95.194,260.176-213.086,35.91,16.261,60.64,54.203,60.64,111.116,0,152.447-175.822,235.446-324.881,235.446-219.862,0-363.501-144.316-363.501-379.084,0-287.616,190.05-471.907,445.483-471.907,171.418,0,256.11,75.207,313.701,176.16l94.856-66.399C913.308,94.501,773.396,1,563.358,1,228.653,1,.999,238.478.999,583.008c0,315.057,222.911,497.992,488.507,497.992,219.523,0,441.418-128.055,441.418-347.24,0-114.504-65.721-190.389-160.577-233.413ZM485.441,718.854c-48.444,0-91.129-23.036-91.129-65.383,0-66.738,81.983-87.064,162.271-87.064,30.489,0,60.301,2.032,86.725,7.792-18.971,86.725-75.207,144.655-157.867,144.655Z"/></svg></a></div>`;

        // 2. Nội dung text
        const contentHtml = activePost.content
            ? `<div style="margin-top:14px;font-size:14px;line-height:1.55;white-space:pre-line;word-break:break-word;color:${text};">${escapeHtml(activePost.content)}</div>`
            : "";

        // 3. Media ảnh
        const mediaHtml = mediaUrl
            ? `<div style="margin-top:14px;border-radius:16px;overflow:hidden;border:1px solid ${border};"><img src="${mediaUrl}" alt="Media" style="width:100%;max-height:380px;object-fit:cover;display:block;" /></div>`
            : "";

        // 4. Quote bài gốc (nếu là bài Quote)
        const quoteHtml = isQuote
            ? `<div style="margin-top:14px;padding:12px;border-radius:14px;border:1px solid ${border};background:${isDark ? "#141414" : "#f9f9f9"};font-size:12px;"><div style="font-weight:600;margin-bottom:4px;color:${text};">@${escapeHtml(quotedUser)}</div><div style="color:${subText};line-height:1.4;">${escapeHtml(post.original_post?.content)}</div></div>`
            : "";

        // 5. Ngày tháng
        const dateHtml = formattedDate
            ? `<div style="margin-top:14px;font-size:12px;color:${subText};">${formattedDate}</div>`
            : "";

        // 6. Chỉ số tương tác
        const statsHtml = `<div style="margin-top:12px;padding-top:4px;display:flex;align-items:center;gap:16px;font-size:12px;font-weight:600;color:${subText};"><span>❤️ ${post.likes_count || 0}</span><span>💬 ${post.replies_count || 0}</span><span>🔁 ${post.reposts_count || 0}</span><span>✈️ ${post.shares_count || 0}</span></div>`;

        // Container style chuẩn tỉ lệ PostCard (max-width 540px, rounded 22px, padding 16px 20px)
        const bqStyle = `background:${bg};border:1px solid ${border};border-radius:22px;box-shadow:0 1px 3px rgba(0,0,0,0.06);color:${text};display:block;font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;margin:12px auto;max-width:540px;min-width:280px;padding:16px 20px;width:100%;box-sizing:border-box;`;

        return `<blockquote class="text-post-media" data-text-post-permalink="${postPermalink}" data-text-post-version="0" data-theme="${theme || 'light'}" id="tp-${postId}" style="${bqStyle}">${headerHtml}${contentHtml}${mediaHtml}${quoteHtml}${dateHtml}${statsHtml}</blockquote><script async src="${scriptUrl}"></script>`;
    }, [postPermalink, post, theme, authorUsername, postId, t]);

    // Sao chép mã nhúng vào clipboard
    const handleCopyCode = useCallback(() => {
        if (!embedCode) return;
        copy(embedCode);
        setIsCopied(true);
        toast.success(t("post.embed_code_copied", "Đã sao chép mã nhúng"));
        setTimeout(() => setIsCopied(false), 2000);
    }, [embedCode, t]);

    return {
        embedUrl,
        embedCode,
        iframeHeight,
        isCopied,
        handleCopyCode,
        t,
    };
};

export default useEmbedModal;
