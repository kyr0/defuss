import { changeLanguage, getLanguage } from "defuss";

export function LanguageChooser() {
	const handleLanguageChange = (event: Event) => {
		const target = event.target as HTMLSelectElement;
		const selectedLanguage = target.value;
		changeLanguage(selectedLanguage);
	};

	console.log("Current language:", getLanguage());
	return (
		<div class="language-chooser">
			<select
				class="language-select"
				value={getLanguage()}
				onChange={handleLanguageChange}
				aria-label="Choose language"
			>
				<option value="de" selected={getLanguage() === "de"}>
					Deutsch
				</option>
				<option value="en" selected={getLanguage() === "en"}>
					English
				</option>
			</select>
		</div>
	);
}
