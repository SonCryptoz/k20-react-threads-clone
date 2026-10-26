import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import { formatTimeAgo } from "@/utils/formatTime";
import postService from "@/services/postService";
import userCache from "@/utils/userCache";

// Trích xuất an toàn mảng các URL ảnh/video (hỗ trợ cả mảng string lẫn mảng object { url })
export const getMediaUrls = (target) => {
    if (!target) return [];
    const raw = target.media_urls || target.images || target.media || [];
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item) => (typeof item === "string" ? item : item?.url || item?.preview_url || ""))
        .filter(Boolean);
};

// Bộ nhớ cache lưu các ID bài viết đã xác định là không tồn tại (404/deleted) để ngăn gọi lại nhiều lần
const notFoundPostIds = new Set();

/**
 * usePostCard
 * Custom hook quản lý toàn bộ logic hiển thị và tương tác của component PostCard:
 * - Nhận diện bài viết repost thuần túy, bài viết trích dẫn (quote post) hoặc bài viết thông thường
 * - Trích xuất thông tin tác giả, thời gian, hình ảnh/video của bài viết hiển thị (displayPost)
 * - Tự động nạp chi tiết bổ sung (fallback lazy-loading) khi server trả về dữ liệu nông (thiếu media_urls, thiếu quote)
 * - Đồng bộ hóa trạng thái tương tác like và repost chuẩn xác
 * - Quản lý các sự kiện click điều hướng (click card, click avatar/tên tác giả, click người đăng lại, click card trích dẫn)
 */
export const usePostCard = ({ post, isDetail = false, onFollow }) => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { user: currentUser } = useSelector((state) => state.auth);
    const [isFollowLoading, setIsFollowLoading] = useState(false);

    // Fallback lazy loaded state trong trường hợp bài viết thiếu trường dữ liệu (ví dụ API trả về thiếu quote hoặc media)
    const [lazyQuotedPost, setLazyQuotedPost] = useState(null);
    const [lazyDisplayPost, setLazyDisplayPost] = useState(null);

    // Phân biệt bài viết đăng lại (Pure repost: post.is_quote = false & có post.original_post)
    const isRepost = Boolean(post && !post.is_quote && post.original_post);

    // Người thực hiện repost (nếu có)
    const reposter = isRepost ? post?.user || {} : null;
    const isCurrentUserReposter = Boolean(
        currentUser?.id && reposter?.id && String(currentUser.id) === String(reposter.id)
    );

    // Bài viết được hiển thị thực tế (bài gốc nếu là repost)
    const baseDisplayPost = isRepost ? post.original_post : post;
    const displayPost = lazyDisplayPost
        ? { ...lazyDisplayPost, ...baseDisplayPost }
        : baseDisplayPost;
    const author = displayPost?.user || post?.user || {};

    // Kiểm tra xem tác giả có phải chính là tài khoản hiện tại hay không
    const isCurrentUser = Boolean(
        currentUser?.id && author?.id && String(currentUser.id) === String(author.id)
    );

    // Trạng thái đã theo dõi tác giả (hỗ trợ cả is_followed_by_auth lẫn is_following)
    const isFollowing = Boolean(author?.is_followed_by_auth ?? author?.is_following);

    const language = i18n.resolvedLanguage || i18n.language || "vi";
    const dateLocale = language.startsWith("en") ? "en-US" : "vi-VN";
    const formattedTime = formatTimeAgo(displayPost?.created_at || post?.created_at, t, dateLocale);

    const mediaUrls = getMediaUrls(displayPost);

    const quoteTargetId = displayPost?.is_quote
        ? displayPost?.original_post_id || displayPost?.original_post?.id
        : null;

    // Kiểm tra xem bài viết hiển thị có chứa trích dẫn hay không
    const displayQuote = Boolean(
        displayPost?.is_quote &&
            (displayPost?.original_post || lazyQuotedPost || displayPost?.original_post_id)
    );
    const baseQuotedPost = isRepost ? displayPost?.original_post : post?.original_post;
    const quotedPost = lazyQuotedPost
        ? { ...(baseQuotedPost || {}), ...lazyQuotedPost }
        : baseQuotedPost;
    const quotedAuthor = quotedPost?.user || {};
    const quotedFormattedTime = quotedPost?.created_at
        ? formatTimeAgo(quotedPost.created_at, t, dateLocale)
        : "";
    const quotedMediaUrls = getMediaUrls(quotedPost);

    // Xác định bài viết trích dẫn không khả dụng (bài gốc đã bị xóa trên server hoặc 404)
    const isQuoteUnavailable = Boolean(
        displayPost?.is_quote &&
            !quotedPost &&
            (displayPost?.original_post === null ||
                (quoteTargetId && notFoundPostIds.has(String(quoteTargetId))))
    );

    // Tự động nạp dữ liệu bài gốc nếu bị thiếu media_urls
    useEffect(() => {
        if (isRepost && baseDisplayPost?.id && baseDisplayPost.media_urls === undefined) {
            if (notFoundPostIds.has(String(baseDisplayPost.id))) return;
            let isCancelled = false;
            postService
                .getPost(baseDisplayPost.id)
                .then((res) => {
                    if (!isCancelled) {
                        const detail = res?.data || res;
                        if (detail && detail.id) {
                            setLazyDisplayPost(detail);
                        } else {
                            notFoundPostIds.add(String(baseDisplayPost.id));
                        }
                    }
                })
                .catch(() => {
                    notFoundPostIds.add(String(baseDisplayPost.id));
                });
            return () => {
                isCancelled = true;
            };
        }
    }, [isRepost, baseDisplayPost?.id, baseDisplayPost?.media_urls]);

    // Tự động nạp bài viết được trích dẫn nếu server chưa trả về đối tượng original_post
    useEffect(() => {
        // 1. Nếu server đã trả về original_post: null -> bài gốc đã bị xóa, không gọi API vô ích
        if (displayPost?.is_quote && displayPost?.original_post === null) {
            return;
        }

        // 2. Nếu ID bài gốc đã xác định là 404/not found trước đó -> không gọi lại
        if (quoteTargetId && notFoundPostIds.has(String(quoteTargetId))) {
            return;
        }

        // 3. Chỉ gọi khi trường original_post hoàn toàn undefined (chưa được eager load từ server)
        // hoặc khi original_post bị thiếu media_urls/images
        const isOriginalPostMissingMedia = Boolean(
            displayPost?.original_post &&
                displayPost.original_post.media_urls === undefined &&
                displayPost.original_post.images === undefined,
        );

        if (
            displayPost?.is_quote &&
            (displayPost?.original_post === undefined || isOriginalPostMissingMedia) &&
            !lazyQuotedPost &&
            quoteTargetId
        ) {
            let isCancelled = false;
            postService
                .getPost(quoteTargetId)
                .then((res) => {
                    if (!isCancelled) {
                        const detail = res?.data || res;
                        if (detail && detail.id) {
                            setLazyQuotedPost(detail);
                        } else {
                            notFoundPostIds.add(String(quoteTargetId));
                        }
                    }
                })
                .catch(() => {
                    notFoundPostIds.add(String(quoteTargetId));
                });
            return () => {
                isCancelled = true;
            };
        }
    }, [
        displayPost?.is_quote,
        displayPost?.original_post,
        quoteTargetId,
        lazyQuotedPost,
    ]);

    // Đồng bộ lại UI thẻ bài viết tức thì khi nhận được sự kiện tương tác toàn cục
    const targetPostId = String(displayPost?.id || post?.id || "");
    const [, setInteractionTick] = useState(0);

    useEffect(() => {
        if (!targetPostId) return;
        const handleInteractionUpdated = (e) => {
            const updatedId = e.detail?.postId;
            if (updatedId && updatedId === targetPostId) {
                setInteractionTick((tick) => tick + 1);
            }
        };
        window.addEventListener("post:interaction_updated", handleInteractionUpdated);
        return () => {
            window.removeEventListener("post:interaction_updated", handleInteractionUpdated);
        };
    }, [targetPostId]);

    // Lấy thông tin tương tác mới nhất từ single source of truth (userCache)
    const cachedInteraction = userCache.getPostInteraction(targetPostId);

    // Xác định trạng thái is_liked và is_reposted chính xác từ cachedInteraction, displayPost và post
    const isLiked = (() => {
        if (cachedInteraction) {
            if (cachedInteraction.is_liked_by_auth !== undefined) {
                return Boolean(cachedInteraction.is_liked_by_auth);
            }
            if (cachedInteraction.is_liked !== undefined) {
                return Boolean(cachedInteraction.is_liked);
            }
        }
        if (isRepost) {
            if (displayPost?.is_liked_by_auth !== undefined) {
                return Boolean(displayPost.is_liked_by_auth);
            }
            if (displayPost?.is_liked !== undefined) {
                return Boolean(displayPost.is_liked);
            }
            if (post?.is_liked_by_auth !== undefined) {
                return Boolean(post.is_liked_by_auth);
            }
            return Boolean(post?.is_liked);
        }
        if (post?.is_liked_by_auth !== undefined) {
            return Boolean(post.is_liked_by_auth);
        }
        return Boolean(post?.is_liked);
    })();

    const isReposted = (() => {
        if (cachedInteraction) {
            if (cachedInteraction.is_reposted_by_auth !== undefined) {
                return Boolean(cachedInteraction.is_reposted_by_auth);
            }
            if (cachedInteraction.is_reposted !== undefined) {
                return Boolean(cachedInteraction.is_reposted);
            }
        }
        if (isRepost) {
            if (isCurrentUserReposter) {
                // Chính currentUser là người repost bài này (ví dụ trong tab Reposts của chính mình):
                // Mặc định là true, trừ khi displayPost đã được toggle thành false (vừa bấm hủy đăng lại)
                if (displayPost?.is_reposted_by_auth !== undefined) {
                    return Boolean(displayPost.is_reposted_by_auth);
                }
                if (displayPost?.is_reposted !== undefined) {
                    return Boolean(displayPost.is_reposted);
                }
                return true;
            }
            // Người khác là người repost (ví dụ ducminh01 repost):
            // Nút repost của currentUser chỉ active khi chính currentUser cũng đã repost bài gốc này!
            return Boolean(
                displayPost?.is_reposted_by_auth !== undefined
                    ? displayPost.is_reposted_by_auth
                    : displayPost?.is_reposted !== undefined
                      ? displayPost.is_reposted
                      : false
            );
        }
        // Bài viết thông thường
        return Boolean(
            post?.is_reposted_by_auth !== undefined
                ? post.is_reposted_by_auth
                : post?.is_reposted
        );
    })();

    const effectiveLikesCount = Math.max(
        0,
        cachedInteraction?.likes_count !== undefined
            ? cachedInteraction.likes_count
            : (displayPost?.likes_count ?? post?.likes_count ?? 0),
    );

    const effectiveRepostsAndQuotesCount = Math.max(
        0,
        cachedInteraction?.reposts_and_quotes_count !== undefined
            ? cachedInteraction.reposts_and_quotes_count
            : cachedInteraction?.reposts_count !== undefined
              ? cachedInteraction.reposts_count
              : (displayPost?.reposts_and_quotes_count ??
                 displayPost?.reposts_count ??
                 post?.reposts_and_quotes_count ??
                 post?.reposts_count ??
                 0),
    );

    // Bài viết hiệu dụng được chuẩn hóa để truyền cho InteractionBar và PostMenu (bảo toàn ID bài gốc và repost_record_id)
    const effectivePost = isRepost
        ? {
              ...displayPost,
              id: displayPost.id,
              // Lưu ID của bản ghi repost để khi hủy repost thì gọi đúng endpoint hoặc xóa đúng thẻ
              repost_record_id: isCurrentUserReposter ? post.id : undefined,
              user: author,
              likes_count: effectiveLikesCount,
              replies_count: displayPost.replies_count ?? post.replies_count ?? 0,
              reposts_and_quotes_count: effectiveRepostsAndQuotesCount,
              is_liked: isLiked,
              is_liked_by_auth: isLiked,
              is_reposted: isReposted,
              is_reposted_by_auth: isReposted,
          }
        : {
              ...post,
              likes_count: effectiveLikesCount,
              replies_count: post?.replies_count ?? 0,
              reposts_and_quotes_count: effectiveRepostsAndQuotesCount,
              is_liked: isLiked,
              is_liked_by_auth: isLiked,
              is_reposted: isReposted,
              is_reposted_by_auth: isReposted,
          };

    // Xử lý khi click vào toàn bộ thẻ bài viết để chuyển hướng sang trang chi tiết bài viết (PostDetail)
    const handleCardClick = (e) => {
        // Đang ở sẵn trang chi tiết -> không điều hướng lại
        if (isDetail) return;
        
        // Chỉ xử lý khi click xuất phát từ chính bên trong phần tử DOM của thẻ article (loại bỏ React Portals)
        if (!e.currentTarget.contains(e.target)) return;

        // Nếu trong DOM đang tồn tại bất kỳ dropdown menu nào đang mở (hoặc backdrop đang hiển thị để dismiss),
        // chặn điều hướng ngay lập tức để click tắt menu không bị vô tình nhảy vào trang chi tiết bài viết
        const hasOpenDropdown = Boolean(
            document.querySelector(
                "[data-slot='dropdown-menu-content'], [data-slot='dropdown-menu-backdrop']"
            )
        );
        if (hasOpenDropdown) return;

        // Bỏ qua các phần tử tương tác bên trong bài viết (nút bấm, liên kết, input, dropdown menu, backdrop, modal...)
        if (
            e.target.closest(
                "button, a, input, textarea, label, [role='button'], [data-slot='dropdown-menu-content'], [data-slot='dropdown-menu-item'], [data-slot='dropdown-menu-backdrop'], [data-slot='alert-dialog-content'], [data-slot='alert-dialog-overlay'], [data-slot='dialog-content'], [data-slot='dialog-overlay'], [role='dialog'], [role='alertdialog']",
            )
        )
            return;
        const authorUsername = author.username || author.name || "user";
        navigate(`/${authorUsername}/post/${displayPost.id}`);
    };

    // Xử lý khi click vào avatar hoặc tên của tác giả bài viết
    const handleAuthorClick = (e) => {
        // Chặn nổi bọt sự kiện lên thẻ Card cha để không kích hoạt handleCardClick
        e.stopPropagation();
        if (author.username) {
            // Lưu thông tin tác giả vào cache trước khi điều hướng để trang Profile hiển thị avatar ngay lập tức
            userCache.saveUser(author);
            navigate(`/${author.username}`, { state: { user: author } });
        }
    };

    // Xử lý khi click vào tên người đăng lại (Reposter) trên header của bài viết
    const handleReposterClick = (e) => {
        e.stopPropagation();
        if (reposter?.username) {
            userCache.saveUser(reposter);
            navigate(`/${reposter.username}`, { state: { user: reposter } });
        }
    };

    // Xử lý khi click vào thẻ bài viết được trích dẫn (Quoted Card)
    const handleQuotedCardClick = (e) => {
        e.stopPropagation();
        const qUsername = quotedAuthor.username || quotedAuthor.name || "user";
        if (quotedPost?.id) {
            navigate(`/${qUsername}/post/${quotedPost.id}`);
        }
    };

    // Xử lý khi click nút Theo dõi tác giả ngay trên header bài viết
    const handleFollowClick = async (e) => {
        e.stopPropagation();
        if (isFollowLoading) return;
        setIsFollowLoading(true);
        try {
            await onFollow?.(author);
        } finally {
            setIsFollowLoading(false);
        }
    };

    return {
        currentUser,
        isCurrentUser,
        isFollowing,
        isFollowLoading,
        handleFollowClick,
        isRepost,
        reposter,
        isCurrentUserReposter,
        displayPost,
        author,
        formattedTime,
        mediaUrls,
        displayQuote,
        quotedPost,
        quotedAuthor,
        quotedFormattedTime,
        quotedMediaUrls,
        isQuoteUnavailable,
        effectivePost,
        handleCardClick,
        handleAuthorClick,
        handleReposterClick,
        handleQuotedCardClick,
        t,
    };
};

export default usePostCard;
