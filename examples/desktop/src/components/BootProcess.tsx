import "./BootProcess.scss";

import { createRef, type Props } from "defuss";

// importing dequery with desktop management support
import { $, desktop, DesktopPanel } from "defuss-desktop";

import { Bootscreen } from "./Bootscreen.js";

export interface BootProcessProps extends Props {
  bootDelayMs?: number;
}

export function BootProcess({ bootDelayMs = 0 }: BootProcessProps) {
  // takes the forwarded ref from bootscreen
  const bootscreenRef = createRef<HTMLDivElement>();
  const desktopRef = createRef<HTMLDivElement>();

  $(() => {
    setTimeout(async () => {
      await $(bootscreenRef).replaceWith(<DesktopPanel ref={desktopRef} />);

      // initialize the desktop with the provided reference
      desktop.init(desktopRef.current, {
        icons: [],
        backgroundColor: "#000",
        backgroundImage: "/defuss_bliss_4k.webp",
      });
    }, bootDelayMs);
  });

  // render the Bootscreen component for boot delay ms
  return <Bootscreen bootDelayMs={bootDelayMs} ref={bootscreenRef} />;
}
