import type { Props } from "defuss";

export interface SwipeSlideProps extends Props {
	children?: unknown;
	className?: string;
}

export function SwipeSlide({ children, className = "" }: SwipeSlideProps) {
	return <div class={`swiper-slide ${className}`}>{children}</div>;
}
