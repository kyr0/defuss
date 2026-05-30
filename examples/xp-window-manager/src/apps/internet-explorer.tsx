import { $, render } from "defuss";
import type { AppMainFn } from "../../../../packages/desktop/src/app.js";

const START_PAGE = "https://google2k.neoalpha.net/";

function InternetExplorerApp() {
  const onGo = (event: Event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const value = String($(form).form().url || START_PAGE);
    const frame = form.parentElement?.querySelector("iframe") as HTMLIFrameElement | null;
    if (!frame) return;
    frame.src = value;
  };

  return (
    <div class="defuss-ie">
      <div class="defuss-ie__toolbar">
        <form class="field-row" onSubmit={onGo}>
          <label for="defuss-ie-url">Address</label>
          <input id="defuss-ie-url" type="text" name="url" value={START_PAGE} />
          <button type="submit">Go</button>
        </form>
      </div>
      <iframe
        class="defuss-ie__frame"
        src={START_PAGE}
        title="Internet Explorer"
        sandbox="allow-scripts allow-same-origin allow-forms"
      ></iframe>
    </div>
  );
}

export const main: AppMainFn = async ({ container }) => {
  await render(<InternetExplorerApp />, container);
};
