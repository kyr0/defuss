import { createRef, $ } from "defuss";
import { Button, Icon, Close } from "../../cl";

export interface ConfirmDialogProps {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    onConfirm: () => void | Promise<void>;
    onCancel: () => void;
}

export const ConfirmDialog = ({
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    destructive = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) => {
    const dialogRef = createRef();

    const handleConfirm = async () => {
        await onConfirm();
    };

    return (
        <div
            ref={dialogRef}
            className="uk-modal uk-open"
            style="display: block;"
            tabIndex={-1}
        >
            <div className="uk-modal-dialog uk-modal-body uk-margin-auto-vertical max-w-md">
                <div className="flex items-start gap-4">
                    <div
                        className={`p-2 rounded-full ${destructive ? "bg-destructive/10" : "bg-primary/10"}`}
                    >
                        <Icon
                            icon={destructive ? "alert-triangle" : "help-circle"}
                            height={24}
                            width={24}
                            className={destructive ? "text-destructive" : "text-primary"}
                        />
                    </div>
                    <div className="flex-1">
                        <h3 className="uk-modal-title text-lg font-semibold">{title}</h3>
                        <p className="mt-2 text-muted-foreground">{message}</p>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <Button type="ghost" onClick={onCancel}>
                        {cancelLabel}
                    </Button>
                    <Button
                        type={destructive ? "destructive" : "primary"}
                        onClick={handleConfirm}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
};
