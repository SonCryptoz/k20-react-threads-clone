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
 * BlockUserModal
 * Modal xác nhận chặn người dùng (Alert Dialog):
 * - Hiển thị cảnh báo hậu quả khi chặn tài khoản
 * - Nút Hủy và nút Chặn kèm trạng thái Loading
 */
const BlockUserModal = ({
    isOpen,
    open,
    onOpenChange,
    onClose,
    username,
    isBlocking = false,
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
                    <AlertDialogTitle>
                        {t("post.block_title", { username })}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {t("post.block_description", { username })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isBlocking}>
                        {t("post.cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e?.stopPropagation?.();
                            onConfirm?.(e);
                        }}
                        disabled={isBlocking}
                    >
                        {isBlocking ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                        ) : null}
                        {t("post.block_confirm")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default BlockUserModal;
