import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { cn } from "cn";

import { Button } from "@/components/ui/button";

function AlertDialog({ ...props }) {
    return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger({ ...props }) {
    return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogPortal({ ...props }) {
    return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />;
}

function AlertDialogOverlay({ className, ...props }) {
    return (
        <AlertDialogPrimitive.Backdrop
            data-slot="alert-dialog-overlay"
            className={cn(
                "fixed inset-0 isolate z-70 bg-black/65 duration-150 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 data-closed:opacity-0 data-closed:pointer-events-none",
                className,
            )}
            onClick={(e) => e.stopPropagation()}
            {...props}
        />
    );
}

function AlertDialogContent({ className, overlayClassName, ...props }) {
    return (
        <AlertDialogPortal>
            <AlertDialogOverlay className={overlayClassName} />
            <AlertDialogPrimitive.Popup
                data-slot="alert-dialog-content"
                className={cn(
                    "fixed top-1/2 left-1/2 z-70 w-72 sm:w-80 max-w-[90vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[20px] border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-[#181818] shadow-2xl duration-150 outline-none p-0 gap-0 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-closed:opacity-0 data-closed:pointer-events-none",
                    className,
                )}
                onClick={(e) => e.stopPropagation()}
                {...props}
            />
        </AlertDialogPortal>
    );
}

function AlertDialogHeader({ className, ...props }) {
    return (
        <div
            data-slot="alert-dialog-header"
            className={cn(
                "flex flex-col items-center justify-center text-center px-6 pt-6 pb-5 gap-2",
                className,
            )}
            {...props}
        />
    );
}

function AlertDialogFooter({ className, ...props }) {
    return (
        <div
            data-slot="alert-dialog-footer"
            className={cn(
                "grid grid-cols-2 border-t border-neutral-200/80 dark:border-neutral-700/80 divide-x divide-neutral-200/80 dark:divide-neutral-700/80 p-0 m-0",
                className,
            )}
            {...props}
        />
    );
}

function AlertDialogMedia({ className, ...props }) {
    return (
        <div
            data-slot="alert-dialog-media"
            className={cn(
                "mb-2 inline-flex size-10 items-center justify-center rounded-md bg-muted",
                className,
            )}
            {...props}
        />
    );
}

function AlertDialogTitle({ className, ...props }) {
    return (
        <AlertDialogPrimitive.Title
            data-slot="alert-dialog-title"
            className={cn(
                "text-base font-bold text-neutral-950 dark:text-white select-none text-center leading-snug",
                className,
            )}
            {...props}
        />
    );
}

function AlertDialogDescription({ className, ...props }) {
    return (
        <AlertDialogPrimitive.Description
            data-slot="alert-dialog-description"
            className={cn(
                "text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 text-center leading-relaxed select-none",
                className,
            )}
            {...props}
        />
    );
}

function AlertDialogAction({ className, variant = "default", children, onClick, ...props }) {
    return (
        <Button
            data-slot="alert-dialog-action"
            variant="ghost"
            className={cn(
                "h-14 w-full rounded-none bg-transparent text-sm hover:bg-neutral-100/70 dark:hover:bg-neutral-800/70 active:bg-neutral-200/60 dark:active:bg-neutral-700/60 shadow-none cursor-pointer flex items-center justify-center border-none outline-none transition-colors select-none disabled:opacity-50 disabled:pointer-events-none",
                variant === "destructive"
                    ? "font-bold text-red-500 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400"
                    : "font-bold text-neutral-900 dark:text-white",
                className,
            )}
            onClick={(e) => {
                e.stopPropagation();
                onClick?.(e);
            }}
            {...props}
        >
            {children}
        </Button>
    );
}

function AlertDialogCancel({ className, children, onClick, ...props }) {
    return (
        <AlertDialogPrimitive.Close
            data-slot="alert-dialog-cancel"
            className={cn(
                "h-14 w-full rounded-none bg-transparent font-medium text-sm text-neutral-900 dark:text-white hover:bg-neutral-100/70 dark:hover:bg-neutral-800/70 active:bg-neutral-200/60 dark:active:bg-neutral-700/60 shadow-none cursor-pointer flex items-center justify-center border-none outline-none transition-colors select-none disabled:opacity-50 disabled:pointer-events-none",
                className,
            )}
            onClick={(e) => {
                e.stopPropagation();
                onClick?.(e);
            }}
            {...props}
        >
            {children}
        </AlertDialogPrimitive.Close>
    );
}

export {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogOverlay,
    AlertDialogPortal,
    AlertDialogTitle,
    AlertDialogTrigger,
};
