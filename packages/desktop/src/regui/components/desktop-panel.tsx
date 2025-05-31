import { createRef, type Props, $ } from "defuss";
import { Button } from "./button.js";

export function DesktopPanel({ ref }: Props) {
  $(() => {
    console.log("DesktopPanel mounted");
  });

  return (
    <div class="defuss-desktop-panel" ref={ref}>
      <Button>Test</Button>
    </div>
  );
}
