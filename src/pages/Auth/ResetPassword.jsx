import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";

import useResetPassword from "./hooks/useResetPassword";

const ResetPasswordPage = () => {
    const { t } = useTranslation();

    const {
        status,
        register,
        handleSubmit,
        errors,
        showPassword,
        setShowPassword,
        showConfirmPassword,
        setShowConfirmPassword,
        isSubmitting,
        errorMessage,
        onSubmit,
    } = useResetPassword();

    return (
        <div className="w-full max-w-92.5 flex flex-col items-center">
            {/* TRẠNG THÁI 1: ĐANG KIỂM TRA LIÊN KẾT... */}
            {status === "validating" && (
                <div className="w-full p-8 rounded-2xl bg-neutral-50 dark:bg-[#1e1e1e]/60 border border-neutral-200 dark:border-neutral-800 shadow-xs dark:shadow-none flex flex-col items-center justify-center gap-4 animate-in fade-in duration-200">
                    <Loader2 className="w-8 h-8 text-neutral-900 dark:text-white animate-spin" />
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 font-medium">
                        {t("auth.validating_reset_link")}
                    </p>
                </div>
            )}

            {/* TRẠNG THÁI 2: LIÊN KẾT KHÔNG HỢP LỆ HOẶC ĐÃ HẾT HẠN */}
            {status === "invalid" && (
                <div className="w-full flex flex-col items-center gap-5 animate-in fade-in duration-200">
                    <div className="w-full p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-3 text-left">
                        <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">
                            {t("auth.token_invalid_or_expired")}
                        </span>
                    </div>

                    <Link to="/forgot-password" className="w-full block">
                        <Button className="w-full bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 font-semibold h-12 rounded-xl active:scale-[0.99] transition duration-200 text-sm cursor-pointer">
                            {t("auth.request_new_link")}
                        </Button>
                    </Link>

                    <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
                        <Link
                            to="/login"
                            className="text-neutral-900 dark:text-white hover:underline font-semibold transition-colors"
                        >
                            {t("auth.back_to_login")}
                        </Link>
                    </p>
                </div>
            )}

            {/* TRẠNG THÁI 3: ĐẶT LẠI MẬT KHẨU THÀNH CÔNG */}
            {status === "success" && (
                <div className="w-full p-8 rounded-2xl bg-emerald-50/50 dark:bg-[#1e1e1e]/60 border border-emerald-200 dark:border-neutral-800 shadow-xs dark:shadow-none flex flex-col items-center justify-center gap-4 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium text-center leading-relaxed">
                        {t("auth.reset_password_success")}
                    </p>
                </div>
            )}

            {/* TRẠNG THÁI 4: TOKEN HỢP LỆ -> HIỂN THỊ FORM NHẬP MẬT KHẨU MỚI */}
            {status === "valid" && (
                <div className="w-full flex flex-col items-center animate-in fade-in duration-200">
                    <h1 className="text-base font-bold text-neutral-900 dark:text-white mb-2 text-center tracking-tight">
                        {t("auth.reset_password_title")}
                    </h1>

                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 text-center leading-relaxed">
                        {t("auth.reset_password_desc")}
                    </p>

                    {/* Lỗi chung từ API nếu có */}
                    {errorMessage && (
                        <div className="w-full mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
                            <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{errorMessage}</span>
                        </div>
                    )}

                    {/* Form nhập mật khẩu mới */}
                    <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col gap-3">
                        {/* 1. Mật khẩu mới */}
                        <Field>
                            <div className="relative w-full">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder={t("auth.enter_new_password")}
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

                        {/* 2. Xác nhận mật khẩu mới */}
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

                        {/* Nút gửi */}
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 font-semibold h-12 rounded-xl active:scale-[0.99] transition duration-200 mt-2 text-sm cursor-pointer disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                t("auth.reset_password_button")
                            )}
                        </Button>
                    </form>

                    {/* Dải phân cách */}
                    <div className="w-full flex items-center my-6">
                        <Separator className="flex-1 bg-neutral-200 dark:bg-neutral-800" />
                        <span className="px-4 text-xs text-neutral-500 font-normal">
                            {t("auth.or")}
                        </span>
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
            )}
        </div>
    );
};

export default ResetPasswordPage;
