import { type Props, T } from "defuss";

export interface CheckboxFieldProps extends Props {
	id: string;
	name: string;
	labelKey: string;
	required?: boolean;
	linkText?: string;
	linkHref?: string;
	linkKey?: string;
	containerClass?: string;
	onKeyDown?: (event: KeyboardEvent) => void;
	onChange?: (event: Event) => void;
}

export function CheckboxField(props: CheckboxFieldProps) {
	const {
		id,
		name,
		labelKey,
		required = false,
		linkText,
		linkHref,
		linkKey,
		containerClass,
		onKeyDown,
		onChange,
		...restProps
	} = props;

	return (
		<div class={containerClass || "checkbox-container"}>
			<input
				class="checkbox-field"
				id={id}
				name={name}
				type="checkbox"
				required={required}
				onKeyDown={onKeyDown}
				onChange={onChange}
				{...restProps}
			/>
			<label class="checkbox-label" for={id}>
				<T key={labelKey} />
				{linkHref && linkKey && (
					<>
						{" "}
						<a href={linkHref} class="text-link">
							<T key={linkKey} />
						</a>
					</>
				)}
				{linkHref && linkText && !linkKey && (
					<>
						{" "}
						<a href={linkHref} class="text-link">
							{linkText}
						</a>
					</>
				)}
			</label>
		</div>
	);
}
