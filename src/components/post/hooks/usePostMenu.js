import { useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import copy from "copy-to-clipboard";
import { toast } from "@/components/ui/toast";
import postService from "@/services/postService";
import userService from "@/services/userService";

/**
 * Danh sách các lý do báo cáo bài viết
 */
export const REPORT_REASONS = [
    { key: "spam", translationKey: "post.report_reason_spam" },
    { key: "hate_speech", translationKey: "post.report_reason_hate_speech" },
    { key: "nudity", translationKey: "post.report_reason_nudity" },
    { key: "harassment", translationKey: "post.report_reason_harassment" },
    { key: "fraud", translationKey: "post.report_reason_fraud" },
    { key: "false_information", translationKey: "post.report_reason_false_information" },
    { key: "other", translationKey: "post.report_reason_other" },
];

/**
 * usePostMenu
 * Custom hook quản lý toàn bộ nghiệp vụ của Option Menu cho bài viết:
 * - Sao chép liên kết URL
 * - Lưu / Bỏ lưu vào bộ sưu tập
 * - Không quan tâm (ẩn bài viết khỏi feed)
 * - Tắt thông báo từ tác giả bài viết
 * - Hạn chế người dùng
 * - Chặn người dùng (kèm xác nhận)
 * - Báo cáo bài viết (kèm chọn lý do và mô tả)
 * - Chỉnh sửa / Xóa bài viết (khi là bài viết của chính mình)
 */
export const usePostMenu = ({ post, onDelete, onEdit, onHide, onSave, onBlock } = {}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { user: currentUser, isAuthenticated } = useSelector((state) => state.auth);

    // Thông tin bài viết & tác giả
    const postId = post?.id;
    const postAuthor = post?.user || {};
    const authorUsername = postAuthor.username || postAuthor.name || "user";
    const authorId = postAuthor.id || post?.user_id;

    // Kiểm tra xem bài viết có thuộc về user hiện tại hay không
    const isOwner = Boolean(
        currentUser &&
            ((currentUser.id != null && authorId != null && String(currentUser.id) === String(authorId)) ||
                (currentUser.username && authorUsername && currentUser.username === authorUsername)),
    );

    // State Lưu / Bỏ lưu bài viết
    const [isSaved, setIsSaved] = useState(
        Boolean(post?.is_saved ?? post?.is_saved_by_auth ?? post?.is_bookmarked ?? false),
    );

    // State quản lý Modals
    const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

    // State Form Báo cáo
    const [reportReason, setReportReason] = useState("spam");
    const [reportDescription, setReportDescription] = useState("");

    // State Loading
    const [isBlocking, setIsBlocking] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);

    // Kiểm tra đăng nhập (Auth guard)
    const requireAuth = useCallback(() => {
        if (!isAuthenticated) {
            navigate("/login", { state: { from: location } });
            return false;
        }
        return true;
    }, [isAuthenticated, navigate, location]);

    // Sao chép liên kết URL bài viết
    const handleCopyLink = useCallback(() => {
        if (!postId) return;
        const postUrl = `${window.location.origin}/${authorUsername}/post/${postId}`;
        copy(postUrl);
        toast.success(t("post.link_copied"));
    }, [postId, authorUsername, t]);

    // Lưu / Bỏ lưu bài viết (Toggle Save)
    const handleToggleSave = useCallback(async () => {
        if (!requireAuth() || !postId) return;
        const nextSaved = !isSaved;
        setIsSaved(nextSaved);

        try {
            await postService.savePost(postId);
            if (nextSaved) {
                toast.success(t("post.save_success"));
            } else {
                toast.info(t("post.unsave_success"));
            }
            onSave?.(postId, nextSaved);
        } catch (err) {
            setIsSaved(!nextSaved); // Rollback nếu lỗi
            toast.error(err?.response?.data?.message || t("post.repost_failed"));
        }
    }, [requireAuth, postId, isSaved, t, onSave]);

    // Không quan tâm (Hide post)
    const handleNotInterested = useCallback(async () => {
        if (!requireAuth() || !postId) return;
        try {
            await postService.hidePost(postId);
            toast.success(t("post.hide_success"));
            onHide?.(postId);
        } catch (err) {
            toast.error(err?.response?.data?.message || t("post.repost_failed"));
        }
    }, [requireAuth, postId, t, onHide]);

    // Tắt thông báo từ tác giả (Mute)
    const handleMuteUser = useCallback(async () => {
        if (!requireAuth() || !authorId) return;
        try {
            await userService.muteUser(authorId);
            toast.success(t("post.mute_success", { username: authorUsername }));
        } catch (err) {
            toast.error(err?.response?.data?.message || t("post.repost_failed"));
        }
    }, [requireAuth, authorId, authorUsername, t]);

    // Hạn chế người dùng (Restrict)
    const handleRestrictUser = useCallback(async () => {
        if (!requireAuth() || !authorId) return;
        try {
            await userService.restrictUser(authorId);
            toast.success(t("post.restrict_success", { username: authorUsername }));
        } catch (err) {
            toast.error(err?.response?.data?.message || t("post.repost_failed"));
        }
    }, [requireAuth, authorId, authorUsername, t]);

    // Xác nhận Chặn người dùng (Block)
    const handleConfirmBlock = useCallback(async () => {
        if (!requireAuth() || !authorId) return;
        setIsBlocking(true);
        try {
            await userService.blockUser(authorId);
            setIsBlockDialogOpen(false);
            toast.success(t("post.block_success", { username: authorUsername }));
            onBlock?.(authorId);
        } catch (err) {
            toast.error(err?.response?.data?.message || t("post.repost_failed"));
        } finally {
            setIsBlocking(false);
        }
    }, [requireAuth, authorId, authorUsername, t, onBlock]);

    // Gửi báo cáo bài viết (Report)
    const handleConfirmReport = useCallback(async () => {
        if (!requireAuth() || !postId) return;
        setIsSubmittingReport(true);
        try {
            await postService.reportPost(postId, {
                reason: reportReason,
                description: reportDescription.trim(),
            });
            setIsReportDialogOpen(false);
            setReportDescription("");
            setReportReason("spam");
            toast.success(t("post.report_success"));
        } catch (err) {
            toast.error(err?.response?.data?.message || t("post.report_failed"));
        } finally {
            setIsSubmittingReport(false);
        }
    }, [requireAuth, postId, reportReason, reportDescription, t]);

    // Chỉnh sửa bài viết (Edit)
    const handleEdit = useCallback(() => {
        if (!requireAuth()) return;
        onEdit?.(post);
    }, [requireAuth, onEdit, post]);

    // Xác nhận Xóa bài viết (Delete)
    const handleConfirmDelete = useCallback(async () => {
        if (!requireAuth() || !postId) return;
        setIsDeleting(true);
        try {
            await postService.deletePost(postId);
            setIsDeleteDialogOpen(false);
            toast.success(t("post.delete_success"));
            onDelete?.(postId);
        } catch (err) {
            toast.error(err?.response?.data?.message || t("post.delete_failed"));
        } finally {
            setIsDeleting(false);
        }
    }, [requireAuth, postId, t, onDelete]);

    return {
        authorUsername,
        authorId,
        isOwner,
        isSaved,
        handleCopyLink,
        handleToggleSave,
        handleNotInterested,
        handleMuteUser,
        handleRestrictUser,
        handleEdit,
        // Block dialog
        isBlockDialogOpen,
        setIsBlockDialogOpen,
        isBlocking,
        handleConfirmBlock,
        // Delete dialog
        isDeleteDialogOpen,
        setIsDeleteDialogOpen,
        isDeleting,
        handleConfirmDelete,
        // Report dialog
        isReportDialogOpen,
        setIsReportDialogOpen,
        isSubmittingReport,
        reportReason,
        setReportReason,
        reportDescription,
        setReportDescription,
        handleConfirmReport,
        reportReasons: REPORT_REASONS,
    };
};

export default usePostMenu;
