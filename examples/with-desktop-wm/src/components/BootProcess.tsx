import "./BootProcess.scss";
import { createRef, type Props } from "defuss";
import {
  $,
  defaultSystemSoundFilePaths,
  Shell,
  soundManager,
} from "defuss-desktop"; // $ from defuss-desktop is extended with window management capabilities
import { Bootscreen } from "./Bootscreen.js";
import {
  LogonManager,
  preloadLogonImagePaths,
  type LogonState,
} from "./LogonManager.js";
import { preload } from "defuss-runtime";

export interface BootProcessProps extends Props {
  bootDelayMs?: number;
}

// TODO: replace by desktop state management
const defaultBackgroundImagePath = "/defuss_bliss_4k.webp";

export function BootProcess({ bootDelayMs = 0 }: BootProcessProps) {
  // takes the forwarded ref from bootscreen
  const screenRef = createRef<HTMLDivElement>();
  const bootScreenRef = createRef<HTMLDivElement>();
  const logonManagerRef = createRef<HTMLDivElement, LogonState>();
  const shellRef = createRef<HTMLDivElement>();

  const onStartComputerClick = async () => {
    // 1. render the Bootscreen component
    await $(screenRef).replaceWith(<Bootscreen ref={bootScreenRef} />);

    // setup audio context
    await soundManager.init();

    // preload images for logon screen, desktop etc.
    preload(defaultBackgroundImagePath);
    preload(preloadLogonImagePaths);

    // preload all system sounds
    soundManager.preload(defaultSystemSoundFilePaths);

    setTimeout(async () => {
      // 2. replace the Bootscreen with LogonManager after boot animation delay
      await $(bootScreenRef).replaceWith(
        <LogonManager
          onLogon={onLogon}
          ref={logonManagerRef}
          showGuestUser={true}
        />,
      );
    }, bootDelayMs);
  };

  const onLogon = async () => {
    // play startup sound
    soundManager.play("/sounds/startup.ogg");

    // 3. render the Shell component after logon
    await $(logonManagerRef).replaceWith(
      <Shell
        ref={shellRef}
        desktopConfig={{
          icons: [],
          backgroundColor: "#000",
          backgroundImage: defaultBackgroundImagePath,
        }}
      />,
    );
  };

  // 1. render the Bootscreen component for boot delay ms
  return (
    <div class="bootscreen crt" ref={screenRef}>
      <button type="button" onClick={onStartComputerClick}>
        Boot
      </button>
    </div>
  );
}
