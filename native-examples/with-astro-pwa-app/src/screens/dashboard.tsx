import { createRef, type Props, T, $, Router } from "defuss";
import {
	NavigationMenu,
	type NavigationMenuRef,
} from "../components/navigation-menu";

export interface DashboardScreenProps extends Props {
	posts?: Array<{
		id: string;
		username: string;
		content: string;
		timeAgo: string;
		profileColor?: string;
		profileIcon?: string;
	}>;
}

export function DashboardScreen({ posts = [] }: DashboardScreenProps) {
	const navigationMenuRef = createRef<NavigationMenuRef>();
	// Default posts if none provided
	const defaultPosts = [
		{
			id: "1",
			username: "DriftingLeaf",
			content: "I've been feeling so overwhelmed lately 😔 Seeking support",
			timeAgo: "2h ago",
			profileIcon: "person",
		},
		{
			id: "2",
			username: "Anonymous17",
			content:
				"I had a nice day today for the first time in a while 😊 Just sharing",
			timeAgo: "5h ago",
			profileIcon: "person_outline",
		},
		{
			id: "3",
			username: "BlueSky",
			content: "Does anyone else struggle with anxiety at work? 😥",
			timeAgo: "1d ago",
			profileColor: "#60A5FA",
			profileIcon: "person",
		},
		{
			id: "4",
			username: "WanderingSoul",
			content: "Just wanted to send some positive vibes to everyone here! ✨",
			timeAgo: "2d ago",
			profileColor: "#C4B5FD",
			profileIcon: "person_outline",
		},
	];

	const displayPosts = posts.length > 0 ? posts : defaultPosts;

	function toggleMenu() {
		console.log("Toggling menu");
		navigationMenuRef.state.toggle?.();
	}

	function handleSendBottle(postId: string) {
		console.log("Navigating to bottle details for post:", postId);
		Router.navigate(`/bottle-details?id=${postId}`);
	}

	function handleCreatePost() {
		console.log("Navigating to create bottle page");
		Router.navigate("/create-bottle");
	}

	return (
		<div class="dashboard-screen">
			{/* Navigation Menu */}
			<NavigationMenu ref={navigationMenuRef} isOpen={false} />

			<div class="container-main">
				{/* Menu button positioned in bottle neck */}
				<button type="button" class="bottle-neck-button" onClick={toggleMenu}>
					<span class="material-icons">menu</span>
					<T key="navigation.menu" fallback="Menu" />
				</button>

				{/* Header */}
				<header class="dashboard-header text-center px-6 py-8 md:px-8 rounded-t-2xl">
					<span class="material-icons text-6xl text-primary mb-2">
						emoji_objects
					</span>
					<h1 class="app-title text-3xl mb-2 text-amber-700 font-bold">
						LIGHT IN A BOTTLE
					</h1>
					<p class="text-gray-600 mt-2 text-lg">
						<T
							key="dashboard.welcome"
							fallback="Share your light with the community"
						/>
					</p>
				</header>

				{/* Create Post Button */}
				<div class="text-center py-6 px-6">
					<button
						type="button"
						class="create-post-btn bg-amber-500 hover:bg-amber-600 text-white font-semibold py-4 px-8 rounded-md transition-colors duration-300 flex items-center mx-auto"
						onClick={handleCreatePost}
					>
						<span class="material-icons mr-2 text-2xl">add</span>
						<span>
							<T key="dashboard.create_post" fallback="Create New Post" />
						</span>
					</button>
				</div>

				{/* Main Content */}
				<main class="dashboard-main p-6 space-y-6 pb-24">
					{displayPosts.map((post) => (
						<div key={post.id} class="post-card p-5">
							<div class="flex items-start space-x-4">
								{/* Profile Icon */}
								<div
									class="post-profile-icon w-12 h-12 rounded-full flex items-center justify-center text-white"
									style={
										post.profileColor
											? `background-color: ${post.profileColor}`
											: ""
									}
								>
									<span class="material-icons text-3xl">
										{post.profileIcon || "person"}
									</span>
								</div>

								{/* Post Content */}
								<div class="flex-1">
									<div class="flex justify-between items-center mb-1">
										<h3 class="post-username font-semibold text-lg text-gray-800">
											{post.username}
										</h3>
										<span class="post-time text-sm text-gray-500">
											{post.timeAgo}
										</span>
									</div>
									<p class="post-content text-base mb-2 text-gray-600">
										{post.content}
									</p>
									<button
										type="button"
										class="send-bottle-btn px-5 py-2.5 text-sm font-medium flex items-center space-x-1.5 bg-amber-400 text-amber-900 rounded-md hover:bg-amber-500 transition-colors"
										onClick={() => handleSendBottle(post.id)}
									>
										<span class="material-icons text-lg">visibility</span>
										<span>
											<T key="dashboard.view_details" fallback="View Details" />
										</span>
									</button>
								</div>
							</div>
						</div>
					))}
				</main>
			</div>
		</div>
	);
}
