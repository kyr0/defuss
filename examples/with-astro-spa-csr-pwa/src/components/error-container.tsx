import { createRef, type Props, queueCallback, type Ref, $ } from "defuss";
import type { FieldValidationMessage } from "defuss-transval";

/**
 * ErrorContainer Component
 *
 * A reusable error display component that shows validation messages in a consistent format.
 * This component replaces the repeated error-container divs and renderErrorBox functions
 * across different screens (login, signup, forgot-password).
 *
 * Features:
 * - Automatic show/hide based on whether errors exist
 * - Consistent styling with red error theme
 * - Support for multiple error messages
 * - Reference exposure for programmatic control
 *
 * Usage examples:
 *
 * // Basic usage with messages
 * <ErrorContainer messages={validationMessages} />
 *
 * // With ref for programmatic control
 * const errorRef = createRef<ErrorContainerRef>();
 * <ErrorContainer ref={errorRef} messages={messages} />
 *
 * // Initially hidden, show/hide programmatically
 * <ErrorContainer messages={[]} hidden={true} />
 */

export interface ErrorContainerRef extends Ref {
	/** Show the error container */
	show: () => void;
	/** Hide the error container */
	hide: () => void;
	/** Update the error messages and show/hide accordingly */
	updateMessages: (messages: FieldValidationMessage[]) => void;
	/** Optional method to clear the error container */
	clear?: () => void; // Optional clear method for cleanup
}

export interface ErrorContainerProps extends Props {
	/** Array of validation error messages to display */
	messages?: FieldValidationMessage[];
	/** Whether the error container should be initially hidden */
	hidden?: boolean;
	/** Additional CSS classes to apply */
	className?: string;

	ref: ErrorContainerRef;
}

export function ErrorContainer(props: ErrorContainerProps) {
	const containerRef = (props.ref || createRef()) as ErrorContainerRef;
	const { messages = [], hidden = false, className = "", ...restProps } = props;

	// Determine if container should be visible
	const shouldShow = messages.length > 0 && !hidden;
	const containerClasses =
		`error-container ${className} ${shouldShow ? "" : "hidden"}`.trim();

	const exposeApi = () => {
		// Expose methods via ref if provided
		if (containerRef) {
			containerRef.hide = async () => {
				$(containerRef).addClass("hidden");
			};
			containerRef.show = async () => {
				$(containerRef).removeClass("hidden");
			};

			containerRef.clear = () => {
				$(containerRef).empty();
				$(containerRef).addClass("hidden");
			};

			containerRef.updateMessages = async (
				newMessages: FieldValidationMessage[],
			) => {
				// Update the content
				$(containerRef).update(renderErrorBox(newMessages));
				if (newMessages.length > 0) {
					$(containerRef).removeClass("hidden");
				} else {
					$(containerRef).addClass("hidden");
				}
			};
		}
	};

	const renderErrorBox = (messages: FieldValidationMessage[]) => {
		console.log("Rendering error box with messages:", messages);
		return (
			<div class="error-box">
				{messages.map((msg) => (
					<div key={`${msg.path}-${msg.message}`} class="error-message">
						{msg.message}
					</div>
				))}
			</div>
		);
	};

	return (
		<div
			ref={containerRef}
			onMount={queueCallback(exposeApi)}
			class={containerClasses}
			{...restProps}
		>
			{shouldShow && (
				<div class="error-box">
					{messages.map((msg) => (
						<div key={`${msg.path}-${msg.message}`} class="error-message">
							{msg.message}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
