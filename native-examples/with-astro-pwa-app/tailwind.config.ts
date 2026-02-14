/** @type {import('tailwindcss').Config} */
export default {
	content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
	theme: {
		extend: {
			colors: {
				// Primary colors
				primary: {
					DEFAULT: "#FBBF24",
					dark: "#F59E0B",
					darker: "#D97706",
					darkest: "#B45309",
					text: "#422006",
				},
				// Background colors
				bg: {
					main: "#FAF3E0",
					card: "#FFF8E7",
				},
				// Border colors
				border: {
					primary: "#FDE68A",
				},
				// Text colors
				text: {
					primary: "#4A5568",
					secondary: "#718096",
					tertiary: "#A0AEC0",
					dark: "#2D3748",
					heading: "#C05621",
				},
				// Gray scale (extending default Tailwind grays)
				gray: {
					100: "#F7FAFC",
					200: "#EDF2F7",
					300: "#E2E8F0",
					400: "#CBD5E0",
					500: "#A0AEC0",
					600: "#718096",
					700: "#4A5568",
					800: "#2D3748",
					900: "#1A202C",
					// Custom grays from design
					light: "#D1D5DB",
					medium: "#6b7280",
					dark: "#374151",
				},
				// State colors
				white: {
					DEFAULT: "#ffffff",
					overlay: "rgba(255, 255, 255, 0.7)",
					"overlay-hover": "rgba(255, 248, 231, 0.9)",
				},
			},
			fontFamily: {
				sans: ["Inter", "sans-serif"],
			},
			fontSize: {
				xs: "0.75rem",
				sm: "0.875rem",
				base: "1rem",
				lg: "1.125rem",
				xl: "1.25rem",
				"2xl": "1.5rem",
				"3xl": "1.875rem",
				"4xl": "2.25rem",
				"5xl": "3rem",
				"6xl": "3.75rem",
				"7xl": "4.5rem",
			},
			spacing: {
				"0": "0",
				"1": "0.25rem",
				"2": "0.5rem",
				"3": "0.75rem",
				"4": "1rem",
				"5": "1.25rem",
				"6": "1.5rem",
				"8": "2rem",
				"10": "2.5rem",
				"12": "3rem",
				"16": "4rem",
				"20": "5rem",
				"24": "6rem",
			},
			borderRadius: {
				sm: "0.125rem",
				base: "0.25rem",
				md: "0.375rem",
				lg: "0.5rem",
				xl: "0.75rem",
				"2xl": "1rem",
				"3xl": "1.5rem",
				full: "50%",
			},
			boxShadow: {
				sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
				base: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
				md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
				lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
				xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
				card: "0 4px 12px rgba(0, 0, 0, 0.05)",
				container: "0 8px 20px rgba(0, 0, 0, 0.08)",
				"nav-button": "0 2px 4px rgba(0,0,0,0.1)",
			},
			fontWeight: {
				normal: "400",
				medium: "500",
				semibold: "600",
				bold: "700",
			},
			transitionDuration: {
				fast: "150ms",
				base: "200ms",
				slow: "300ms",
			},
			transitionTimingFunction: {
				fast: "ease-out",
				base: "ease-in-out",
				slow: "ease-out",
			},
		},
	},
	plugins: [],
};
