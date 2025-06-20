import konstaConfig from "konsta/config";

/** @type {import('tailwindcss').Config} */
export default konstaConfig({
  content: [
    "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
    "./src/index.html",
  ],
  darkMode: "class",
});
