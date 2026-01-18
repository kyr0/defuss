import { type Props, T, Router } from "defuss";
import { Footer } from "../components/footer";
import { Swiper } from "../components/swiper";
import { SwipeSlide } from "../components/swipe-slide";
import { WavesBackground } from "../components/waves";

export interface HomeScreenProps extends Props {
	// current click counter, passed down by SSR
	news: Array<{
		title: string;
		description: string;
		link: string;
	}>;
}

export function HomeScreen({ news }: HomeScreenProps) {
	function goToLogin() {
		Router.navigate("/login");
	}

	function goToSignup() {
		Router.navigate("/signup");
	}

	return (
		<div style="position: relative;">
			<WavesBackground />
			<div class="container-main" style="position: relative; z-index: 1;">
				<header class="text-center px-6 py-8 md:px-8 rounded-t-2xl">
					<span class="material-icons text-7xl text-primary mb-2">
						emoji_objects
					</span>
					<T tag="h1" class="app-title text-4xl mb-2" key="home.title" />
					<T
						tag="p"
						class="text-gray-600 mt-2 text-lg"
						key="home.description"
					/>
				</header>

				<div class="home-action-buttons">
					<button
						type="button"
						class="action-button primary"
						onClick={goToSignup}
					>
						<span class="material-icons">person_add</span>
						<T key="signup.sign_up_button" />
					</button>
					<button
						type="button"
						class="action-button secondary"
						onClick={goToLogin}
					>
						<span class="material-icons">login</span>
						<T key="login.sign_in_button" />
					</button>
				</div>
				<main class="p-0">
					<Swiper
						id="featureGallery"
						showNavigation={true}
						showPagination={true}
					>
						<SwipeSlide>
							<img alt="Community Support Icon" src="/tour/1.png" />
							<T tag="h3" key="home.features.support.title" />
							<T tag="p" key="home.features.support.description" />
						</SwipeSlide>
						<SwipeSlide>
							<img alt="Message in a Bottle Icon" src="/tour/2.png" />
							<T tag="h3" key="home.features.bottles.title" />
							<T tag="p" key="home.features.bottles.description" />
						</SwipeSlide>
						<SwipeSlide>
							<img alt="Positive Reactions Icon" src="/tour/1.png" />
							<T tag="h3" key="home.features.reactions.title" />
							<T tag="p" key="home.features.reactions.description" />
						</SwipeSlide>
						<SwipeSlide>
							<img alt="Building Connections Icon" src="/tour/2.png" />
							<T tag="h3" key="home.features.connections.title" />
							<T tag="p" key="home.features.connections.description" />
						</SwipeSlide>
						<SwipeSlide>
							<img alt="Mindful Sharing Icon" src="/tour/1.png" />
							<T tag="h3" key="home.features.mindful.title" />
							<T tag="p" key="home.features.mindful.description" />
						</SwipeSlide>
					</Swiper>
				</main>
				<div class="p-6 md:p-8 text-center space-y-4">
					<a class="action-button primary" href="/about">
						<T key="about.title" />
						<span class="material-icons ml-2">arrow_forward</span>
					</a>
				</div>
			</div>
			<Footer />
		</div>
	);
}
