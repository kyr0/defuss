import { createRef, type Props, T, Router } from "defuss";
import {
	NavigationMenu,
	type NavigationMenuRef,
} from "../components/navigation-menu";

export interface ProfileScreenProps extends Props {
	user?: {
		username: string;
		bio: string;
		stats: {
			bottlesSent: number;
			bottlesReceived: number;
			connections: number;
		};
	};
	posts?: Array<{
		id: string;
		content: string;
		timeAgo: string;
	}>;
}

export function ProfileScreen({ user, posts = [] }: ProfileScreenProps) {
	const navigationMenuRef = createRef<NavigationMenuRef>();

	// Default user data if none provided
	const defaultUser = {
		username: "DriftingLeaf",
		bio: "Finding light in unexpected places. Spreading kindness one bottle at a time.",
		stats: {
			bottlesSent: 12,
			bottlesReceived: 28,
			connections: 42,
		},
	};

	// Default posts if none provided
	const defaultPosts = [
		{
			id: "1",
			content: "I've been feeling so overwhelmed lately 😔 Seeking support",
			timeAgo: "2h ago",
		},
		{
			id: "2",
			content:
				"Had a moment of clarity today. Sometimes the smallest things bring the biggest peace. 🌱",
			timeAgo: "1d ago",
		},
	];

	const currentUser = user || defaultUser;
	const displayPosts = posts.length > 0 ? posts : defaultPosts;

	function toggleMenu() {
		console.log("Toggling menu");
		navigationMenuRef.state.toggle?.();
	}

	function handleEditProfile() {
		console.log("Edit profile clicked");
		// TODO: Navigate to edit profile page or open modal
	}

	function handleSettings() {
		Router.navigate("/settings");
	}

	function handleEditPost(postId: string) {
		console.log("Edit post:", postId);
		// TODO: Implement edit post functionality
	}

	function handleDeletePost(postId: string) {
		console.log("Delete post:", postId);
		// TODO: Implement delete post functionality
	}

	function handleCreatePost() {
		console.log("Create new post");
		// TODO: Navigate to create post page or open modal
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
				<header class="profile-header flex justify-between items-center p-4 border-b border-amber-200">
					<div />
					<h1 class="font-bold text-xl text-amber-700">
						<T key="profile.title" fallback="My Profile" />
					</h1>
					<button
						type="button"
						class="settings-btn p-2 rounded- bg-amber-400 hover:bg-amber-500 transition-colors"
						onClick={handleSettings}
					>
						<span class="material-icons text-2xl text-amber-900">settings</span>
					</button>
				</header>

				{/* Main Content */}
				<main class="profile-main p-4 space-y-6 pb-8">
					{/* Profile Info */}
					<div class="flex flex-col items-center space-y-4">
						<div class="relative">
							<div class="profile-icon w-28 h-28 rounded-full flex items-center justify-center ring-4 ring-amber-300 bg-blue-300">
								<span class="material-icons text-7xl text-white">person</span>
							</div>
							<button
								type="button"
								class="absolute bottom-0 right-0 bg-amber-400 hover:bg-amber-500 text-amber-900 p-2 rounded-md shadow-md transition-colors"
								onClick={handleEditProfile}
							>
								<span class="material-icons text-lg">edit</span>
							</button>
						</div>
						<h2 class="username font-bold text-2xl text-gray-700">
							{currentUser.username}
						</h2>
						<p class="bio text-center text-sm max-w-xs text-gray-600">
							"{currentUser.bio}"
						</p>
						<button
							type="button"
							class="edit-profile-btn px-6 py-2.5 text-sm font-medium bg-amber-400 hover:bg-amber-500 text-amber-900 rounded-md transition-colors"
							onClick={handleEditProfile}
						>
							<T key="profile.edit_profile" fallback="Edit Profile" />
						</button>
					</div>

					{/* Stats */}
					<div class="grid grid-cols-3 gap-4 text-center py-4 border-t border-b border-amber-200">
						<div>
							<p class="stat-value font-semibold text-lg text-gray-700">
								{currentUser.stats.bottlesSent}
							</p>
							<p class="stat-label text-xs text-gray-500">
								<T key="profile.stats.bottles_sent" fallback="Bottles Sent" />
							</p>
						</div>
						<div>
							<p class="stat-value font-semibold text-lg text-gray-700">
								{currentUser.stats.bottlesReceived}
							</p>
							<p class="stat-label text-xs text-gray-500">
								<T
									key="profile.stats.bottles_received"
									fallback="Bottles Received"
								/>
							</p>
						</div>
						<div>
							<p class="stat-value font-semibold text-lg text-gray-700">
								{currentUser.stats.connections}
							</p>
							<p class="stat-label text-xs text-gray-500">
								<T key="profile.stats.connections" fallback="Connections" />
							</p>
						</div>
					</div>

					{/* Tabs */}
					<div class="flex border-b border-amber-200">
						<button
							type="button"
							class="tab active flex-1 py-3 text-sm font-medium text-amber-600 border-b-2 border-amber-400"
						>
							<T key="profile.tabs.my_posts" fallback="My Posts" />
						</button>
						<button
							type="button"
							class="tab flex-1 py-3 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-amber-600 hover:border-amber-400 transition-colors"
						>
							<T key="profile.tabs.saved_bottles" fallback="Saved Bottles" />
						</button>
					</div>

					{/* Posts */}
					<div class="space-y-6">
						{displayPosts.map((post) => (
							<div key={post.id} class="card p-5">
								<div class="flex items-start space-x-4">
									<div class="profile-icon w-10 h-10 rounded-full flex items-center justify-center text-xl bg-blue-300">
										<span class="material-icons text-white">person</span>
									</div>
									<div class="flex-1">
										<div class="flex justify-between items-center mb-1">
											<h3 class="username font-semibold text-base text-gray-700">
												{currentUser.username}
											</h3>
											<span class="time-ago text-xs text-gray-400">
												{post.timeAgo}
											</span>
										</div>
										<p class="post-text text-sm mb-2 text-gray-600">
											{post.content}
										</p>
										<div class="flex space-x-2">
											<button
												type="button"
												class="text-amber-600 hover:text-amber-700 p-1 rounded-md transition-colors"
												onClick={() => handleEditPost(post.id)}
											>
												<span class="material-icons text-lg">edit</span>
											</button>
											<button
												type="button"
												class="text-red-500 hover:text-red-600 p-1 rounded-md transition-colors"
												onClick={() => handleDeletePost(post.id)}
											>
												<span class="material-icons text-lg">delete</span>
											</button>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				</main>
			</div>

			{/* Floating Action Button */}
			<button
				type="button"
				class="fab fixed bottom-6 right-6 w-16 h-16 rounded-md flex items-center justify-center shadow-lg bg-amber-400 hover:bg-amber-500 text-amber-900 transition-colors"
				onClick={handleCreatePost}
			>
				<span class="material-icons text-3xl">add</span>
			</button>
		</div>
	);
}
