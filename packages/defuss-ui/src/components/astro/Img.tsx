import { createRef, type CSSProperties, type Props } from "defuss/client"

export interface ImgProps extends Props {
	id?: string;
	src: string;
	width?: number;
	height?: number;
	alt: string;
	style?: CSSProperties;
	class?: string;
	className?: string;
	format?: string;
	astroAssetsPath?: string;
	previewQuality?: number;
	quality?: number;
}

export const Img = ({
	id,
	src,
	alt,
	height = 100,
	width = 100,
	previewQuality = 5,
	quality = 90,
	className = "",
	class: _class = "",
	style = {},
	format = "webp",
	astroAssetsPath = "_defuss/image",
}: ImgProps) => {

	const placeholderWidth = Math.round(width / 7);
	const placeholderHeight = Math.round(height / 7);
	const imgRef = createRef<null, HTMLImageElement>();

	const getTransformOptionsPath = ({
		src,
		height,
		width,
		quality = previewQuality,
		format = "webp",
	}: Partial<ImgProps>): string => {
		const transformOptions = new URLSearchParams({
			href: src!,
			h: height!.toString(),
			w: width!.toString(),
			q: quality!.toString(),
			f: format,
		});
		return `/${astroAssetsPath}?${transformOptions.toString()}`;
	};

	// Initial transformed source for the placeholder image
	const transformedSrc = getTransformOptionsPath({
		src,
		height: placeholderHeight,
		width: placeholderWidth,
		format,
	});

	const whenImageMounts = () => {
		const img = imgRef.current;
		if (!img) return;

		let loaded = false;

		// Function to generate the transformed image path
		const getTransformOptionsPath = ({ src, height, width, quality, format }: Partial<ImgProps>) => {
			const transformOptions = new URLSearchParams({
				href: src!,
				h: height!.toString(),
				w: width!.toString(),
				q: quality!.toString(),
				f: format!,
			});
			return `/${astroAssetsPath}?${transformOptions.toString()}`;
		};

		// Lazy load function to update the image source
		const lazyLoad = () => {
			if (loaded) return;
			const transformedSrc = getTransformOptionsPath({
				src,
				height,
				width,
				quality,
				format,
			});
			img.src = transformedSrc;
			img.onload = () => {
				img.classList.remove('blur');
				img.classList.add('loaded');
				img.style.filter = 'blur(0px)';
				loaded = true;
			};
		};

		// Create the Intersection Observer
		const observer = new window.IntersectionObserver((entries, observer) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					lazyLoad();
					observer.unobserve(entry.target);
				}
			});
		}, { threshold: 0.1 });

		// Observe the image element
		observer.observe(imgRef.current);
	}

	return (
		<img
			id={id}
			ref={imgRef}
			onMount={whenImageMounts}
			alt={alt}
			class={`${className || _class} blur`}
			src={transformedSrc}
			style={{
				filter: "blur(40px)",
				transition: "0.125s filter linear",
				...style,
			}}
			width={width}
			height={height}
		/>
	);
};

export default Img;