import { render } from "defuss";
import type { AppMainFn } from "../../../../packages/desktop/src/app.js";

function NotepadApp() {
  return (
    <div class="defuss-notepad">
      <div class="defuss-notepad__menubar">
        <button type="button">File</button>
        <button type="button">Edit</button>
        <button type="button">Format</button>
        <button type="button">View</button>
        <button type="button">Help</button>
      </div>
      <textarea class="defuss-notepad__editor" spellcheck={false}></textarea>
    </div>
  );
}

export const main: AppMainFn = async ({ container }) => {
  await render(<NotepadApp />, container);
};
