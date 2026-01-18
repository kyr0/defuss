import { createRef, type Props, T, Router } from "defuss";
import {
	NavigationMenu,
	type NavigationMenuRef,
} from "../components/navigation-menu";

export interface SettingsScreenProps extends Props {
	settings?: {
		notificationFrequency: string;
		pinCodeEnabled: boolean;
	};
}

export function SettingsScreen({ settings }: SettingsScreenProps) {
	const navigationMenuRef = createRef<NavigationMenuRef>();

	// Default settings if none provided
	const defaultSettings = {
		notificationFrequency: "daily",
		pinCodeEnabled: true,
	};

	const currentSettings = settings || defaultSettings;

	function toggleMenu() {
		console.log("Toggling menu");
		navigationMenuRef.state.toggle?.();
	}

	function handleNotificationChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		console.log("Notification frequency changed to:", target.value);
		// TODO: Implement settings save logic
	}

	function handlePinToggle(event: Event) {
		const target = event.target as HTMLInputElement;
		const pinCodeFields = document.getElementById("pin-code-fields");

		console.log("PIN code toggle:", target.checked);

		if (target.checked && pinCodeFields) {
			pinCodeFields.classList.remove("hidden");
		} else if (pinCodeFields) {
			pinCodeFields.classList.add("hidden");
		}

		// TODO: Implement PIN toggle logic
	}

	function handleSaveSettings() {
		const notificationSelect = document.getElementById(
			"notification-frequency",
		) as HTMLSelectElement;
		const pinToggle = document.getElementById(
			"pin-code-toggle",
		) as HTMLInputElement;
		const currentPin = (
			document.getElementById("current-pin") as HTMLInputElement
		)?.value;
		const newPin = (document.getElementById("new-pin") as HTMLInputElement)
			?.value;
		const confirmPin = (
			document.getElementById("confirm-pin") as HTMLInputElement
		)?.value;

		const settingsData = {
			notificationFrequency: notificationSelect?.value,
			pinCodeEnabled: pinToggle?.checked,
			currentPin,
			newPin,
			confirmPin,
		};

		console.log("Saving settings:", settingsData);

		// Basic validation for PIN
		if (pinToggle?.checked && newPin && newPin !== confirmPin) {
			alert("PIN codes do not match!");
			return;
		}

		if (pinToggle?.checked && newPin && newPin.length !== 4) {
			alert("PIN must be 4 digits!");
			return;
		}

		// TODO: Implement actual settings save logic
		alert("Settings saved! (Feature not yet fully implemented)");
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
				<header class="settings-header text-center px-6 py-8 md:px-8 rounded-t-2xl">
					<span class="material-icons text-6xl text-primary mb-2">
						settings
					</span>
					<h1 class="app-title text-3xl mb-2 text-amber-700 font-bold">
						<T key="settings.title" fallback="Settings" />
					</h1>
					<p class="text-gray-600 mt-2 text-lg">Customize your experience</p>
				</header>

				{/* Main Content */}
				<main class="settings-main p-6 space-y-6 pb-8">
					{/* Notification Settings Section */}
					<div class="card">
						<h2 class="settings-section-title">
							<T
								key="settings.notification_settings"
								fallback="Notification Settings"
							/>
						</h2>
						<div class="space-y-6">
							<div>
								<label class="setting-label" htmlFor="notification-frequency">
									<T
										key="settings.notification_frequency"
										fallback="Notification Frequency"
									/>
								</label>
								<p class="setting-description">
									<T
										key="settings.notification_frequency_description"
										fallback="Choose how often you want to receive notifications."
									/>
								</p>
								<select
									class="select-input"
									id="notification-frequency"
									name="notification-frequency"
									onChange={handleNotificationChange}
								>
									<option value="instantly">
										<T
											key="settings.frequency_options.instantly"
											fallback="Instantly"
										/>
									</option>
									<option
										value="daily"
										selected={currentSettings.notificationFrequency === "daily"}
									>
										<T
											key="settings.frequency_options.daily"
											fallback="Daily Digest"
										/>
									</option>
									<option value="weekly">
										<T
											key="settings.frequency_options.weekly"
											fallback="Weekly Summary"
										/>
									</option>
									<option value="never">
										<T
											key="settings.frequency_options.never"
											fallback="Never"
										/>
									</option>
								</select>
							</div>
						</div>
					</div>

					{/* Security Settings Section */}
					<div class="card">
						<h2 class="settings-section-title">
							<T key="settings.security" fallback="Security" />
						</h2>
						<div class="space-y-6">
							<div class="flex items-center justify-between">
								<div>
									<label class="setting-label" htmlFor="pin-code-toggle">
										<T key="settings.enable_pin" fallback="Enable PIN Code" />
									</label>
									<p class="setting-description">
										<T
											key="settings.pin_description"
											fallback="Secure your app with a 4-digit PIN code."
										/>
									</p>
								</div>
								<label
									class="flex items-center cursor-pointer"
									htmlFor="pin-code-toggle"
								>
									<div class="relative">
										<input
											class="sr-only peer"
											id="pin-code-toggle"
											type="checkbox"
											checked={currentSettings.pinCodeEnabled}
											onChange={handlePinToggle}
										/>
										<div class="toggle-bg w-11 h-6 bg-gray-200 rounded-md peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-md after:h-5 after:w-5 after:transition-all" />
									</div>
								</label>
							</div>

							<div class="space-y-4" id="pin-code-fields">
								<div>
									<label class="setting-label" htmlFor="current-pin">
										<T
											key="settings.current_pin"
											fallback="Current PIN (if changing)"
										/>
									</label>
									<input
										class="input-field"
										id="current-pin"
										maxLength={4}
										name="current-pin"
										placeholder="****"
										type="password"
									/>
									<p class="setting-description">
										<T
											key="settings.current_pin_description"
											fallback="Leave blank if setting up for the first time."
										/>
									</p>
								</div>
								<div>
									<label class="setting-label" htmlFor="new-pin">
										<T key="settings.new_pin" fallback="New 4-Digit PIN" />
									</label>
									<input
										class="input-field"
										id="new-pin"
										maxLength={4}
										name="new-pin"
										placeholder="****"
										type="password"
									/>
								</div>
								<div>
									<label class="setting-label" htmlFor="confirm-pin">
										<T key="settings.confirm_pin" fallback="Confirm New PIN" />
									</label>
									<input
										class="input-field"
										id="confirm-pin"
										maxLength={4}
										name="confirm-pin"
										placeholder="****"
										type="password"
									/>
								</div>
							</div>
						</div>
					</div>

					{/* Save Button */}
					<div class="save-button-container">
						<button type="button" class="save-btn" onClick={handleSaveSettings}>
							<T key="settings.save_changes" fallback="Save Changes" />
						</button>
					</div>
				</main>
			</div>
		</div>
	);
}
