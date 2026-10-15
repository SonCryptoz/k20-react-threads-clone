import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";

import useRegister from "./hooks/useRegister";

const RegisterPage = () => {
    const { t } = useTranslation();

    const {
        register,
        handleSubmit,
        errors,
        showPassword,
        setShowPassword,
        showConfirmPassword,
        setShowConfirmPassword,
        isSubmitting,
        successMessage,
        errorMessage,
        onSubmit,
    } = useRegister();

    return (
        <div className="w-full max-w-92.5 flex flex-col items-center">
            {/* Tiêu đề căn giữa theo style Threads real */}
            <h1 className="text-base font-bold text-neutral-900 dark:text-white mb-6 text-center tracking-tight">
                {t("auth.register_title")}
            </h1>

            {/* Thông báo thành công cho người dùng check mail */}
            {successMessage && (
                <div className="w-full mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-neutral-900 border border-emerald-200 dark:border-neutral-700 text-emerald-800 dark:text-neutral-200 text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{successMessage}</span>
                </div>
            )}

            {/* Thông báo lỗi từ API nếu có */}
            {errorMessage && (
                <div className="w-full mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
                    <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{errorMessage}</span>
                </div>
            )}

            {/* Form đăng ký */}
            <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col gap-3">
                {/* 1. Tên hiển thị */}
                <Field>
                    <Input
                        type="text"
                        placeholder={t("auth.enter_display_name")}
                        aria-invalid={!!errors.username}
                        autoComplete="username"
                        {...register("username")}
                    />
                    {errors.username && (
                        <FieldError className="text-rose-500 dark:text-rose-400 text-xs px-1">
                            {errors.username.message}
                        </FieldError>
                    )}
                </Field>

                {/* 2. Email */}
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

                {/* 3. Mật khẩu */}
                <Field>
                    <div className="relative w-full">
                        <Input
                            type={showPassword ? "text" : "password"}
                            placeholder={t("auth.enter_password")}
                            className="pr-11"
                            aria-invalid={!!errors.password}
                            autoComplete="new-password"
                            {...register("password")}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors p-1 cursor-pointer"
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {errors.password && (
                        <FieldError className="text-rose-500 dark:text-rose-400 text-xs px-1">
                            {errors.password.message}
                        </FieldError>
                    )}
                </Field>

                {/* 4. Xác nhận mật khẩu */}
                <Field>
                    <div className="relative w-full">
                        <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder={t("auth.enter_confirm_password")}
                            className="pr-11"
                            aria-invalid={!!errors.password_confirmation}
                            autoComplete="new-password"
                            {...register("password_confirmation")}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors p-1 cursor-pointer"
                            tabIndex={-1}
                        >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {errors.password_confirmation && (
                        <FieldError className="text-rose-500 dark:text-rose-400 text-xs px-1">
                            {errors.password_confirmation.message}
                        </FieldError>
                    )}
                </Field>

                {/* Nút Đăng ký Shadcn Button */}
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 font-semibold h-12 rounded-xl active:scale-[0.99] transition duration-200 mt-2 text-sm cursor-pointer disabled:opacity-50"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        t("auth.register")
                    )}
                </Button>
            </form>

            {/* Dải phân cách "hoặc" dùng Shadcn Separator */}
            <div className="w-full flex items-center my-6">
                <Separator className="flex-1 bg-neutral-200 dark:bg-neutral-800" />
                <span className="px-4 text-xs text-neutral-500 font-normal">{t("auth.or")}</span>
                <Separator className="flex-1 bg-neutral-200 dark:bg-neutral-800" />
            </div>

            {/* Link chuyển hướng đến /login */}
            <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
                {t("auth.already_have_account")}{" "}
                <Link
                    to="/login"
                    className="text-neutral-900 dark:text-white hover:underline font-semibold transition-colors"
                >
                    {t("auth.login")}
                </Link>
            </p>
        </div>
    );
};

export default RegisterPage;
