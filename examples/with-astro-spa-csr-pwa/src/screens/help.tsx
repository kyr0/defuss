import { createRef, type Props, T } from "defuss";
import {
	NavigationMenu,
	type NavigationMenuRef,
} from "../components/navigation-menu";

export interface HelpScreenProps extends Props {}

export function HelpScreen(_props: HelpScreenProps) {
	const navigationMenuRef = createRef<NavigationMenuRef>();

	function toggleMenu() {
		console.log("Toggling menu");
		navigationMenuRef.state.toggle?.();
	}

	function handleContactSupport() {
		// TODO: Implement contact support functionality
		console.log("Contact support clicked");
		// This could open a contact form, email client, or navigate to a contact page
		window.location.href = "mailto:support@lightinabottle.com";
	}

	return (
		<div class="min-h-screen bg-amber-50">
			{/* Navigation Menu */}
			<NavigationMenu ref={navigationMenuRef} />

			<div class="container-main">
				{/* Menu button positioned in bottle neck */}
				<button type="button" class="bottle-neck-button" onClick={toggleMenu}>
					<span class="material-icons">menu</span>
					<T key="navigation.menu" fallback="Menu" />
				</button>

				{/* Header */}
				<header class="help-header text-center px-6 py-8 md:px-8 rounded-t-2xl">
					<span class="material-icons text-6xl text-primary mb-2">
						help_outline
					</span>
					<h1 class="app-title text-3xl mb-2 text-amber-700 font-bold">
						<T key="help.title" fallback="Help Center" />
					</h1>
					<p class="text-gray-600 mt-2 text-lg">
						Find answers to your questions
					</p>
				</header>

				{/* Main Content */}
				<main class="help-main p-6 space-y-6 pb-8">
					{/* FAQ Section */}
					<div class="card">
						<h2 class="help-section-title">
							<T key="help.faq" fallback="Frequently Asked Questions" />
						</h2>
						<div class="space-y-4">
							{/* FAQ Item 1 */}
							<details class="faq-item">
								<summary class="faq-question">
									<span class="font-medium">
										<T
											key="help.questions.change_password.question"
											fallback="How do I change my password?"
										/>
									</span>
									<span class="material-icons disclosure-arrow">
										chevron_right
									</span>
								</summary>
								<div class="faq-answer">
									<p class="text-sm">
										<T
											key="help.questions.change_password.answer"
											fallback="You can change your password from the Settings page. Navigate to 'Settings', then find the 'Security' section. There you will find an option to update your password. You will need to enter your current password and then your new password twice."
										/>
									</p>
								</div>
							</details>

							{/* FAQ Item 2 */}
							<details class="faq-item">
								<summary class="faq-question">
									<span class="font-medium">
										<T
											key="help.questions.notification_frequency.question"
											fallback="How can I adjust notification frequency?"
										/>
									</span>
									<span class="material-icons disclosure-arrow">
										chevron_right
									</span>
								</summary>
								<div class="faq-answer">
									<p class="text-sm">
										<T
											key="help.questions.notification_frequency.answer"
											fallback="To adjust your notification frequency, go to the 'Settings' page. Under 'Notification Settings', you'll find a dropdown menu labeled 'Notification Frequency'. Select your preferred option (e.g., Instantly, Daily Digest, Weekly Summary, or Never) and save your changes."
										/>
									</p>
								</div>
							</details>

							{/* FAQ Item 3 */}
							<details class="faq-item">
								<summary class="faq-question">
									<span class="font-medium">
										<T
											key="help.questions.pin_code.question"
											fallback="What is the PIN code feature?"
										/>
									</span>
									<span class="material-icons disclosure-arrow">
										chevron_right
									</span>
								</summary>
								<div class="faq-answer">
									<p class="text-sm">
										<T
											key="help.questions.pin_code.answer"
											fallback="The PIN code feature adds an extra layer of security to your app. When enabled, you'll need to enter a 4-digit PIN to access the app. You can enable, disable, or change your PIN from the 'Security' section within the 'Settings' page."
										/>
									</p>
								</div>
							</details>

							{/* FAQ Item 4 */}
							<details class="faq-item">
								<summary class="faq-question">
									<span class="font-medium">
										<T
											key="help.questions.forgot_pin.question"
											fallback="I forgot my PIN. What should I do?"
										/>
									</span>
									<span class="material-icons disclosure-arrow">
										chevron_right
									</span>
								</summary>
								<div class="faq-answer">
									<p class="text-sm">
										<T
											key="help.questions.forgot_pin.answer"
											fallback="If you've forgotten your PIN, you'll typically need to reset it. This process might involve verifying your identity through your email or other security questions. Please look for a 'Forgot PIN?' option on the PIN entry screen or contact support for assistance."
										/>
									</p>
								</div>
							</details>
						</div>
					</div>

					{/* Contact Support Section */}
					<div class="card">
						<h2 class="help-section-title">
							<T key="help.contact_support" fallback="Contact Support" />
						</h2>
						<p class="help-description">
							<T
								key="help.contact_description"
								fallback="If you couldn't find the answer to your question in our FAQ, please feel free to reach out to our support team."
							/>
						</p>
						<button
							type="button"
							class="contact-btn"
							onClick={handleContactSupport}
						>
							<span class="material-icons align-middle mr-2 text-base">
								email
							</span>
							<T key="help.contact_us" fallback="Contact Us" />
						</button>
					</div>
				</main>
			</div>
		</div>
	);
}
