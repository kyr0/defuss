import { StartButton } from "./start-button.js";

export const Taskbar = () => {
  return (
    <div class="bar crt">
      <StartButton />
      <ul class="taskbar"></ul>
      <div class="tray-toggle">
        <div class="arrow"></div>
      </div>
      <div class="taskbar__clock">
        <span>7:02 AM</span>
      </div>
    </div>
  );
};
