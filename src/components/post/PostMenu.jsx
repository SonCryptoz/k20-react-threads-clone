import { useTranslation } from "react-i18next";
import {
    MoreHorizontal,
    Link as LinkIcon,
    Bookmark,
    EyeOff,
    UserX,
    ShieldAlert,
    Ban,
    AlertCircle,
    Pencil,
    Trash2,
} from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import BlockUserModal from "@/components/modals/BlockUserModal";
import DeletePostModal from "@/components/modals/DeletePostModal";
import ReportModal from "@/components/modals/ReportModal";

import usePostMenu from "./hooks/usePostMenu";

/**
 * PostMenu
 * Component giao diện Menu 3 chấm cho bài viết:
 * - Tiếp nhận và hiển thị các hành động tương tác (Copy link, Save, Hide, Mute, Restrict, Block, Report, Edit, Delete)
 * - Toàn bộ logic nghiệp vụ được tách biệt vào hook `usePostMenu`
 */
const PostMenu = ({
    post,
    onDelete,
    onEdit,
    onHide,
    onSave,
    onBlock,
    trigger,
    align = "end",
}) => {
    const { t } = useTranslation();

    const {
        authorUsername,
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
        reportReasons,
    } = usePostMenu({
        post,
        onDelete,
        onEdit,
        onHide,
        onSave,
        onBlock,
    });

    return (
        <>
            <DropdownMenu>
                {/* Nút Trigger mở Menu */}
                {trigger ? (
                    <DropdownMenuTrigger onClick={(e) => e.stopPropagation()}>
                        {trigger}
                    </DropdownMenuTrigger>
                ) : (
                    <DropdownMenuTrigger
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded-full text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer outline-none shrink-0"
                        title={t("post.option")}
                    >
                        <MoreHorizontal size={18} />
                    </DropdownMenuTrigger>
                )}

                {/* Nội dung Popup Dropdown */}
                <DropdownMenuContent
                    align={align}
                    className="w-64 rounded-2xl bg-white dark:bg-[#181818] border border-neutral-200/90 dark:border-neutral-800 p-1.5 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Mục chung: Sao chép liên kết */}
                    <DropdownMenuItem
                        onClick={handleCopyLink}
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors"
                    >
                        <span className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                            {t("post.copy_link")}
                        </span>
                        <LinkIcon size={18} className="shrink-0" />
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="my-1 border-neutral-200/60 dark:border-neutral-800/60" />

                    {/* Mục chung: Lưu / Bỏ lưu vào bộ sưu tập */}
                    <DropdownMenuItem
                        onClick={handleToggleSave}
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors"
                    >
                        <span className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                            {isSaved ? t("post.unsave") : t("post.save")}
                        </span>
                        <Bookmark
                            size={18}
                            className={`shrink-0 transition-colors ${
                                isSaved
                                    ? "fill-neutral-900 dark:fill-neutral-100 text-neutral-900 dark:text-neutral-100"
                                    : ""
                            }`}
                        />
                    </DropdownMenuItem>

                    {/* ========================================= */}
                    {/* TRƯỜNG HỢP 1: BÀI VIẾT CỦA USER HIỆN TẠI   */}
                    {/* ========================================= */}
                    {isOwner ? (
                        <>
                            <DropdownMenuSeparator className="my-1 border-neutral-200/60 dark:border-neutral-800/60" />

                            {/* Chỉnh sửa bài viết */}
                            <DropdownMenuItem
                                onClick={handleEdit}
                                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors"
                            >
                                <span className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                                    {t("post.edit")}
                                </span>
                                <Pencil size={18} className="shrink-0" />
                            </DropdownMenuItem>

                            {/* Xóa bài viết (Màu đỏ, mở confirmation modal) */}
                            <DropdownMenuItem
                                variant="destructive"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsDeleteDialogOpen(true);
                                }}
                                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            >
                                <span className="font-medium text-sm text-red-500">
                                    {t("post.delete")}
                                </span>
                                <Trash2 size={18} className="text-red-500 shrink-0" />
                            </DropdownMenuItem>
                        </>
                    ) : (
                        /* ========================================= */
                        /* TRƯỜNG HỢP 2: BÀI VIẾT CỦA NGƯỜI KHÁC     */
                        /* ========================================= */
                        <>
                            {/* Không quan tâm */}
                            <DropdownMenuItem
                                onClick={handleNotInterested}
                                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors"
                            >
                                <span className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                                    {t("post.not_interested")}
                                </span>
                                <EyeOff size={18} className="shrink-0" />
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="my-1 border-neutral-200/60 dark:border-neutral-800/60" />

                            {/* Tắt thông báo từ tác giả */}
                            <DropdownMenuItem
                                onClick={handleMuteUser}
                                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors"
                            >
                                <span className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                                    {t("post.mute_user")}
                                </span>
                                <UserX size={18} className="shrink-0" />
                            </DropdownMenuItem>

                            {/* Hạn chế người dùng */}
                            <DropdownMenuItem
                                onClick={handleRestrictUser}
                                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors"
                            >
                                <span className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                                    {t("post.restrict_user")}
                                </span>
                                <ShieldAlert size={18} className="shrink-0" />
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="my-1 border-neutral-200/60 dark:border-neutral-800/60" />

                            {/* Chặn người dùng (Màu đỏ, mở confirmation modal) */}
                            <DropdownMenuItem
                                variant="destructive"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsBlockDialogOpen(true);
                                }}
                                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            >
                                <span className="font-medium text-sm text-red-500">
                                    {t("post.block_user")}
                                </span>
                                <Ban size={18} className="text-red-500 shrink-0" />
                            </DropdownMenuItem>

                            {/* Báo cáo bài viết (Màu đỏ, mở dialog chọn lý do) */}
                            <DropdownMenuItem
                                variant="destructive"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsReportDialogOpen(true);
                                }}
                                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            >
                                <span className="font-medium text-sm text-red-500">
                                    {t("post.report")}
                                </span>
                                <AlertCircle size={18} className="text-red-500 shrink-0" />
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Modal xác nhận chặn người dùng */}
            <BlockUserModal
                isOpen={isBlockDialogOpen}
                onOpenChange={setIsBlockDialogOpen}
                username={authorUsername}
                isBlocking={isBlocking}
                onConfirm={handleConfirmBlock}
            />

            {/* Modal xác nhận xóa bài viết */}
            <DeletePostModal
                isOpen={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                isDeleting={isDeleting}
                onConfirm={handleConfirmDelete}
            />

            {/* Modal báo cáo bài viết */}
            <ReportModal
                isOpen={isReportDialogOpen}
                onOpenChange={setIsReportDialogOpen}
                reportReason={reportReason}
                setReportReason={setReportReason}
                reportReasons={reportReasons}
                reportDescription={reportDescription}
                setReportDescription={setReportDescription}
                isSubmitting={isSubmittingReport}
                onSubmit={handleConfirmReport}
            />
        </>
    );
};

export default PostMenu;