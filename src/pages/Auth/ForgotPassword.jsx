import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";

import useForgotPassword from "./hooks/useForgotPassword";

const ForgotPasswordPage = () => {
    const { t } = useTranslation();

    const {
        register,
        handleSubmit,
        errors,
        isSubmitting,
        successMessage,
        errorMessage,
        onSubmit,
    } = useForgotPassword();

    return (
        <div className="w-full max-w-92.5 flex flex-col items-center">
            {/* Tiêu đề căn giữa theo style Threads */}
            <h1 className="text-base font-bold text-neutral-900 dark:text-white mb-2 text-center tracking-tight">
                {t("auth.forgot_password_title")}
            </h1>

            {/* Mô tả phụ */}
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 text-center leading-relaxed">
                {t("auth.forgot_password_desc")}
            </p>

            {/* Thông báo thành công */}
            {successMessage && (
                <div className="w-full mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-neutral-900 border border-emerald-200 dark:border-neutral-700 text-emerald-800 dark:text-neutral-200 text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{successMessage}</span>
                </div>
            )}

            {/* Thông báo lỗi chung từ API nếu có */}
            {errorMessage && (
                <div className="w-full mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
                    <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{errorMessage}</span>
                </div>
            )}

            {/* Form gửi email */}
            <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col gap-3">
                <Field>
                    <Input
                        type="email"
                        placeholder={t("auth.enter_email")}
                        aria-invalid={!!errors.email}
                        autoComplete="email"
                        {...register("email")}
                    />
                    {errors.email && (
                        <FieldError className="text-rose-500 dark:text-rose-400 text-xs px-1">
                            {errors.email.message}
                        </FieldError>
                    )}
                </Field>

                {/* Nút Gửi liên kết */}
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 font-semibold h-12 rounded-xl active:scale-[0.99] transition duration-200 mt-2 text-sm cursor-pointer disabled:opacity-50"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        t("auth.send_reset_link")
                    )}
                </Button>
            </form>

            {/* Dải phân cách "hoặc" */}
            <div className="w-full flex items-center my-6">
                <Separator className="flex-1 bg-neutral-200 dark:bg-neutral-800" />
                <span className="px-4 text-xs text-neutral-500 font-normal">{t("auth.or")}</span>
                <Separator className="flex-1 bg-neutral-200 dark:bg-neutral-800" />
            </div>

            {/* Link quay lại đăng nhập */}
            <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
                <Link
                    to="/login"
                    className="text-neutral-900 dark:text-white hover:underline font-semibold transition-colors"
                >
                    {t("auth.back_to_login")}
                </Link>
            </p>
        </div>
    );
};

export default ForgotPasswordPage;
