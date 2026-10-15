import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { cn } from "cn";

function RadioGroup({ className, ...props }) {
    return (
        <RadioGroupPrimitive
            data-slot="radio-group"
            className={cn("grid w-full gap-2", className)}
            {...props}
        />
    );
}

function RadioGroupItem({ className, ...props }) {
    return (
        <RadioPrimitive.Root
            data-slot="radio-group-item"
            className={cn(
                "group/radio-group-item peer relative flex size-4.5 shrink-0 items-center justify-center rounded-full border border-neutral-400 dark:border-neutral-600 outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-neutral-900 dark:data-checked:border-white data-checked:bg-neutral-900 dark:data-checked:bg-white transition-colors cursor-pointer",
                className,
            )}
            {...props}
        >
            <RadioPrimitive.Indicator
                data-slot="radio-group-indicator"
                className="size-2 shrink-0 rounded-full bg-white dark:bg-neutral-950"
            />
        </RadioPrimitive.Root>
    );
}

export { RadioGroup, RadioGroupItem };
