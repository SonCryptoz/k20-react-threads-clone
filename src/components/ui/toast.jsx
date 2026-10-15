import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
    XIcon,
    CircleCheckIcon,
    InfoIcon,
    TriangleAlertIcon,
    OctagonXIcon,
    Loader2Icon,
} from "lucide-react";

const baseToastManager = ToastPrimitive.createToastManager();

// Helper toast callable và chứa các helper methods (success, error, info)
const toast = (title, options = {}) => {
    if (typeof title === "string") {
        return baseToastManager.add({ title, ...options });
    }
    return baseToastManager.add(title);
};

Object.assign(toast, baseToastManager);

toast.success = (title, options = {}) => {
    return baseToastManager.add({ title, type: "success", ...options });
};

toast.error = (title, options = {}) => {
    return baseToastManager.add({ title, type: "error", ...options });
};

toast.info = (title, options = {}) => {
    return baseToastManager.add({ title, type: "info", ...options });
};

toast.warning = (title, options = {}) => {
    return baseToastManager.add({ title, type: "warning", ...options });
};

function ToastProvider({ ...props }) {
    return <ToastPrimitive.Provider {...props} />;
}

function ToastPortal({ ...props }) {
    return <ToastPrimitive.Portal data-slot="toast-portal" {...props} />;
}

function ToastViewport({ className, ...props }) {
    return (
        <ToastPrimitive.Viewport
            data-slot="toast-viewport"
            className={cn(
                "pointer-events-none fixed inset-x-0 bottom-6 z-50 mx-auto flex w-full max-w-sm flex-col items-center justify-center px-4 outline-none",
                className,
            )}
            {...props}
        />
    );
}

function Toast({ className, ...props }) {
    return (
        <ToastPrimitive.Root
            data-slot="toast"
            className={cn(
                "group/toast pointer-events-auto relative z-[calc(1000-var(--toast-index))] mx-auto w-auto max-w-sm origin-bottom rounded-full border border-neutral-200/80 dark:border-neutral-700/80 bg-neutral-900/95 dark:bg-[#1e1e1e]/95 text-white shadow-2xl backdrop-blur-md will-change-transform outline-none select-none px-4 py-2.5",
                "[--gap:0.75rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))]",
                "transform-[translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))))_scale(var(--scale))] [transition:transform_350ms_cubic-bezier(0.22,1,0.36,1),opacity_350ms]",
                "data-limited:opacity-0 data-starting-style:transform-[translateY(120%)] data-starting-style:opacity-0",
                "data-ending-style:transform-[translateY(120%)] data-ending-style:opacity-0",
                className,
            )}
            {...props}
        />
    );
}

function ToastContent({ className, ...props }) {
    return (
        <ToastPrimitive.Content
            data-slot="toast-content"
            className={cn(
                "flex items-center gap-2.5 overflow-hidden transition-opacity duration-200",
                className,
            )}
            {...props}
        />
    );
}

function ToastTitle({ className, ...props }) {
    return (
        <ToastPrimitive.Title
            data-slot="toast-title"
            className={cn("text-sm font-medium text-white whitespace-nowrap", className)}
            {...props}
        />
    );
}

function ToastDescription({ className, ...props }) {
    return (
        <ToastPrimitive.Description
            data-slot="toast-description"
            className={cn("text-xs text-neutral-300", className)}
            {...props}
        />
    );
}

function ToastAction({ className, render = <Button variant="outline" size="sm" />, ...props }) {
    return (
        <ToastPrimitive.Action
            data-slot="toast-action"
            render={render}
            className={cn("shrink-0", className)}
            {...props}
        />
    );
}

function ToastClose({
    className,
    children,
    render = <Button variant="ghost" size="icon-sm" />,
    ...props
}) {
    return (
        <ToastPrimitive.Close
            data-slot="toast-close"
            aria-label="Close toast"
            render={render}
            className={cn(
                "relative shrink-0 text-neutral-400 hover:text-white transition-colors ml-1",
                className,
            )}
            {...props}
        >
            {children ?? <XIcon className="size-3.5" aria-hidden="true" />}
        </ToastPrimitive.Close>
    );
}

function ToastIcon({ type }) {
    let icon = null;

    if (type === "success") {
        icon = <CircleCheckIcon className="text-emerald-400 size-4.5" aria-hidden="true" />;
    }

    if (type === "info") {
        icon = <InfoIcon className="text-sky-400 size-4.5" aria-hidden="true" />;
    }

    if (type === "warning") {
        icon = <TriangleAlertIcon className="text-amber-400 size-4.5" aria-hidden="true" />;
    }

    if (type === "error") {
        icon = <OctagonXIcon className="text-rose-400 size-4.5" aria-hidden="true" />;
    }

    if (type === "loading") {
        icon = <Loader2Icon className="animate-spin text-neutral-300 size-4.5" aria-hidden="true" />;
    }

    if (!icon) {
        return null;
    }

    return (
        <span
            data-slot="toast-icon"
            className="shrink-0 flex items-center justify-center"
        >
            {icon}
        </span>
    );
}

function ToastList() {
    const { toasts } = ToastPrimitive.useToastManager();

    return toasts.map((toastItem) => (
        <Toast key={toastItem.id} toast={toastItem}>
            <ToastContent>
                <ToastIcon type={toastItem.type} />
                <div className="flex min-w-0 flex-1 flex-col">
                    <ToastTitle />
                    <ToastDescription />
                </div>
                <ToastAction />
            </ToastContent>
        </Toast>
    ));
}

function Toaster({ children, toastManager = toast, ...props }) {
    return (
        <ToastProvider toastManager={toastManager} {...props}>
            {children}
            <ToastPortal>
                <ToastViewport>
                    <ToastList />
                </ToastViewport>
            </ToastPortal>
        </ToastProvider>
    );
}

const createToastManager = ToastPrimitive.createToastManager;
const useToastManager = ToastPrimitive.useToastManager;

export {
    Toaster,
    Toast,
    ToastAction,
    ToastClose,
    ToastContent,
    ToastDescription,
    ToastPortal,
    ToastProvider,
    ToastTitle,
    ToastViewport,
    // eslint-disable-next-line react-refresh/only-export-components
    createToastManager,
    // eslint-disable-next-line react-refresh/only-export-components
    toast,
    // eslint-disable-next-line react-refresh/only-export-components
    useToastManager,
};
