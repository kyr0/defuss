import { LanguageChooser } from "./language-chooser.js";

export const Footer = () => {
	return (
		<footer class="footer">
			<div class="footer-language-chooser">
				<LanguageChooser />
			</div>
			Light in a Bottle © 2025. All rights reserved. <br />
			<a class="text-link" href="/tos?tab=privacy-policy">
				Privacy Policy
			</a>{" "}
			|{" "}
			<a class="text-link" href="/tos?tab=terms">
				Terms of Service
			</a>
		</footer>
	);
};
