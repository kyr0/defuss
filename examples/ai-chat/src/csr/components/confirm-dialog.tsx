import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "defuss-shadcn";
import { t } from "../i18n";

const DIALOG_ID = "confirm-dialog";

interface ConfirmDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <AlertDialog id={DIALOG_ID}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle id="confirm-dialog-title"></AlertDialogTitle>
          <AlertDialogDescription id="confirm-dialog-description"></AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <button type="button" className="btn-outline" onClick={onCancel}>{t("chat.confirm_cancel")}</button>
          <button type="button" className="btn-destructive" id="confirm-dialog-confirm" onClick={onConfirm}></button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function openConfirmDialog(type: 'delete' | 'retry') {
  const title = document.getElementById("confirm-dialog-title");
  const desc = document.getElementById("confirm-dialog-description");
  const confirmBtn = document.getElementById("confirm-dialog-confirm");

  if (type === 'delete') {
    if (title) title.textContent = t("chat.confirm_delete_title");
    if (desc) desc.textContent = t("chat.confirm_delete_desc");
    if (confirmBtn) confirmBtn.textContent = t("chat.confirm_delete");
  } else {
    if (title) title.textContent = t("chat.confirm_retry_title");
    if (desc) desc.textContent = t("chat.confirm_retry_desc");
    if (confirmBtn) confirmBtn.textContent = t("chat.confirm_retry");
  }

  const dialog = document.getElementById(DIALOG_ID) as HTMLDialogElement | null;
  dialog?.showModal();
}

export function closeConfirmDialog() {
  const dialog = document.getElementById(DIALOG_ID) as HTMLDialogElement | null;
  dialog?.close();
}
