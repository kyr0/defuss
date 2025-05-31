import "./Bootscreen.scss";

import type { Props } from "defuss";

export interface BootscreenProps extends Props {
  bootDelayMs?: number;
}

export function Bootscreen({ bootDelayMs = 0, ref }: BootscreenProps) {
  return (
    // forwarding the ref up to the parent component
    <div class="bootloader" ref={ref}>
      <div class="bootloader-container">
        <div class="bootloader-logo"></div>
        <div class="bootloader-loading">
          <ul>
            <li></li>
            <li></li>
            <li></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
