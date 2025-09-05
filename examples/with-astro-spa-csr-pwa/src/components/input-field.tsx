import { createRef, type Props, T } from "defuss";

/**
 * InputField Component
 *
 * A reusable input component that matches the styling of the login, signup, and forgot-password screens.
 *
 * Features:
 * - Material icon support
 * - Translation key support for labels
 * - Error state handling
 * - All standard HTML input props
 * - Consistent styling with amber theme
 *
 * Usage examples:
 *
 * // Basic email input with icon and translation
 * <InputField
 *   id="email"
 *   name="email"
 *   type="email"
 *   placeholder="you@example.com"
 *   icon="email"
 *   labelKey="login.email_label"
 *   required={true}
 *   onKeyDown={handleKeyDown}
 * />
 *
 * // Password input
 * <InputField
 *   id="password"
 *   name="password"
 *   type="password"
 *   placeholder="••••••••"
 *   icon="lock"
 *   label="Password"
 *   required={true}
 * />
 *
 * // Text input without icon
 * <InputField
 *   id="fullName"
 *   name="fullName"
 *   type="text"
 *   placeholder="Your Name"
 *   label="Full Name"
 *   maxLength={100}
 * />
 *
 * // Input with error state
 * <InputField
 *   id="email"
 *   name="email"
 *   type="email"
 *   placeholder="you@example.com"
 *   icon="email"
 *   label="Email"
 *   hasError={true}
 *   errorMessage="Please enter a valid email address"
 * />
 */

export interface InputFieldProps extends Props {
	id: string;
	name: string;
	type?: "text" | "email" | "password" | "tel" | "url" | "search";
	placeholder?: string;
	icon?: string; // Material icon name
	label?: string;
	labelKey?: string; // Translation key for label
	required?: boolean;
	disabled?: boolean;
	value?: string;
	onKeyDown?: (evt: KeyboardEvent) => void;
	onChange?: (evt: Event) => void;
	onInput?: (evt: Event) => void;
	onBlur?: (evt: Event) => void;
	onFocus?: (evt: Event) => void;
	maxLength?: number;
	minLength?: number;
	pattern?: string;
	autocomplete?: string;
	errorMessage?: string;
	hasError?: boolean;
}

export function InputField(props: InputFieldProps) {
	const {
		id,
		name,
		type = "text",
		placeholder,
		icon,
		label,
		labelKey,
		required = false,
		disabled = false,
		value,
		onKeyDown,
		onChange,
		onInput,
		onBlur,
		onFocus,
		maxLength,
		minLength,
		pattern,
		autocomplete,
		errorMessage,
		hasError = false,
	} = props;

	const inputRef = createRef<HTMLInputElement>();

	return (
		<div class="form-group">
			{(label || labelKey) && (
				<label class={`form-label ${hasError ? "error" : ""}`} for={id}>
					{labelKey ? <T key={labelKey} /> : label}
				</label>
			)}

			<div class="input-container">
				{icon && (
					<div class="input-icon">
						<span class="material-icons">{icon}</span>
					</div>
				)}

				<input
					ref={inputRef}
					class={`input-field ${hasError ? "error" : ""}`}
					id={id}
					name={name}
					type={type}
					placeholder={placeholder}
					required={required}
					disabled={disabled}
					value={value}
					onKeyDown={onKeyDown}
					onChange={onChange}
					onInput={onInput}
					onBlur={onBlur}
					onFocus={onFocus}
					maxLength={maxLength}
					minLength={minLength}
					pattern={pattern}
					autocomplete={autocomplete}
					style={{
						paddingLeft: icon ? "2.5rem" : "0.75rem",
					}}
				/>
			</div>

			<div data-field-error={name}>
				{errorMessage && <div class="field-error">{errorMessage}</div>}
			</div>
		</div>
	);
}
