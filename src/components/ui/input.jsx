import * as React from "react";
import { cn } from "cn";

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
    return (
        <input
            type={type}
            className={cn(
                "flex w-full rounded-xl border border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-[#1e1e1e] px-4 py-3.5 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 shadow-xs outline-none transition-colors duration-200 focus:border-neutral-400 dark:focus:border-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-rose-500 aria-invalid:focus:border-rose-400",
                className,
            )}
            ref={ref}
            {...props}
        />
    );
});
Input.displayName = "Input";

export { Input };
