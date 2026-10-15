import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import useVerifyEmail from "./hooks/useVerifyEmail";

const VerifyEmailPage = () => {
    const { t } = useTranslation();
    const { status, customError } = useVerifyEmail();

    return (
        <div className="w-full max-w-92.5 flex flex-col items-center">
            <h1 className="text-base font-bold text-neutral-900 dark:text-white mb-6 text-center tracking-tight">
                {t("auth.verify_email_title")}
            </h1>

            {/* Trạng thái 1: Đang xác minh... */}
            {status === "loading" && (
                <div className="w-full p-8 rounded-2xl bg-neutral-50 dark:bg-[#1e1e1e]/60 border border-neutral-200 dark:border-neutral-800 shadow-xs dark:shadow-none flex flex-col items-center justify-center gap-4 animate-in fade-in duration-200">
                    <Loader2 className="w-8 h-8 text-neutral-900 dark:text-white animate-spin" />
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 font-medium">
                        {t("auth.verifying")}
                    </p>
                </div>
            )}

            {/* Trạng thái 2: Xác minh thành công (chuẩn bị chuyển sang /login) */}
            {status === "success" && (
                <div className="w-full p-8 rounded-2xl bg-emerald-50/50 dark:bg-[#1e1e1e]/60 border border-emerald-200 dark:border-neutral-800 shadow-xs dark:shadow-none flex flex-col items-center justify-center gap-4 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium text-center leading-relaxed">
                        {t("auth.verified_success")}
                    </p>
                </div>
            )}

            {/* Trạng thái 3: Thất bại (hết hạn / không hợp lệ) */}
            {status === "error" && (
                <div className="w-full flex flex-col items-center gap-5 animate-in fade-in duration-200">
                    {/* Thông báo đỏ: Tự động đổi ngôn ngữ realtime qua t("auth.link_invalid") */}
                    <div className="w-full p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-3 text-left">
                        <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">
                            {customError || t("auth.link_invalid")}
                        </span>
                    </div>

                    {/* Nút duy nhất: Đi tới trang đăng nhập dẫn về /login */}
                    <Link to="/login" className="w-full block">
                        <Button className="w-full bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 font-semibold h-12 rounded-xl active:scale-[0.99] transition duration-200 text-sm cursor-pointer">
                            {t("auth.go_to_login")}
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    );
};

export default VerifyEmailPage;
