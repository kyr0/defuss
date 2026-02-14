import type { ElementProps, FC } from "defuss";
import { cn } from "../../utilities/cn.js";

export type AlertDialogProps = ElementProps<HTMLDialogElement>;
export type AlertDialogTriggerProps = ElementProps<HTMLButtonElement> & { dialogId: string };
export type AlertDialogContentProps = ElementProps<HTMLDivElement>;
export type AlertDialogHeaderProps = ElementProps<HTMLElement>;
export type AlertDialogTitleProps = ElementProps<HTMLHeadingElement>;
export type AlertDialogDescriptionProps = ElementProps<HTMLParagraphElement>;
export type AlertDialogFooterProps = ElementProps<HTMLElement>;

export const AlertDialog: FC<AlertDialogProps> = ({ className, children, ...props }) => (
    <dialog class={cn("dialog", className)} {...props}>
        {children}
    </dialog>
);

export const AlertDialogTrigger: FC<AlertDialogTriggerProps> = ({ dialogId, className, children, ...props }) => (
    <button
        type="button"
        class={cn(className)}
        onClick={() => {
            const dialog = document.getElementById(dialogId) as HTMLDialogElement | null;
            dialog?.showModal();
        }}
        {...props}
    >
        {children}
    </button>
);

export const AlertDialogContent: FC<AlertDialogContentProps> = ({ className, children, ...props }) => (
    <div class={cn(className)} {...props}>{children}</div>
);

export const AlertDialogHeader: FC<AlertDialogHeaderProps> = ({ className, children, ...props }) => (
    <header class={cn(className)} {...props}>{children}</header>
);

export const AlertDialogTitle: FC<AlertDialogTitleProps> = ({ className, children, ...props }) => (
    <h2 class={cn(className)} {...props}>{children}</h2>
);

export const AlertDialogDescription: FC<AlertDialogDescriptionProps> = ({ className, children, ...props }) => (
    <p class={cn(className)} {...props}>{children}</p>
);

export const AlertDialogFooter: FC<AlertDialogFooterProps> = ({ className, children, ...props }) => (
    <footer class={cn(className)} {...props}>{children}</footer>
);
