import type { ElementProps, FC } from "defuss";
import { cn } from "../../utilities/cn.js";

export type DialogProps = ElementProps<HTMLDialogElement> & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
};
export type DialogTriggerProps = ElementProps<HTMLButtonElement> & {
    dialogId: string;
};
export type DialogHeaderProps = ElementProps<HTMLElement>;
export type DialogTitleProps = ElementProps<HTMLHeadingElement>;
export type DialogDescriptionProps = ElementProps<HTMLParagraphElement>;
export type DialogContentProps = ElementProps<HTMLElement>;
export type DialogFooterProps = ElementProps<HTMLElement>;
export type DialogCloseProps = ElementProps<HTMLButtonElement>;

export const Dialog: FC<DialogProps> = ({ className, id, open, children, ...props }) => {
    return (
        <dialog
            id={id}
            class={cn("dialog", className)}
            onClick={(e) => {
                // Close on backdrop click
                if (e.target === e.currentTarget) {
                    (e.currentTarget as HTMLDialogElement).close();
                }
            }}
            {...props}
        >
            <div>
                {children}
            </div>
        </dialog>
    );
};

export const DialogTrigger: FC<DialogTriggerProps> = ({ className, dialogId, children, ...props }) => {
    return (
        <button
            type="button"
            onClick={() => {
                const dialog = document.getElementById(dialogId) as HTMLDialogElement;
                dialog?.showModal();
            }}
            class={cn(className)}
            {...props}
        >
            {children}
        </button>
    );
};

export const DialogHeader: FC<DialogHeaderProps> = ({ className, children, ...props }) => {
    return (
        <header class={cn(className)} {...props}>
            {children}
        </header>
    );
};

export const DialogTitle: FC<DialogTitleProps> = ({ className, children, ...props }) => {
    return (
        <h2 class={cn(className)} {...props}>
            {children}
        </h2>
    );
};

export const DialogDescription: FC<DialogDescriptionProps> = ({ className, children, ...props }) => {
    return (
        <p class={cn(className)} {...props}>
            {children}
        </p>
    );
};

export const DialogContent: FC<DialogContentProps> = ({ className, children, ...props }) => {
    return (
        <section class={cn(className)} {...props}>
            {children}
        </section>
    );
};

export const DialogFooter: FC<DialogFooterProps> = ({ className, children, ...props }) => {
    return (
        <footer class={cn(className)} {...props}>
            {children}
        </footer>
    );
};

export const DialogClose: FC<DialogCloseProps> = ({ className, children, ...props }) => {
    return (
        <button
            type="button"
            aria-label="Close dialog"
            onClick={(e) => {
                const dialog = (e.target as HTMLElement).closest('dialog') as HTMLDialogElement;
                dialog?.close();
            }}
            class={cn(className)}
            {...props}
        >
            {children || '×'}
        </button>
    );
};
