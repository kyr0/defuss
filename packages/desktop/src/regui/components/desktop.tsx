import { createRef, type Props, $ } from "defuss";
import { Button } from "./button.js";
import { Window } from "./window.js";

export function Desktop({ ref }: Props) {
  $(() => {
    console.log("Desktop mounted");
  });

  const onOpenWindow = async () => {
    await $(ref).append(
      <Window width={300} height={200} title="Test Window">
        <p>Hello, world!</p>
        <section class="field-row" style="justify-content: flex-end">
          <button type="button">OK</button>
          <button type="button">Cancel</button>
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
