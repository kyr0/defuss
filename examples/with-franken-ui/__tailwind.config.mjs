import franken from 'franken-ui/shadcn-ui/preset-quick';
import tailwindAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
	presets: [franken()],
	content: [],
	safelist: [
		{
			pattern: /^uk-/
		},
		'ProseMirror',
		'ProseMirror-focused',
		'tiptap',
		'mr-2',
		'mt-2',
		'opacity-50'
	],
	theme: {
		"extend": {
			"fontFamily": {
				"sans": [
					"var(--font-sans)",
					"sans-serif"
				]
			},
			"colors": {
				"background": "#FAF8F0",
				"foreground": "#000000",
				"neutral": {
					"50": "#fcfaf2",
					"100": "#f6f5ed",
					"200": "#e8e6e0",
					"300": "#d6d4cf",
					"400": "#a4a39e",
					"500": "#73726f",
					"600": "#545351",
					"700": "#41403e",
					"800": "#282726",
					"900": "#181818"
				},
				"brand": {
					"50": "#fffbeb",
					"100": "#fff5cc",
					"200": "#ffea95",
					"300": "#ffd960",
					"400": "#fec748",
					"500": "#f6a533",
					"600": "#d97d23",
					"700": "#b45718",
					"800": "#924214",
					"900": "#783611"
				},
				"highlight": {
					"50": "#effdff",
					"100": "#ddf9ff",
					"200": "#bdf3ff",
					"300": "#8fe9ff",
					"400": "#54d8fb",
					"500": "#4abce0",
					"600": "#4297bb",
					"700": "#397a98",
					"800": "#2c617a",
					"900": "#224f66"
				}
			},
			"borderRadius": {
				"sm": "0.125rem",
				"default": "0.25rem",
				"md": "0.375rem",
				"lg": "0.625rem",
				"xl": "0.9375rem",
				"2xl": "1.2813rem",
				"3xl": "1.625rem"
			},
			"keyframes": {
				"accordion-down": {
					"from": {
						"height": "0"
					},
					"to": {
						"height": "var(--radix-accordion-content-height)"
					}
				},
				"accordion-up": {
					"from": {
						"height": "var(--radix-accordion-content-height)"
					},
					"to": {
						"height": "0"
					}
				}
			},
			"animation": {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out"
			}
		}
	},
	plugins: [tailwindAnimate]
};
