import df$, {
  type DfQuery,
  type MorphOptions,
  createDf$,
} from "../dist/index.js";
import * as morph from "defuss-morph";
const inputs: DfQuery<HTMLInputElement> = df$("input");
const input: HTMLInputElement | undefined = inputs.get(0);
const raw: HTMLInputElement[] = inputs.map((x) => x);
const sliced: HTMLInputElement[] = inputs.slice();
const found: HTMLInputElement | undefined = inputs.find((x) => x.checked);
const descendants: DfQuery<HTMLButtonElement> = df$("form").find("button");
const selected: DfQuery<HTMLInputElement> = inputs.filter(":checked");
const nodes: DfQuery<Node> = df$("<b>Text</b>");
const doc: DfQuery<Document> = df$(document);
const win: DfQuery<Window> = df$(window);
const state: boolean | undefined = inputs.prop("checked");
inputs.prop("checked", true);
inputs.on("input", function (event) {
  const self: HTMLInputElement = this;
  const native: Event = event;
  void [self, native];
});
inputs.on("click", function (event) {
  const mouse: MouseEvent = event;
  void mouse;
});
win.on("resize", (event) => {
  const native: UIEvent = event;
  void native;
});
const sync: DfQuery<HTMLInputElement> = inputs.morph("<b>x</b>");
const asyncResult: Promise<DfQuery<HTMLInputElement>> = inputs.morph("next", {
  transition: { type: "fade" },
});
const options: MorphOptions = { diff: true };
const maybe: DfQuery<HTMLInputElement> | Promise<DfQuery<HTMLInputElement>> =
  inputs.morph("next", options);
const syncHtml: DfQuery<HTMLInputElement> = inputs.html("<b>x</b>");
const asyncHtml: Promise<DfQuery<HTMLInputElement>> = inputs.html("next", {
  transition: { type: "fade" },
});
const maybeHtml: DfQuery<HTMLInputElement> | Promise<DfQuery<HTMLInputElement>> =
  inputs.html("next", options);
df$.morph(document.body, "x");
df$.queueCallback(() => {})();
const factory = createDf$(morph);
factory("button").prop("disabled", true);
// @ts-expect-error checked is a boolean, not a string
inputs.prop("checked", "yes");
// @ts-expect-error this is a native value, not checkbox state
inputs.val(true);
// @ts-expect-error unsupported delegated options are not falsely advertised
inputs.on("click", () => {}, { once: true });
// @ts-expect-error async morph is not chainable until awaited
inputs.morph("x", { transition: { type: "fade" } }).addClass("ready");
// @ts-expect-error async html is not chainable until awaited
inputs.html("x", { transition: { type: "fade" } }).addClass("ready");
// @ts-expect-error map returns an ordinary array
inputs.map((x) => x).addClass("x");
void [
  input,
  raw,
  sliced,
  found,
  descendants,
  selected,
  nodes,
  doc,
  state,
  sync,
  asyncResult,
  maybe,
  syncHtml,
  asyncHtml,
  maybeHtml,
];
