import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import { useTheme } from "@/hooks/useTheme";
import postService from "@/services/postService";
import { getApiError } from "@/utils/getApiError";
import { useEmojiPopover } from "./useEmojiPopover";
import { useReplyMedia } from "./useReplyMedia";

/**
 * useReplyModal
 * Custom hook nhạc trưởng (Facade / Orchestrator) quản lý toàn bộ form Reply:
 * - Tích hợp useEmojiPopover (quản lý chọn & chèn emoji)
 * - Tích hợp useReplyMedia (quản lý upload ảnh/video và tải GIF ngầm)
 * - Quản lý nội dung (content), chủ đề (topic), quyền trả lời (permissions)
 * - Xử lý gửi API bình luận createReply và gọi callback hoàn tất
 */
export const useReplyModal = ({ post, onClose, onSuccess, mode = "reply" }) => {
    const { t, i18n } = useTranslation();
    const { user: currentUser } = useSelector((state) => state.auth);
    const { theme } = useTheme();

    // State lưu nội dung văn bản soạn thảo (content)
    const [content, setContent] = useState(mode === "edit" ? post?.content || "" : "");
    // State lưu quyền ai có thể trả lời bài viết ('everyone' | 'accounts_you_follow' | 'mentioned_only')
    const [replyPermission, setReplyPermission] = useState(
        mode === "edit" && post?.reply_permission ? post.reply_permission : "everyone",
    );
    // State quản lý menu chọn quyền trả lời đang mở hay đóng
    const [isPermissionMenuOpen, setIsPermissionMenuOpen] = useState(false);
    // State lưu tên chủ đề / hashtag gắn kèm bài viết
    const [topicName, setTopicName] = useState(mode === "edit" ? post?.topic_name || "" : "");
    // State quản lý việc hiển thị ô nhập chủ đề
    const [isTopicInputOpen, setIsTopicInputOpen] = useState(
        Boolean(mode === "edit" && post?.topic_name),
    );
    // State cờ đang trong tiến trình gửi bài viết / bình luận lên server
    const [isSubmitting, setIsSubmitting] = useState(false);
    // State lưu thông báo lỗi tổng quát khi gửi thất bại
    const [error, setError] = useState(null);
    // State lưu danh sách lỗi validation chi tiết theo từng trường (fieldErrors)
    const [fieldErrors, setFieldErrors] = useState({});
    // State lưu trữ bài viết gốc được lazy load nếu ở chế độ Edit bài Quote mà server chưa nạp sẵn original_post
    const [lazyOriginalPost, setLazyOriginalPost] = useState(null);

    // Trích xuất an toàn danh sách media hiện có của bài viết khi ở chế độ Edit
    const existingMediaUrls = useMemo(() => {
        if (mode !== "edit" || !post) return [];
        const raw = post.media_urls || post.images || post.media || [];
        if (!Array.isArray(raw)) return [];
        return raw
            .map((item) => (typeof item === "string" ? item : item?.url || item?.preview_url || ""))
            .filter(Boolean);
    }, [mode, post]);

    // Tự động nạp bài viết gốc được trích dẫn nếu ở chế độ Edit bài Quote mà server chưa nạp sẵn original_post
    useEffect(() => {
        if (
            mode === "edit" &&
            post?.is_quote &&
            !post?.original_post &&
            (post?.original_post_id || post?.original_post?.id)
        ) {
            let isCancelled = false;
            const targetId = post.original_post_id || post.original_post?.id;
            postService
                .getPost(targetId)
                .then((res) => {
                    if (!isCancelled) {
                        setLazyOriginalPost(res?.data || res);
                    }
                })
                .catch(() => {});
            return () => {
                isCancelled = true;
            };
        }
    }, [mode, post]);

    // Đối tượng bài viết trích dẫn (khi ở chế độ Quote hoặc Edit bài quote)
    const quotedPost =
        mode === "quote"
            ? post
            : mode === "edit" && (post?.is_quote || post?.original_post)
              ? post?.original_post || lazyOriginalPost
              : null;

    // Tự động xóa lỗi khi người dùng thay đổi nội dung soạn thảo
    const handleContentChange = (valueOrFn) => {
        setContent(valueOrFn);
        if (error) setError(null);
        if (Object.keys(fieldErrors).length > 0) setFieldErrors({});
    };

    const textareaRef = useRef(null);

    // State cho Modal cảnh báo "Bỏ thread?" (Discard Alert Dialog)
    const [isDiscardAlertOpen, setIsDiscardAlertOpen] = useState(false);

    // Kết nối hook quản lý Media & GIF
    const media = useReplyMedia({
        onGifError: () =>
            setError(
                mode === "edit"
                    ? t("post.edit_failed")
                    : mode === "quote"
                      ? t("post.quote_failed")
                      : t("post.reply_failed"),
            ),
        textareaRef,
    });

    // Kết nối hook quản lý Emoji Popover
    const emoji = useEmojiPopover({
        textareaRef,
        content,
        setContent: handleContentChange,
    });

    // Kiểm tra xem người dùng đã nhập/thay đổi bất kỳ nội dung, ảnh hay chủ đề nào chưa
    const hasDraftContent =
        mode === "edit"
            ? content.trim() !== (post?.content || "").trim() ||
              media.mediaItems.length > 0 ||
              topicName.trim() !== (post?.topic_name || "").trim() ||
              replyPermission !== (post?.reply_permission || "everyone")
            : content.trim().length > 0 ||
              media.mediaItems.length > 0 ||
              topicName.trim().length > 0;

    // Yêu cầu đóng modal: nếu có nội dung nháp thì hiển thị alert-dialog, nếu trống thì đóng ngay
    const handleRequestClose = useCallback(() => {
        if (isSubmitting) return;
        if (hasDraftContent) {
            setIsDiscardAlertOpen(true);
        } else {
            onClose?.();
        }
    }, [isSubmitting, hasDraftContent, onClose]);

    // Xác nhận hủy bỏ bản nháp và đóng modal
    const handleConfirmDiscard = () => {
        setIsDiscardAlertOpen(false);
        onClose?.();
    };

    // Tự động focus textarea sau khi modal mở
    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    // Bắt phím ESC (ưu tiên đóng các popover con, nếu có nội dung thì hỏi "Bỏ thread?")
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape" && !isSubmitting) {
                if (isDiscardAlertOpen) {
                    setIsDiscardAlertOpen(false);
                    e.stopPropagation();
                    return;
                }
                if (media.isGifPickerOpen) {
                    media.closeGifPicker();
                    e.stopPropagation();
                    return;
                }
                if (emoji.isEmojiPickerOpen) {
                    emoji.closeEmojiPicker();
                    e.stopPropagation();
                    return;
                }
                handleRequestClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
        isSubmitting,
        isDiscardAlertOpen,
        media,
        emoji,
        handleRequestClose,
    ]);

    // Xử lý submit gửi bình luận / bài viết / trích dẫn / cập nhật
    const handleSubmit = async (e) => {
        e?.preventDefault();
        const readyFiles = media.readyFiles;

        // 1. Kiểm tra validation: Không gửi khi nội dung trống và không có file, hoặc đang submit, hoặc media đang tải
        if (
            (!content.trim() && readyFiles.length === 0) ||
            isSubmitting ||
            media.isAnyMediaLoading
        ) {
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setFieldErrors({});

        try {
            // 2. Chuẩn bị FormData đóng gói dữ liệu
            const formData = new FormData();
            formData.append("content", content.trim());
            formData.append("reply_permission", replyPermission);
            if (topicName.trim()) {
                formData.append("topic_name", topicName.trim());
            }

            // 3. Đính kèm các file media sẵn sàng tải lên
            readyFiles.forEach((file) => {
                formData.append("media[]", file);
            });

            // 4. Gọi API tương ứng theo chế độ hoạt động (quote, edit, create, reply)
            const isFormData = formData instanceof FormData;
            const response =
                mode === "quote"
                    ? await postService.quotePost(post.id, formData, isFormData)
                    : mode === "edit"
                      ? await postService.updatePost(post.id, formData, isFormData)
                      : mode === "create"
                        ? await postService.createPost(formData, isFormData)
                        : await postService.createReply(post.id, formData, isFormData);

            // 5. Làm giàu dữ liệu bài viết (Enrichment) nếu là trích dẫn bài gốc để hiển thị tức thì trên UI
            const rawData = response?.data || response;
            const enrichedData =
                mode === "quote" && rawData && post
                    ? {
                          ...rawData,
                          is_quote: true,
                          original_post_id: post?.id || rawData.original_post_id,
                          original_post: {
                              ...(post || {}),
                              ...(rawData.original_post || {}),
                              media_urls:
                                  (post?.media_urls?.length ? post.media_urls : null) ||
                                  (post?.images?.length ? post.images : null) ||
                                  rawData.original_post?.media_urls ||
                                  rawData.original_post?.images ||
                                  [],
                              images:
                                  (post?.images?.length ? post.images : null) ||
                                  (post?.media_urls?.length ? post.media_urls : null) ||
                                  rawData.original_post?.images ||
                                  rawData.original_post?.media_urls ||
                                  [],
                              user: rawData.original_post?.user || post?.user,
                          },
                      }
                    : rawData;

            // 6. Gọi callback thông báo thành công và đóng modal
            onSuccess?.(enrichedData);
            onClose?.();
        } catch (err) {
            const fallbackError =
                mode === "edit"
                    ? t("post.edit_failed")
                    : mode === "quote"
                      ? t("post.quote_failed")
                      : mode === "create"
                        ? t("post.create_failed") || "Không thể tạo bài viết, vui lòng thử lại"
                        : t("post.reply_failed");
            const { message, fieldErrors: parsedFieldErrors } = getApiError(
                err,
                fallbackError
            );
            // Ưu tiên hiển thị thông báo lỗi cụ thể của từng trường (như content, media...), sau đó đến message chung hoặc fallback
            const firstFieldError = parsedFieldErrors
                ? Object.values(parsedFieldErrors)[0]
                : null;
            setError(firstFieldError || message || fallbackError);
            setFieldErrors(parsedFieldErrors || {});
        } finally {
            setIsSubmitting(false);
        }
    };

    // Danh sách các tùy chọn quyền trả lời
    const permissionOptions = [
        { key: "everyone", label: t("post.anyone_can_reply") },
        { key: "followers", label: t("post.following_can_reply") },
        { key: "mentions", label: t("post.mentioned_can_reply") },
    ];

    // Trạng thái nút Đăng / Lưu (Post / Save button)
    const isPostButtonActive =
        (content.trim().length > 0 ||
            media.readyFiles.length > 0 ||
            (mode === "edit" && existingMediaUrls.length > 0)) &&
        !isSubmitting &&
        !media.isAnyMediaLoading;

    const language = i18n.resolvedLanguage || i18n.language || "vi";

    return {
        // Thông tin người dùng & theme
        currentUser,
        theme,
        language,

        // Nội dung & Form
        content,
        setContent: handleContentChange,
        topicName,
        setTopicName,
        isTopicInputOpen,
        setIsTopicInputOpen,
        replyPermission,
        setReplyPermission,
        isPermissionMenuOpen,
        setIsPermissionMenuOpen,
        permissionOptions,
        textareaRef,

        // Media hiện có & Bài trích dẫn (khi ở chế độ Edit hoặc Quote)
        existingMediaUrls,
        quotedPost,

        // Quản lý Media (từ useReplyMedia)
        mediaItems: media.mediaItems,
        isAnyMediaLoading: media.isAnyMediaLoading,
        mediaFiles: media.mediaFiles,
        mediaPreviews: media.mediaPreviews,
        handleFileChange: media.handleFileChange,
        handleRemoveMedia: media.handleRemoveMedia,
        fileInputRef: media.fileInputRef,
        isGifPickerOpen: media.isGifPickerOpen,
        setIsGifPickerOpen: media.setIsGifPickerOpen,
        openGifPicker: media.openGifPicker,
        closeGifPicker: media.closeGifPicker,
        toggleGifPicker: media.toggleGifPicker,
        handleSelectGif: media.handleSelectGif,

        // Quản lý Emoji (từ useEmojiPopover)
        isEmojiPickerOpen: emoji.isEmojiPickerOpen,
        pickerPos: emoji.pickerPos,
        emojiBtnRef: emoji.emojiBtnRef,
        emojiPickerRef: emoji.emojiPickerRef,
        toggleEmojiPicker: emoji.toggleEmojiPicker,
        handleSelectEmoji: emoji.handleSelectEmoji,
        handleInsertEmoji: emoji.handleInsertEmoji,

        // Submit & Trạng thái
        isSubmitting,
        error,
        fieldErrors,
        isPostButtonActive,
        handleSubmit,

        // Cảnh báo Bỏ thread (Discard Alert Dialog)
        isDiscardAlertOpen,
        setIsDiscardAlertOpen,
        hasDraftContent,
        handleRequestClose,
        handleConfirmDiscard,
    };
};

export default useReplyModal;
