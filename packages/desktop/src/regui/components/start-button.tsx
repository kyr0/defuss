import { StartMenu } from "./start-menu.js";

export const StartButton = () => {
  return (
    <ul class="start-button">
      <img
        class="start-button-icon"
        src="/defuss_xp_quad.webp"
        alt="Start Icon"
      />
      <a href="#">Start </a>
      <StartMenu />
    </ul>
  );
};
