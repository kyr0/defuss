import "./BootProcess.scss";

import type { Props } from "defuss";
import { LogonScreen } from "defuss-desktop";

export interface LogonState {
  username?: string;
}

export const preloadLogonImagePaths = [
  "/defuss_xp_logo.webp",
  "/icons/profile_picture_chess.webp",
  "/icons/profile_picture_duck.webp",
];

export interface LogonManagerProps extends Props {
  showGuestUser?: boolean;
  onLogon?: () => void;
}

export function LogonManager({
  showGuestUser = true,
  onLogon,
  ref,
}: LogonManagerProps) {
  return (
    <LogonScreen
      ref={ref}
      showGuestUser={showGuestUser}
      onTurnOffComputer={() => {
        document.location.reload(); // Simulate turning off by reloading
      }}
      onGuestLogon={() => {
        ref.updateState({
          username: "Guest",
        });
        onLogon?.();
      }}
      onUserLogonSubmit={(username: string) => {
        ref.updateState({
          username,
        });
        onLogon?.();
        return Promise.resolve(true); // Simulate successful login
      }}
    />
  );
}
