import { StartMenu } from "./start-menu.js";

export const StartButton = () => {
  return (
    <ul class="start">
      <li class="xopen" tabindex="-1">
        <a href="#" class="program-image">
          <img src="/icons/windows.png" alt="" />
        </a>
        <a href="#"> start </a>
        <StartMenu />
      </li>
    </ul>
  );
};
