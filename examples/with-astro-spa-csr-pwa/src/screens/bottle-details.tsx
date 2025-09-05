import { createRef, type Props, T, Router } from "defuss";
import {
	NavigationMenu,
	type NavigationMenuRef,
} from "../components/navigation-menu";

export interface BottleDetailsScreenProps extends Props {
	bottleId?: string;
	bottle?: {
		id: string;
		sender: {
			name: string;
			avatar?: string;
		};
		content: string;
		receivedTime: string;
		isLiked?: boolean;
		isSaved?: boolean;
	};
}

export function BottleDetailsScreen({
	bottleId,
	bottle,
}: BottleDetailsScreenProps) {
	const navigationMenuRef = createRef<NavigationMenuRef>();

	// Get bottle ID from URL parameters if not provided as prop
	const urlParams = new URLSearchParams(window.location.search);
	const currentBottleId = bottleId || urlParams.get("id") || "1";

	// Default bottle data if none provided
	const defaultBottle = {
		id: currentBottleId,
		sender: {
			name: "Mysterious Voyager",
			avatar:
				"https://lh3.googleusercontent.com/aida-public/AB6AXuDs4BgGo7yyiLO3AYlp1nF0L7dJjPhUeAJHezda_XZX24bonin7xxNLH6m45ZV21EHI-4wSqxSk0R3QS0kW-noORZqGMmHQZaV0LdzGI145T_7dhwEMgrj-WwWBRPpuLWJgKYoz8YOIMX4arRrx4YogVev6TykgmoyZOC8QgiwpHvNWKNOIIDLEN-OPeJaqb_IVwf_O4oepMA8Ut3GczzdYb9chOyd4k3oRDWer80sLsSNQG4Lke7YRv1eByn0wATSPxEym9A8Hdm8",
		},
		content: `Hello there, fellow traveler of the digital seas!

I hope this message finds you well. I'm sending this out into the vast unknown, hoping to connect with someone, anyone. It's a strange feeling, isn't it? To cast your thoughts out like this, unsure of where they'll land.

May your day be filled with unexpected joys and small wonders.

Warmly,
A Drifting Soul`,
		receivedTime: "3 hours ago",
		isLiked: false,
		isSaved: false,
	};

	const displayBottle = bottle || defaultBottle;

	function goBack() {
		Router.navigate("/dashboard");
	}

	function toggleMenu() {
		console.log("Toggling menu");
		navigationMenuRef.state.toggle?.();
	}

	function closeMenu() {
		console.log("Closing menu");
		navigationMenuRef.state.close?.();
	}

	function handleLike() {
		console.log("Like button clicked for bottle:", displayBottle.id);
		// TODO: Implement like functionality
	}

	function handleSave() {
		console.log("Save button clicked for bottle:", displayBottle.id);
		// TODO: Implement save functionality
	}

	function handleSendMessage() {
		const textarea = document.querySelector(
			".bottle-message-textarea",
		) as HTMLTextAreaElement;
		if (textarea) {
			const message = textarea.value.trim();
			if (message) {
				console.log("Sending message:", message);
				// TODO: Implement send message functionality
				alert("Message sent! (Feature not yet implemented)");
				textarea.value = "";
			} else {
				alert("Please write a message before sending.");
			}
		}
	}

	function handleAttachment(type: string) {
		console.log("Attachment clicked:", type);
		// TODO: Implement attachment functionality
		alert(`${type} attachment not yet implemented`);
	}

	return (
		<div class="bottle-details-screen">
			{/* Navigation Menu */}
			<NavigationMenu ref={navigationMenuRef} />

			<div class="container-main">
				{/* Back button positioned in bottle neck */}
				<button type="button" class="bottle-neck-button" onClick={goBack}>
					<span class="material-icons">arrow_back</span>
					<T key="common.back" fallback="Back" />
				</button>

				{/* Header */}
				<header class="bottle-details-header text-center px-6 py-8 md:px-8 rounded-t-2xl">
					<h1 class="text-2xl font-semibold text-amber-800">
						<T key="bottle_details.title" fallback="Bottle Details" />
					</h1>
				</header>

				{/* Main Content */}
				<main class="p-6 space-y-6">
					{/* Bottle Content Section */}
					<section class="bottle-content bg-white p-6 rounded-xl">
						<div class="flex items-center mb-4">
							<img
								alt="Sender's avatar"
								class="w-12 h-12 rounded-full mr-4 border-2 border-amber-200"
								src={displayBottle.sender.avatar || "/default-avatar.png"}
							/>
							<div>
								<h2 class="text-lg font-semibold text-amber-700">
									<T key="bottle_details.from" fallback="From" />:{" "}
									{displayBottle.sender.name}
								</h2>
								<p class="text-sm text-gray-500">
									<T key="bottle_details.received" fallback="Received" />:{" "}
									{displayBottle.receivedTime}
								</p>
							</div>
						</div>

						<div class="bottle-message bg-amber-50 p-4 rounded-lg mb-4 border border-amber-200">
							<p class="text-gray-700 leading-relaxed whitespace-pre-line">
								{displayBottle.content}
							</p>
						</div>

						<div class="flex justify-end space-x-3">
							<button
								type="button"
								class={`flex items-center transition-colors ${
									displayBottle.isLiked
										? "text-amber-700"
										: "text-amber-600 hover:text-amber-700"
								}`}
								onClick={handleLike}
							>
								<span class="material-icons mr-1">
									{displayBottle.isLiked ? "thumb_up_alt" : "thumb_up_alt"}
								</span>
								<T key="bottle_details.like" fallback="Like" />
							</button>

							<button
								type="button"
								class={`flex items-center transition-colors ${
									displayBottle.isSaved
										? "text-amber-700"
										: "text-amber-600 hover:text-amber-700"
								}`}
								onClick={handleSave}
							>
								<span class="material-icons mr-1">
									{displayBottle.isSaved ? "bookmark" : "bookmark_border"}
								</span>
								<T key="bottle_details.save" fallback="Save" />
							</button>
						</div>
					</section>

					{/* Send Message Section */}
					<section class="send-message bg-white p-6 rounded-xl">
						<h2 class="text-xl font-semibold text-amber-700 mb-4">
							<T
								key="bottle_details.send_message"
								fallback="Send Your Own Message"
							/>
						</h2>

						<textarea
							class="bottle-message-textarea w-full h-40 p-4 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-none placeholder-gray-400 text-gray-700 bg-amber-50"
							placeholder="Write your message here... Let your thoughts drift..."
						/>

						<div class="mt-4 flex justify-between items-center">
							<div class="flex items-center space-x-2 text-gray-500">
								<button
									type="button"
									class="hover:text-amber-600 transition-colors"
									onClick={() => handleAttachment("emoji")}
								>
									<span class="material-icons text-lg">mood</span>
								</button>
								<button
									type="button"
									class="hover:text-amber-600 transition-colors"
									onClick={() => handleAttachment("file")}
								>
									<span class="material-icons text-lg">attach_file</span>
								</button>
								<button
									type="button"
									class="hover:text-amber-600 transition-colors"
									onClick={() => handleAttachment("image")}
								>
									<span class="material-icons text-lg">image</span>
								</button>
							</div>

							<button
								type="button"
								class="send-button bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-300 flex items-center"
								onClick={handleSendMessage}
							>
								<span class="material-icons mr-2">send</span>
								<T
									key="bottle_details.toss_into_sea"
									fallback="Toss into the Sea"
								/>
							</button>
						</div>
					</section>
				</main>
			</div>
		</div>
	);
}
