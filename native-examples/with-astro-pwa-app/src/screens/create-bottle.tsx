import { createRef, type Props, T, Router } from "defuss";
import {
	NavigationMenu,
	type NavigationMenuRef,
} from "../components/navigation-menu";

export interface CreateBottleScreenProps extends Props {
	draft?: {
		message: string;
		mood: string;
		anonymous: boolean;
	};
}

export function CreateBottleScreen({ draft }: CreateBottleScreenProps) {
	const navigationMenuRef = createRef<NavigationMenuRef>();

	// State for form fields
	let message = draft?.message || "";
	let selectedMood = draft?.mood || "peaceful";
	let isAnonymous = draft?.anonymous || false;
	let showPreview = false;

	const MAX_CHARACTERS = 280;
	const characterCount = message.length;
	const charactersRemaining = MAX_CHARACTERS - characterCount;

	function toggleMenu() {
		console.log("Toggling menu");
		navigationMenuRef.state.toggle?.();
	}

	function goBack() {
		// Save draft before leaving
		if (message.trim()) {
			saveDraft();
		}
		Router.navigate("/dashboard");
	}

	function handleMessageChange(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		message = target.value;
		// Update character count display
		updateCharacterCount();
	}

	function handleMoodChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		selectedMood = target.value;
	}

	function handleAnonymousToggle(event: Event) {
		const target = event.target as HTMLInputElement;
		isAnonymous = target.checked;
	}

	function updateCharacterCount() {
		const countElement = document.getElementById("character-count");
		const remainingElement = document.getElementById("characters-remaining");

		if (countElement) {
			countElement.textContent = characterCount.toString();
		}

		if (remainingElement) {
			remainingElement.textContent = charactersRemaining.toString();

			// Change color based on remaining characters
			if (charactersRemaining < 20) {
				remainingElement.className = "text-red-500 text-sm";
			} else if (charactersRemaining < 50) {
				remainingElement.className = "text-amber-600 text-sm";
			} else {
				remainingElement.className = "text-gray-500 text-sm";
			}
		}
	}

	function saveDraft() {
		const draftData = {
			message: message.trim(),
			mood: selectedMood,
			anonymous: isAnonymous,
			timestamp: new Date().toISOString(),
		};

		// TODO: Save to localStorage or backend
		localStorage.setItem("bottle_draft", JSON.stringify(draftData));

		// Show temporary notification
		const notification = document.createElement("div");
		notification.className =
			"fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg z-50";
		notification.textContent = "Draft saved";
		document.body.appendChild(notification);

		setTimeout(() => {
			document.body.removeChild(notification);
		}, 2000);
	}

	function togglePreview() {
		showPreview = !showPreview;
		const previewSection = document.getElementById("preview-section");
		const formSection = document.getElementById("form-section");

		if (previewSection && formSection) {
			if (showPreview) {
				previewSection.classList.remove("hidden");
				formSection.classList.add("hidden");
				updatePreview();
			} else {
				previewSection.classList.add("hidden");
				formSection.classList.remove("hidden");
			}
		}
	}

	function updatePreview() {
		const previewMessage = document.getElementById("preview-message");
		const previewMood = document.getElementById("preview-mood");
		const previewUsername = document.getElementById("preview-username");

		if (previewMessage) {
			previewMessage.textContent =
				message || "Your message will appear here...";
		}

		if (previewMood) {
			previewMood.textContent = selectedMood;
		}

		if (previewUsername) {
			previewUsername.textContent = isAnonymous ? "Anonymous" : "YourUsername";
		}
	}

	function handleSendBottle() {
		// Validate message
		if (!message.trim()) {
			alert("Please enter a message");
			return;
		}

		if (message.length > MAX_CHARACTERS) {
			alert(
				`Message too long. Please keep it under ${MAX_CHARACTERS} characters.`,
			);
			return;
		}

		// TODO: Check daily limit
		// TODO: Send to backend
		const bottleData = {
			message: message.trim(),
			mood: selectedMood,
			anonymous: isAnonymous,
			timestamp: new Date().toISOString(),
		};

		console.log("Sending bottle:", bottleData);

		// Clear draft
		localStorage.removeItem("bottle_draft");

		// Show success message
		alert("Your bottle has been sent into the sea! 🌊");

		// Navigate back to dashboard
		Router.navigate("/dashboard");
	}

	return (
		<div class="min-h-screen bg-amber-50">
			{/* Navigation Menu */}
			<NavigationMenu ref={navigationMenuRef} />

			<div class="container-main">
				{/* Back button positioned in bottle neck */}
				<button type="button" class="bottle-neck-button" onClick={goBack}>
					<span class="material-icons">arrow_back</span>
					<T key="common.back" fallback="Back" />
				</button>

				{/* Header */}
				<header class="create-bottle-header text-center px-6 py-8 md:px-8 rounded-t-2xl">
					<span class="material-icons text-6xl text-primary mb-2">message</span>
					<h1 class="app-title text-3xl mb-2 text-amber-700 font-bold">
						<T key="create_bottle.title" fallback="Create Your Bottle" />
					</h1>
					<p class="text-gray-600 mt-2 text-lg">
						<T
							key="create_bottle.subtitle"
							fallback="Share your light with the community"
						/>
					</p>
				</header>

				{/* Main Content */}
				<main class="create-bottle-main p-6 pb-8">
					{/* Form Section */}
					<div id="form-section" class="space-y-6">
						{/* Message Input */}
						<div class="card">
							<label class="message-label" htmlFor="bottle-message">
								<T key="create_bottle.message_label" fallback="Your Message" />
							</label>
							<textarea
								id="bottle-message"
								class="message-textarea"
								placeholder="What would you like to share today? Perhaps a thought, feeling, or moment of inspiration..."
								value={message}
								maxLength={MAX_CHARACTERS}
								rows={6}
								onChange={handleMessageChange}
							/>
							<div class="flex justify-between items-center mt-2">
								<span class="text-gray-500 text-sm">
									<T
										key="create_bottle.character_limit"
										fallback="280 character limit"
									/>
								</span>
								<span id="characters-remaining" class="text-gray-500 text-sm">
									{charactersRemaining}{" "}
									<T
										key="create_bottle.character_count"
										fallback="characters"
									/>
								</span>
							</div>
						</div>

						{/* Mood Selection */}
						<div class="card">
							<label class="mood-label" htmlFor="mood-select">
								<T
									key="create_bottle.mood_label"
									fallback="How are you feeling?"
								/>
							</label>
							<select
								id="mood-select"
								class="mood-select"
								value={selectedMood}
								onChange={handleMoodChange}
							>
								<option value="peaceful">
									<T
										key="create_bottle.mood_options.peaceful"
										fallback="Peaceful"
									/>
								</option>
								<option value="grateful">
									<T
										key="create_bottle.mood_options.grateful"
										fallback="Grateful"
									/>
								</option>
								<option value="hopeful">
									<T
										key="create_bottle.mood_options.hopeful"
										fallback="Hopeful"
									/>
								</option>
								<option value="reflective">
									<T
										key="create_bottle.mood_options.reflective"
										fallback="Reflective"
									/>
								</option>
								<option value="joyful">
									<T
										key="create_bottle.mood_options.joyful"
										fallback="Joyful"
									/>
								</option>
								<option value="contemplative">
									<T
										key="create_bottle.mood_options.contemplative"
										fallback="Contemplative"
									/>
								</option>
							</select>
						</div>

						{/* Anonymous Toggle */}
						<div class="card">
							<div class="flex items-center justify-between">
								<div>
									<span class="anonymous-label">
										<T
											key="create_bottle.anonymous_label"
											fallback="Post anonymously"
										/>
									</span>
									<p class="anonymous-description">
										<T
											key="create_bottle.anonymous_description"
											fallback="Your username will be hidden from other users"
										/>
									</p>
								</div>
								<label
									class="flex items-center cursor-pointer"
									htmlFor="anonymous-toggle"
								>
									<div class="relative">
										<input
											type="checkbox"
											id="anonymous-toggle"
											checked={isAnonymous}
											onChange={handleAnonymousToggle}
											class="sr-only peer"
										/>
										<div class="toggle-bg w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all" />
									</div>
								</label>
							</div>
						</div>

						{/* Action Buttons */}
						<div class="action-buttons space-y-3">
							<button type="button" class="preview-btn" onClick={togglePreview}>
								<span class="material-icons mr-2">preview</span>
								<T key="create_bottle.preview" fallback="Preview Your Bottle" />
							</button>

							<button type="button" class="send-btn" onClick={handleSendBottle}>
								<span class="material-icons mr-2">send</span>
								<T
									key="create_bottle.send_bottle"
									fallback="Toss Bottle into the Sea"
								/>
							</button>

							<button type="button" class="save-draft-btn" onClick={saveDraft}>
								<span class="material-icons mr-2">save</span>
								Save Draft
							</button>
						</div>
					</div>

					{/* Preview Section */}
					<div id="preview-section" class="hidden space-y-6">
						<div class="preview-card">
							<h3 class="preview-title">
								<T key="create_bottle.preview" fallback="Preview Your Bottle" />
							</h3>

							<div class="bottle-preview">
								<div class="flex items-start space-x-4">
									<div class="flex-shrink-0">
										<div class="profile-icon">
											<span class="material-icons">person</span>
										</div>
									</div>

									<div class="flex-1">
										<div class="flex items-center space-x-2 mb-2">
											<span
												id="preview-username"
												class="font-medium text-gray-900"
											>
												{isAnonymous ? "Anonymous" : "YourUsername"}
											</span>
											<span class="text-gray-500 text-sm">•</span>
											<span class="text-gray-500 text-sm">now</span>
											<span class="mood-badge" id="preview-mood">
												{selectedMood}
											</span>
										</div>

										<p
											id="preview-message"
											class="text-gray-800 leading-relaxed"
										>
											{message || "Your message will appear here..."}
										</p>
									</div>
								</div>
							</div>

							<div class="preview-actions">
								<button type="button" class="edit-btn" onClick={togglePreview}>
									<span class="material-icons mr-1">edit</span>
									Edit
								</button>

								<button
									type="button"
									class="send-btn"
									onClick={handleSendBottle}
								>
									<span class="material-icons mr-2">send</span>
									<T
										key="create_bottle.send_bottle"
										fallback="Toss Bottle into the Sea"
									/>
								</button>
							</div>
						</div>
					</div>
				</main>
			</div>
		</div>
	);
}
