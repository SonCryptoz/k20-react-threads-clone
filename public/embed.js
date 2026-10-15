/**
 * Threads Embed SDK (embed.js)
 * Script tự động biến đổi các thẻ blockquote thành iframe nhúng bài viết:
 * - Tìm kiếm tất cả các thẻ <blockquote class="text-post-media" data-text-post-permalink="...">
 * - Tạo iframe trỏ đến URL nhúng tương ứng
 * - Lắng nghe postMessage để tự động đồng bộ chiều cao responsive
 */
(function () {
    function initEmbeds() {
        var blockquotes = document.querySelectorAll(
            "blockquote.text-post-media[data-text-post-permalink], blockquote[data-text-post-permalink]"
        );

        blockquotes.forEach(function (bq) {
            if (bq.getAttribute("data-embed-loaded") === "true") return;
            bq.setAttribute("data-embed-loaded", "true");

            var permalink = bq.getAttribute("data-text-post-permalink");
            if (!permalink) return;

            // Đảm bảo URL kết thúc bằng /embed
            var embedUrl = permalink.replace(/\/+$/, "");
            if (!embedUrl.endsWith("/embed")) {
                embedUrl += "/embed";
            }

            var theme = bq.getAttribute("data-theme");
            if (theme && embedUrl.indexOf("theme=") === -1) {
                embedUrl += (embedUrl.indexOf("?") === -1 ? "?" : "&") + "theme=" + encodeURIComponent(theme);
            }

            var bqHeight = bq.offsetHeight;

            var iframe = document.createElement("iframe");
            iframe.src = embedUrl;
            iframe.title = "Threads Post";
            iframe.style.width = "100%";
            iframe.style.maxWidth = "540px";
            iframe.style.height = bqHeight ? bqHeight + "px" : "170px";
            iframe.style.border = "none";
            iframe.style.overflow = "hidden";
            iframe.style.borderRadius = "22px";
            iframe.style.display = "block";
            iframe.style.margin = "12px auto";
            iframe.setAttribute("loading", "lazy");

            // Lắng nghe resize từ iframe postMessage
            window.addEventListener("message", function (e) {
                if (
                    e.data &&
                    e.data.type === "EMBED_RESIZE" &&
                    typeof e.data.height === "number" &&
                    (!e.source || iframe.contentWindow === e.source)
                ) {
                    iframe.style.height = e.data.height + "px";
                }
            });

            // Ẩn blockquote ban đầu và chèn iframe vào vị trí
            bq.style.display = "none";
            if (bq.parentNode) {
                bq.parentNode.insertBefore(iframe, bq);
            }
        });
    }

    // Cung cấp API window.ThreadsEmbed để các trang SPA có thể chủ động kích hoạt lại
    window.ThreadsEmbed = {
        process: initEmbeds,
        init: initEmbeds,
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initEmbeds);
    } else {
        initEmbeds();
    }
})();
