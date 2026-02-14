import { createRef, type Props } from "defuss";
import { Desktop } from "./desktop.js";
import {
  defaultDesktopOptions,
  desktopManager,
  type CreateDesktopOptions,
} from "../../desktop.js";
import { Taskbar } from "./taskbar.js";

export interface ShellProps extends Props<HTMLDivElement> {
  desktopConfig: CreateDesktopOptions;
}

// the shell manages the desktop rendering (panel, taskbar, etc.) and their initialization
export function Shell({
  ref = createRef(),
  desktopConfig = defaultDesktopOptions,
}: ShellProps) {
  const desktopRef = createRef<HTMLDivElement>();
  const taskbarRef = createRef<HTMLDivElement>();

  const onMount = () => {
    console.log("Shell mounted", ref!.current);
    console.log("Desktop mounted2", desktopRef.current);

    desktopManager.init(desktopRef.current!, desktopConfig);

    console.log("Taskbar mounted", taskbarRef.current);
  };

  return (
    <div ref={ref} onMount={onMount}>
      <Desktop ref={desktopRef} />
      <Taskbar ref={taskbarRef} />
    </div>
  );
}
