import { createRef, type Props, $ } from "defuss";
import { Button } from "./button.js";

export function Desktop({ ref }: Props) {
  $(() => {
    console.log("Desktop mounted");
  });

  return (
    <div class="defuss-desktop-panel crt" ref={ref}>
      <Button>Test</Button>
    </div>
  );
}
