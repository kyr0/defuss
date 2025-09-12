import { type Props, queueCallback } from "defuss";

export interface SwiperProps extends Props {
	children?: unknown[];
	showNavigation?: boolean;
	showPagination?: boolean;
	className?: string;
	id?: string;
}

export function Swiper({
	children,
	showNavigation = true,
	showPagination = true,
	className = "",
	id = "swiper",
}: SwiperProps) {
	let currentIndex = 0;
	let slides: HTMLElement[] = [];
	let wrapper: HTMLElement;
	let paginationContainer: HTMLElement;

	function nextSlide(evt?: MouseEvent | TouchEvent | KeyboardEvent) {
		if (evt) {
			evt.preventDefault();
			evt.stopPropagation();
		}

		// if keyboard event, check for arrow right key
		if (evt instanceof KeyboardEvent && evt.key !== "ArrowRight") {
			return;
		}

		currentIndex = (currentIndex + 1) % slides.length;
		showSlide(currentIndex);
	}

	function prevSlide(evt?: MouseEvent | TouchEvent | KeyboardEvent) {
		if (evt) {
			evt.preventDefault();
			evt.stopPropagation();
		}

		if (evt instanceof KeyboardEvent && evt.key !== "ArrowLeft") {
			return;
		}

		currentIndex = (currentIndex - 1 + slides.length) % slides.length;
		showSlide(currentIndex);
	}

	function showSlide(index: number) {
		if (wrapper && slides.length > 0) {
			wrapper.style.transform = `translateX(-${index * 100}%)`;
			updatePagination(index);
			currentIndex = index;
		}
	}

	function updatePagination(index: number) {
		if (paginationContainer) {
			const bullets = paginationContainer.querySelectorAll(
				".swiper-pagination-bullet",
			);
			bullets.forEach((bullet, i) => {
				bullet.classList.toggle("swiper-pagination-bullet-active", i === index);
			});
		}
	}

	function createPagination() {
		if (paginationContainer && slides.length > 0) {
			// Clear existing pagination
			paginationContainer.innerHTML = "";

			slides.forEach((_, i) => {
				const bullet = document.createElement("div");
				bullet.classList.add("swiper-pagination-bullet");
				if (i === 0) {
					bullet.classList.add("swiper-pagination-bullet-active");
				}
				bullet.addEventListener("click", () => showSlide(i));
				paginationContainer.appendChild(bullet);
			});
		}
	}

	const onMount = () => {
		const swiperContainer = document.getElementById(id);
		if (!swiperContainer) return;

		wrapper = swiperContainer.querySelector(".swiper-wrapper") as HTMLElement;
		slides = Array.from(swiperContainer.querySelectorAll(".swiper-slide"));
		paginationContainer = swiperContainer.querySelector(
			".swiper-pagination",
		) as HTMLElement;

		let touchstartX = 0;
		let touchendX = 0;

		// Touch swipe handling
		if (wrapper) {
			wrapper.addEventListener(
				"touchstart",
				(e: TouchEvent) => {
					touchstartX = e.changedTouches[0].screenX;
				},
				{ passive: true },
			);

			wrapper.addEventListener("touchend", (e: TouchEvent) => {
				touchendX = e.changedTouches[0].screenX;
				handleSwipe(e);
			});

			function handleSwipe(e: TouchEvent) {
				const swipeThreshold = 50; // Minimum distance for a swipe
				if (touchendX < touchstartX - swipeThreshold) {
					nextSlide(e);
				} else if (touchendX > touchstartX + swipeThreshold) {
					prevSlide(e);
				}
			}
		}

		// Keyboard navigation
		document.addEventListener("keydown", (e: KeyboardEvent) => {
			if (e.key === "ArrowLeft") {
				prevSlide(e);
			} else if (e.key === "ArrowRight") {
				nextSlide(e);
			}
		});

		// Initialize
		if (showPagination) {
			createPagination();
		}
		showSlide(0);
	};

	return (
		<div
			class={`swiper-container ${className}`}
			id={id}
			onMount={queueCallback(onMount)}
		>
			<div class="swiper-wrapper">{children}</div>

			{showNavigation && (
				<>
					<div class="nav-button prev" onClick={prevSlide} onKeyUp={prevSlide}>
						<span class="material-icons">chevron_left</span>
					</div>
					<div class="nav-button next" onClick={nextSlide} onKeyUp={nextSlide}>
						<span class="material-icons">chevron_right</span>
					</div>
				</>
			)}

			{showPagination && <div class="swiper-pagination" />}
		</div>
	);
}
