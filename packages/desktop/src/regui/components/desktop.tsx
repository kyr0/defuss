import { createRef, type Props, $ } from "defuss";
import { Button } from "./button.js";
import { Window, type WindowRefState } from "./window.js";

export function Desktop({ ref }: Props<HTMLDivElement>) {
  $(() => {
    console.log("Desktop mounted");
  });

  const onOpenWindow = async () => {
    const winRef = createRef<HTMLDivElement, WindowRefState>();

    await $(ref).append(
      <Window
        width={300}
        height={200}
        title="Test Window"
        ref={winRef}
        onClose={() => {
          console.log("I WAS CLOSED!");
        }}
        onMaximize={() => {
          console.log("I WAS MAXIMIZED!");
        }}
        onMinimize={() => {
          console.log("I WAS MINIMIZED!");
        }}
      >
        <p>Hello, world!</p>
        <section class="field-row" style="justify-content: space-between;">
          <button
            type="button"
            onClick={() => {
              console.log("Cancel clicked");
              winRef.state?.close();
            }}
          >
            Cancel
          </button>

          <Button onClick={onOpenWindow}>Open Window</Button>

          <button
            type="button"
            onClick={() => {
              console.log("OK clicked");
              winRef.state?.close();
            }}
          >
            OK
          </button>
        </section>
      </Window>,
    );
  };

  return (
    <div class="defuss-desktop-panel crt" ref={ref}>
      <Button onClick={onOpenWindow}>Open Window</Button>
    </div>
  );
}
