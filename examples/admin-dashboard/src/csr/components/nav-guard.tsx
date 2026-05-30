import { createRef } from "defuss";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	Button,
} from "defuss-shadcn";
import type { RouteContext } from "defuss";
import { t } from "../i18n";

/**
 * Registers a navigation guard on the given route context that shows
 * a confirmation AlertDialog when a `<dialog[open]>` is detected on the page.
 *
 * Place `<NavGuard route={route} />` inside any screen that has modals.
 * It renders a hidden AlertDialog that is shown when the user tries to
 * navigate away while a dialog is open.
 *
 * @example
 * ```tsx
 * function UsersScreen({ route }: { route: RouteContext }) {
 *   return (
 *     <AdminLayout>
 *       <NavGuard route={route} />
 *       ...dialogs and content...
 *     </AdminLayout>
 *   );
 * }
 * ```
 */
export function NavGuard({ route }: { route: RouteContext }) {
	const guardDialogRef = createRef<HTMLDialogElement>();

	// Pending navigation resolve — set when the guard dialog opens
	let pendingResolve: ((leave: boolean) => void) | null = null;

	route.onBeforeLeave(() => {
		// Check if any <dialog> (other than the guard itself) is currently open
		const openDialogs = document.querySelectorAll("dialog[open]");
		const hasOpenDialog = Array.from(openDialogs).some(
			(d) => d !== guardDialogRef.current,
		);

		if (!hasOpenDialog) return true; // No open dialog — allow navigation

		// Show confirmation dialog and return a promise
		return new Promise<boolean>((resolve) => {
			pendingResolve = resolve;
			guardDialogRef.current?.showModal();
		});
	});

	const handleStay = () => {
		guardDialogRef.current?.close();
		pendingResolve?.(false);
		pendingResolve = null;
	};

	const handleLeave = () => {
		// Close all open dialogs before leaving
		document.querySelectorAll("dialog[open]").forEach((d) => {
			(d as HTMLDialogElement).close();
		});
		guardDialogRef.current?.close();
		pendingResolve?.(true);
		pendingResolve = null;
	};

	return (
		<AlertDialog
			ref={guardDialogRef}
			id="nav-guard-dialog"
			onClick={(e: MouseEvent) => {
				if (e.target === e.currentTarget) handleStay();
			}}
		>
			<AlertDialogContent className="p-4 space-y-4">
				<AlertDialogHeader>
					<AlertDialogTitle>{t("common.unsaved_changes_title")}</AlertDialogTitle>
					<AlertDialogDescription>
						{t("common.unsaved_changes_description")}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="flex justify-end gap-2">
					<Button variant="outline" onClick={handleStay}>
						{t("common.stay")}
					</Button>
					<Button variant="destructive" onClick={handleLeave}>
						{t("common.leave")}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
