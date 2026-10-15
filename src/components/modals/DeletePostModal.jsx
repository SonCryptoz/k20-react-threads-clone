import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";

/**
 * DeletePostModal
 * Modal xác nhận xóa bài viết (Alert Dialog):
 * - Cảnh báo bài viết sẽ không thể khôi phục sau khi xóa
 * - Nút Hủy và nút Xóa (màu đỏ / destructive) kèm trạng thái Loading
 */
const DeletePostModal = ({
    isOpen,
    open,
    onOpenChange,
    onClose,
    isDeleting = false,
    onConfirm,
}) => {
    const { t } = useTranslation();

    const isModalOpen = isOpen !== undefined ? isOpen : Boolean(open);

    const handleOpenChange = (nextOpen) => {
        onOpenChange?.(nextOpen);
        if (!nextOpen) {
            onClose?.();
        }
    };

    return (
        <AlertDialog open={isModalOpen} onOpenChange={handleOpenChange}>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("post.delete_title")}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t("post.delete_description")}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                        {t("post.cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        variant="destructive"
                        onClick={(e) => {
                            e?.stopPropagation?.();
                            onConfirm?.(e);
                        }}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                        ) : null}
                        {t("post.delete_confirm")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default DeletePostModal;
