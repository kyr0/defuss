import { type Props, T } from "defuss";
import { Footer } from "../components/footer";

export interface AboutScreenProps extends Props {}

export function AboutScreen(_props: AboutScreenProps) {
	return (
		<div>
			<div class="container-main container-about">
				{/* Back button positioned in bottle neck */}
				<a class="bottle-neck-button" href="/">
					<span class="material-icons">arrow_back</span>
					<T key="about.back_to_home" />
				</a>

				<div class="about-header">
					<span class="material-icons about-icon">info_outline</span>
					<T tag="h1" class="about-title" key="about.title" />
					<T tag="p" class="about-subtitle" key="about.subtitle" />
				</div>

				<div class="about-content">
					<T tag="p" class="about-paragraph" key="about.welcome" />

					<div class="creator-section">
						<img
							alt="Developer Profile"
							class="profile-image"
							src="https://lh3.googleusercontent.com/aida-public/AB6AXuCeCTQTHnKyWYE6ryDRYPnvYc9g4g6tMNPPd4ZtqPRxZgYEuDZHM-iB5ZLpjwa5jnuM_tWN26JXezZIYwu6EkYvXvMdzKJa9bNSqDLHn3mQe-I48hqXHt2fEvQwHyC0gYfOSAbllUZlfof0wXvJBTtK7hBAP15LykrB4bf65NKIkg3u5521t1XVXvxcVUfJS6v-H1P8Ygv7h3hFLbgi7tldNjR2r3rbCls7JzVOwnOMGLtwtOstG6AcOBa0b1EyZA2yYsHC8LyCuzbD"
						/>
						<T tag="h2" class="creator-title" key="about.creator_title" />
						<T tag="p" class="creator-subtitle" key="about.creator_subtitle" />
					</div>

					<T tag="p" class="about-paragraph" key="about.creator_story" />
					<T tag="p" class="about-paragraph" key="about.mission" />
					<T tag="p" class="about-paragraph" key="about.closing" />
				</div>
			</div>

			<Footer />
		</div>
	);
}
