import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";

/**
 * ReportModal
 * Modal báo cáo bài viết:
 * - Dialog chọn lý do báo cáo bằng RadioGroup
 * - Textarea nhập mô tả chi tiết bổ sung (tùy chọn)
 * - Nút Hủy và Gửi báo cáo kèm trạng thái Loading
 */
const ReportModal = ({
    isOpen,
    open,
    onOpenChange,
    onClose,
    reportReason,
    setReportReason,
    reportReasons = [],
    reportDescription,
    setReportDescription,
    isSubmitting = false,
    onSubmit,
}) => {
    const { t } = useTranslation();

    const isModalOpen = isOpen !== undefined ? isOpen : Boolean(open);

    const handleOpenChange = (nextOpen) => {
        onOpenChange?.(nextOpen);
        if (!nextOpen) {
            onClose?.();
        }
    };

    const handleCancel = (e) => {
        e?.stopPropagation?.();
        handleOpenChange(false);
    };

    const handleSubmit = (e) => {
        e?.stopPropagation?.();
        onSubmit?.(e);
    };

    return (
        <Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle>{t("post.report_title")}</DialogTitle>
                    <DialogDescription>{t("post.report_desc")}</DialogDescription>
                </DialogHeader>

                {/* Danh sách các lý do báo cáo */}
                <div className="py-2">
                    <RadioGroup
                        value={reportReason}
                        onValueChange={setReportReason}
                        className="gap-1.5"
                    >
                        {reportReasons.map((reason) => (
                            <label
                                key={reason.key}
                                htmlFor={`reason-${reason.key}`}
                                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                                    reportReason === reason.key
                                        ? "border-neutral-900 dark:border-white bg-neutral-100/60 dark:bg-neutral-800/60 font-medium"
                                        : "border-transparent hover:bg-neutral-100/50 dark:hover:bg-neutral-800/40 text-neutral-700 dark:text-neutral-300"
                                }`}
                            >
                                <span className="text-sm select-none">
                                    {t(reason.translationKey)}
                                </span>
                                <RadioGroupItem
                                    value={reason.key}
                                    id={`reason-${reason.key}`}
                                />
                            </label>
                        ))}
                    </RadioGroup>

                    {/* Ô nhập ghi chú mô tả bổ sung (tùy chọn) */}
                    <div className="mt-3">
                        <textarea
                            value={reportDescription}
                            onChange={(e) => setReportDescription(e.target.value)}
                            placeholder={t("post.report_placeholder")}
                            rows={3}
                            className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isSubmitting}
                        className="rounded-xl px-4 py-2 font-medium cursor-pointer"
                    >
                        {t("post.cancel")}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !reportReason}
                        className="bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-semibold rounded-xl px-5 py-2 cursor-pointer"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                        ) : null}
                        {t("post.report_submit")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ReportModal;
