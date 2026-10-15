import { SlidersHorizontal, Check, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

/**
 * ReplyFooter
 * Component chân modal phản hồi:
 * - Nút cấu hình quyền trả lời (Reply options dropdown)
 * - Nút Đăng (Post button) với trạng thái disabled / loading
 */
const ReplyFooter = ({
    replyPermission,
    setReplyPermission,
    isPermissionMenuOpen,
    setIsPermissionMenuOpen,
    permissionOptions,
    handleSubmit,
    isPostButtonActive,
    isSubmitting,
    mode = "reply",
}) => {
    const { t } = useTranslation();

    return (
        <footer className="px-4 py-3 flex items-center justify-between border-t-[1.5px] border-neutral-200/80 dark:border-neutral-700/80 bg-neutral-50/40 dark:bg-[#181818] shrink-0 relative select-none">
            {/* Nút cấu hình Reply Options */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsPermissionMenuOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                >
                    <SlidersHorizontal size={14} />
                    <span>{t("post.reply_options")}</span>
                </button>

                {/* Menu popup chọn đối tượng */}
                {isPermissionMenuOpen && (
                    <div className="absolute bottom-full left-0 mb-2 w-56 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#202020] shadow-xl p-1.5 z-10 animate-in fade-in slide-in-from-bottom-2">
                        {permissionOptions.map((opt) => (
                            <button
                                key={opt.key}
                                type="button"
                                onClick={() => {
                                    setReplyPermission(opt.key);
                                    setIsPermissionMenuOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                            >
                                <span
                                    className={
                                        replyPermission === opt.key
                                            ? "font-semibold text-neutral-950 dark:text-white"
                                            : "text-neutral-700 dark:text-neutral-300"
                                    }
                                >
                                    {opt.label}
                                </span>
                                {replyPermission === opt.key && (
                                    <Check size={14} className="text-sky-500" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Nút Đăng (Post) sử dụng shadcn Button */}
            <Button
                type="button"
                onClick={handleSubmit}
                disabled={!isPostButtonActive}
                className={`rounded-xl px-4.5 py-1.5 font-semibold text-sm transition-all cursor-pointer shadow-xs ${
                    isPostButtonActive
                        ? "bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 active:scale-95"
                        : "opacity-40 cursor-not-allowed bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600"
                }`}
            >
                {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-inherit" />
                ) : mode === "edit" ? (
                    t("post.save_button")
                ) : (
                    t("post.post_button")
                )}
            </Button>
        </footer>
    );
};

export default ReplyFooter;
