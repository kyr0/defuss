import type { FieldValidationMessage } from "defuss-transval";
import { Alert, AlertDescription, AlertTitle } from "defuss-shadcn";
import { t } from "../../i18n";

/** Props for the {@link FormErrorAlert} component. */
export interface FormErrorAlertProps {
	/** Validation messages to display, one per list item. */
	messages: FieldValidationMessage[];
}

/**
 * Displays a destructive alert listing all form validation errors.
 * Returns `null` when there are no messages.
 */
export function FormErrorAlert({ messages }: FormErrorAlertProps) {
	if (messages.length === 0) return null;

	return (
		<Alert variant="destructive">
			<AlertTitle>{t("login.form_errors_title")}</AlertTitle>
			<AlertDescription>
				<ul class="list-disc pl-4 space-y-1">
					{messages.map((msg) => (
						<li key={`${msg.path}-${msg.message}`}>
							<strong>{msg.path}:</strong> {msg.message}
						</li>
					))}
				</ul>
			</AlertDescription>
		</Alert>
	);
}
