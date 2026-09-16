import { beforeAll, beforeEach, describe, it } from "vitest";
import { MORPH_ALL_MIN, loadScript } from "./browser-utils";

/**
 * Full DOM regression suite, executed against each shipped browser artifact
 * (readable ESM, minified ESM, classic script) in real Chromium.
 *
 * Every case loads the real morph engine bundle plus the query artifact via
 * fresh blob URLs (unique URL => re-evaluation, no module-map caching), so
 * each case starts from a pristine df$ global.
 */

let df$: any;

const suite = () => {
  const eq = (actual: any, expected: any) => {
    if (!Object.is(actual, expected))
      throw Error(`Expected ${String(expected)}, received ${String(actual)}`);
  };
  const ok = (value: any, message = "Assertion failed") => {
    if (!value) throw Error(message);
  };
  const deep = (actual: any, expected: any) =>
    eq(JSON.stringify(actual), JSON.stringify(expected));
  const throws = (fn: () => void, pattern?: RegExp) => {
    try {
      fn();
    } catch (e) {
      if (pattern && !pattern.test(String(e))) throw e;
      return;
    }
    throw Error("Expected exception");
  };
  const fixture = (html: string): any => {
    document.body.innerHTML = html;
    return document.body.firstElementChild;
  };

  it("factory: native selector, context and static collection", () => {
    fixture(
      '<section><i class="x"></i><i class="x"></i></section><i class="x"></i>',
    );
    const q = df$(".x");
    eq(q.length, 3);
    eq(df$(".x", document.querySelector("section")).length, 2);
    eq(df$(document.querySelectorAll(".x")).length, 3);
    eq(df$(new Set(q)).length, 3);
    q[0].classList.remove("x");
    eq(q.length, 3);
    eq(df$(".x").length, 2);
  });
  it("factory: null, undefined, empty selector, nonmatching selector", () => {
    for (const x of [undefined, null, "", "#absent"]) eq(df$(x).length, 0);
  });
  it("factory: invalid native CSS is not silently swallowed", () =>
    throws(() => df$("["), /SyntaxError/));
  it("factory: node identity, duplicate suppression, array-like", () => {
    const el = fixture("<div></div>");
    eq(df$(el)[0], el);
    eq(df$([el, el]).length, 1);
    eq(df$({ 0: el, length: 1 })[0], el);
  });
  it("factory: multi-root markup including text", () => {
    const q = df$("  <b>A</b> / <i>B</i>");
    eq(q.length, 4);
    eq(q[1].localName, "b");
    eq(q[3].localName, "i");
    eq(q.text(), "  A / B");
  });
  it("factory: VNode with real state and ref", () => {
    const ref: any = {};
    const q = df$({
      type: "input",
      attributes: { value: "abc", checked: false, ref },
    });
    eq(ref.current, q[0]);
    eq(q.val(), "abc");
    eq(q.prop("checked"), false);
  });
  it("factory: DOM ready is asynchronous and once-only after ready", async () => {
    let count = 0;
    df$(() => count++);
    eq(count, 0);
    await Promise.resolve();
    eq(count, 1);
  });
  it("Array: map/slice/filter/find, negative eq, no stale indices", () => {
    fixture("<b>A</b><b>B</b>");
    const q = df$("b");
    deep(
      q.map((el: any) => el.textContent),
      ["A", "B"],
    );
    eq(q.map((x: any) => x).constructor, Array);
    eq(q.slice().constructor, Array);
    eq(
      q.find((el: any) => el.textContent === "B"),
      q[1],
    );
    const filtered = q.filter((el: any) => el.textContent === "A");
    eq(filtered.length, 1);
    eq(filtered[1], undefined);
    eq(q.length, 2);
    eq(q.first()[0], q[0]);
    eq(q.last()[0], q[1]);
    eq(q.eq(-2)[0], q[0]);
    eq(q.eq(3).length, 0);
    eq(q.get(-1), q[1]);
  });
  it("Array: each callback order, this and early exit", () => {
    fixture("<b>A</b><b>B</b>");
    const q = df$("b");
    const seen: number[] = [];
    eq(
      q.each(function (this: any, i: number, el: any) {
        eq(this, el);
        seen.push(i);
        return false;
      }),
      q,
    );
    deep(seen, [0]);
  });
  it("Array: filter/find retain native thisArg semantics", () => {
    fixture("<b>A</b><b>B</b>");
    const q = df$("b");
    const context = { wanted: q[1] };
    eq(
      q.filter(function (this: any, el: any) {
        return el === this.wanted;
      }, context)[0],
      q[1],
    );
    eq(
      q.find(function (this: any, el: any) {
        return el === this.wanted;
      }, context),
      q[1],
    );
  });
  it("traversal: find deduplicates overlapping contexts, does not mutate receiver", () => {
    fixture('<section><div><b class="x">A</b></div></section>');
    const roots = df$("section,div");
    eq(roots.find("b").length, 1);
    eq(roots.length, 2);
  });
  it("traversal: parent, children, closest, next and prev", () => {
    fixture("<section><b>A</b>text<i>B</i><b>C</b></section>");
    eq(df$("b").parent().length, 1);
    eq(df$("section").children().length, 3);
    eq(df$("section").children("b").length, 2);
    eq(df$("b").first().next()[0].localName, "i");
    eq(df$("b").last().prev()[0].localName, "i");
    eq(df$("b").closest("section").length, 1);
  });
  it("traversal: document, DocumentFragment and explicit ShadowRoot", () => {
    const host = fixture("<div></div>");
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = "<b>shadow</b>";
    eq(df$("b").length, 0);
    eq(df$("b", shadow).text(), "shadow");
    eq(df$(shadow).find("b").length, 1);
    eq(df$(document).find("div").length, 1);
    const fragment = document.createDocumentFragment();
    fragment.append(document.createElement("span"));
    eq(df$(fragment).children().length, 1);
    eq(df$(fragment).find("span").length, 1);
  });
  it("attrs: getters, all-element setters, null deletion and native booleans", () => {
    fixture("<b></b><b></b>");
    const q = df$("b");
    eq(q.attr("missing"), null);
    eq(q.attr("title", "x"), q);
    eq(q[1].getAttribute("title"), "x");
    q.attr("title", null);
    eq(q.attr("title"), null);
    q.attr("data-flag", false);
    eq(q.attr("data-flag"), "false");
  });
  it("props: live properties, explicit undefined and blocked structural bypass", () => {
    fixture('<input type="checkbox">');
    const q = df$("input");
    q.prop("checked", true);
    eq(q.prop("checked"), true);
    q.prop("custom", undefined);
    eq(q.prop("custom"), undefined);
    throws(() => q.prop("innerHTML", "<b>x</b>"), /structural/);
  });
  it("classes: tokenization, toggle force and existential hasClass", () => {
    fixture('<b class="a"></b><b></b>');
    const q = df$("b");
    eq(q.hasClass("a"), true);
    q.addClass(["one two", "three"]);
    for (const el of q) ok(el.classList.contains("two"));
    q.toggleClass("one two", false);
    eq(q.hasClass("one"), false);
    q.toggleClass("three");
    eq(q.hasClass("three"), false);
    q.removeClass();
    eq(q.attr("class"), null);
    eq(df$(".absent").hasClass("x"), false);
  });
  it("data: DOMStringMap strings and deletion, no JSON coercion", () => {
    fixture('<b data-user-id="7"></b>');
    const q = df$("b");
    eq(q.data("userId"), "7");
    q.data("enabled", true);
    eq(q[0].dataset.enabled, "true");
    q.data("enabled", null);
    eq(q.data("enabled"), undefined);
    eq(q.data("toString"), undefined);
  });
  it("css: property maps, custom property case and fresh computed reads", () => {
    fixture("<style>.changed { color: rgb(0, 128, 0); }</style><b>A</b>");
    const q = df$("b");
    q.css({ backgroundColor: "rgb(255, 0, 0)", "--CaseSensitive": "9" });
    eq(q.css("--CaseSensitive"), "9");
    eq(q.css("background-color"), "rgb(255, 0, 0)");
    q.css("color", "rgb(0, 0, 255)");
    eq(q.css("color"), "rgb(0, 0, 255)");
    q.css("color", null).addClass("changed");
    eq(q.css("color"), "rgb(0, 128, 0)");
  });
  it("empty getters and mutators have documented defaults", () => {
    const q = df$("#absent");
    eq(q.attr("x"), undefined);
    eq(q.css("x"), undefined);
    eq(q.html(), undefined);
    eq(q.val(), undefined);
    eq(q.text(), "");
    eq(q.is("b"), false);
    eq(q.html("x").text("x").empty().remove(), q);
  });
  it("val: checkbox value is not checkbox state; no synthetic change", () => {
    fixture('<input type="checkbox" value="yes">');
    const q = df$("input");
    let events = 0;
    q.on("change", () => events++);
    eq(q.val(), "yes");
    q.prop("checked", true);
    q.val("accepted");
    eq(q.val(), "accepted");
    eq(events, 0);
  });
  it("val: input number, textarea and null clearing", () => {
    fixture("<input><textarea></textarea>");
    const q = df$("input,textarea");
    q.val(12);
    deep(
      q.map((el: any) => el.value),
      ["12", "12"],
    );
    q.val(null);
    eq(q.val(), "");
  });
  it("val: multi-select and checkbox/radio arrays", () => {
    fixture(
      '<select multiple><option value="a">A</option><option value="b">B</option></select><input type="checkbox" value="a"><input type="checkbox" value="b">',
    );
    df$("select").val(["a", "b"]);
    deep(df$("select").val(), ["a", "b"]);
    df$("select").val([]);
    deep(df$("select").val(), []);
    df$("input").val(["b"]);
    eq(df$("input").first().prop("checked"), false);
    eq(df$("input").last().prop("checked"), true);
  });
  it("forms: duplicate fields, successful controls, associated external field and submitter", () => {
    fixture(
      '<form id="f"><input name="x" value="one"><input name="x" value="two"><input name="bad" value="omit" disabled><input type="checkbox" name="unchecked"><input type="checkbox" name="checked" value="on" checked><button name="action" value="save">Save</button></form><input form="f" name="external" value="yes">',
    );
    const q = df$("form");
    const fd = q.form(document.querySelector("button"));
    ok(fd instanceof FormData);
    deep(fd.getAll("x"), ["one", "two"]);
    eq(fd.has("bad"), false);
    eq(fd.has("unchecked"), false);
    eq(fd.get("checked"), "on");
    eq(fd.get("external"), "yes");
    eq(fd.get("action"), "save");
    eq(q.form().has("action"), false);
  });
  it("forms: files remain Files; serialize skips files and retains duplicate names", () => {
    fixture(
      '<form><input name="x" value="a b"><input name="x" value="c"><input type="file" name="file"></form>',
    );
    const transfer = new DataTransfer();
    transfer.items.add(
      new File(["content"], "demo.txt", { type: "text/plain" }),
    );
    (document.querySelector("[type=file]") as any).files = transfer.files;
    const fd = df$("form").form();
    eq(fd.get("file").name, "demo.txt");
    eq(df$("form").serialize(), "x=a+b&x=c");
  });
  it("forms: ambiguous collection and invalid submitter fail", () => {
    fixture("<form></form><form></form><button>outside</button>");
    throws(() => df$("form").form(), /exactly one/);
    throws(() => df$("button").form(), /exactly one/);
    throws(
      () => df$("form").first().form(document.querySelector("button")),
      /NotFoundError/,
    );
  });
  it("forms: native formdata event modifications are retained", () => {
    fixture('<form><input name="x" value="1"></form>');
    document
      .querySelector("form")!
      .addEventListener("formdata", (e: any) =>
        e.formData.append("added", "yes"),
      );
    eq(df$("form").form().get("added"), "yes");
  });
  it("morph: keyed reorder preserves nodes, focus, selection and live values", () => {
    fixture('<div id="root"><input key="a"><span key="b">B</span></div>');
    const input = document.querySelector("input") as any;
    input.value = "user input";
    input.focus();
    input.setSelectionRange(2, 5);
    const span = document.querySelector("span");
    df$("#root").html('<span key="b">updated</span><input key="a">');
    eq(document.querySelector("input"), input);
    eq(document.querySelector("span"), span);
    eq(input.value, "user input");
    eq(document.activeElement, input);
    eq(input.selectionStart, 2);
    eq(input.selectionEnd, 5);
  });
  it("morph: explicit VNode controlled false and empty string", () => {
    fixture(
      '<div id="root"><input id="i" type="checkbox" checked value="yes"></div>',
    );
    df$("#root").morph({
      type: "input",
      attributes: { id: "i", type: "checkbox", checked: false, value: "" },
    });
    eq(df$("input").prop("checked"), false);
    eq(df$("input").val(), "");
  });
  it("morph: native and delegated events survive HTML updates", () => {
    fixture('<div id="root"><button key="b">Before</button></div>');
    const button = document.querySelector("button")!;
    let direct = 0,
      delegated = 0;
    button.addEventListener("click", () => direct++);
    df$(button).on("click", () => delegated++);
    df$("#root").html('<button key="b" class="new">After</button>');
    button.click();
    eq(direct, 1);
    eq(delegated, 1);
    eq(document.querySelector("button"), button);
  });
  it("morph: diff merges addressed attributes and preserves unmentioned siblings", () => {
    fixture('<ul><li key="a" data-extra="yes">A</li><li key="b">B</li></ul>');
    const a = df$("li")[0],
      b = df$("li")[1];
    df$("ul").morph('<li key="a">Updated</li><li key="c">C</li>', {
      diff: true,
    });
    eq(df$("li")[0], a);
    eq(df$("li")[1], b);
    eq(a.dataset.extra, "yes");
    eq(df$("li").length, 3);
  });
  it("morph: html() accepts options, including transitions", async () => {
    fixture("<div>Old</div>");
    const q = df$("div");
    const promise = q.html("<b>New</b>", {
      transition: { type: "fade", duration: 2, target: "self" },
    });
    ok(promise instanceof Promise);
    eq(await promise, q);
    eq(q.text(), "New");
    q.html('<li key="a">A</li><li key="b">B</li>');
    const a = q.children().first()[0];
    q.html('<li key="a">A2</li>', { diff: true });
    eq(q.children().first()[0], a);
    eq(a.textContent, "A2");
    eq(q.children().length, 2);
  });
  it("morph: malformed diff is rejected by the engine", () => {
    fixture("<div></div>");
    throws(
      () => df$("div").morph("<b>Unaddressed</b>", { diff: true }),
      /key or id/,
    );
  });
  it("morph: DOM nodes are snapshots, not destructive moves", () => {
    fixture('<div id="source"><b>Copied</b></div><section></section>');
    const source = df$("b")[0];
    df$("section").morph(source);
    eq(source.parentElement.id, "source");
    eq(df$("section").text(), "Copied");
    ok(df$("section b")[0] !== source);
  });
  it("morph: synchronous chaining and literal text are safe from markup interpretation", () => {
    fixture("<div></div>");
    const q = df$("div");
    eq(q.html("<b>x</b>").find("b").text(), "x");
    q.text('<img src=x onerror="globalThis.injected=true">');
    eq(q.children().length, 0);
    ok(q.text().startsWith("<img"));
    eq((globalThis as any).injected, undefined);
    q.text(0);
    eq(q.text(), "0");
    q.text(null);
    eq(q.text(), "");
  });
  it("morph: text getter combines the collection; no thenable", () => {
    fixture("<b>A</b><b>B</b>");
    const q = df$("b");
    eq(q.text(), "AB");
    eq(q.then, undefined);
    eq(q.morph("x"), q);
    eq(q.text(), "xx");
  });
  it("morph: empty cleans delegated handlers of removed descendants", () => {
    fixture("<div><button>A</button></div>");
    const button = df$("button")[0];
    df$(button).on("click", () => {});
    ok(df$.getRegisteredEventTypes(button).size);
    df$("div").empty();
    eq(df$.getRegisteredEventTypes(button).size, 0);
    eq(button.isConnected, false);
  });
  it("morph: transitions have explicit Promise<this> completion", async () => {
    fixture("<div>Old</div>");
    const q = df$("div");
    const promise = q.morph("<b>New</b>", {
      transition: { type: "slide-left", duration: 2, target: "self" },
    });
    ok(promise instanceof Promise);
    eq(await promise, q);
    eq(q.text(), "New");
    q.addClass("done");
    eq(q.hasClass("done"), true);
  });
  it("morph: transition none and empty selections still return promises", async () => {
    fixture("<div></div>");
    const q = df$("div");
    ok(q.morph("x", { transition: { type: "none" } }) instanceof Promise);
    eq(
      await df$("absent")
        .morph("x", { transition: { type: "fade" } })
        .then((x: any) => x.length),
      0,
    );
  });
  it("morph: latest sync update wins over an in-flight transition", async () => {
    fixture("<div>Start</div>");
    const q = df$("div");
    const pending = q.morph("stale", {
      transition: { type: "slide-right", duration: 3, target: "self" },
    });
    q.html("latest");
    await pending;
    eq(q.text(), "latest");
  });
  it("morph: transition errors are Promise rejections, not dropped errors", async () => {
    fixture("<div></div>");
    let rejected = false;
    try {
      await df$("div").morph("<b>bad</b>", {
        diff: true,
        transition: { type: "none" },
      });
    } catch {
      rejected = true;
    }
    ok(rejected);
  });
  it("structural: append/prepend preserve source order and existing state", () => {
    fixture('<div><input value="original"></div>');
    const q = df$("div");
    const input = df$("input")[0];
    input.value = "user";
    q.append("<b>A</b><i>B</i>").prepend("<em>C</em><strong>D</strong>");
    deep(
      q.children().map((el: any) => el.localName),
      ["em", "strong", "input", "b", "i"],
    );
    eq(df$("input")[0], input);
    eq(input.value, "user");
  });
  it("structural: before/after preserve source order", () => {
    fixture("<div><b>B</b></div>");
    df$("b").before("<i>1</i><i>2</i>").after("<em>3</em><em>4</em>");
    eq(df$("div").text(), "12B34");
  });
  it("structural: native node moves to last target; earlier targets receive clones", () => {
    fixture(
      '<div class="target"></div><div class="target"></div><button id="move">M</button>',
    );
    const source = df$("button")[0];
    df$(".target").append(source);
    const copies = df$(".target button");
    eq(copies.length, 2);
    ok(copies[0] !== source);
    eq(copies[1], source);
  });
  it("structural: live NodeList is snapshotted before moves", () => {
    fixture("<section><b>A</b><i>B</i></section><div></div>");
    const source = document.querySelector("section")!;
    df$("div").append(source.childNodes);
    eq(source.childNodes.length, 0);
    eq(df$("div").text(), "AB");
  });
  it("structural: DocumentFragment copies are not consumed prematurely", () => {
    fixture("<div></div><div></div>");
    const fragment = document.createDocumentFragment();
    fragment.append(
      document.createElement("b"),
      document.createTextNode("tail"),
    );
    const original = fragment.firstChild;
    df$("div").append(fragment);
    eq(df$("div b").length, 2);
    eq(df$("div b").last()[0], original);
    eq(fragment.childNodes.length, 0);
  });
  it("structural: VNode handlers work on every multi-target insertion", () => {
    fixture("<div></div><div></div>");
    let count = 0;
    df$("div").append({
      type: "button",
      attributes: { onClick: () => count++ },
      children: ["click"],
    });
    for (const b of df$("button")) b.click();
    eq(count, 2);
  });
  it("structural: appendTo returns inserted nodes and moves the original for one target", () => {
    fixture("<div></div>");
    const q = df$("<button>Save</button>");
    const inserted = q.appendTo("div");
    eq(inserted[0], q[0]);
    eq(q[0].parentElement, df$("div")[0]);
  });
  it("structural: appendTo multi-target returns clones plus original", () => {
    fixture("<div></div><div></div>");
    const q = df$("<b>X</b>");
    const inserted = q.appendTo("div");
    eq(inserted.length, 2);
    eq(inserted[1], q[0]);
  });
  it("structural: replacing and removing use upstream cleanup", () => {
    fixture("<div><b>B</b><i>I</i></div>");
    const old = df$("b");
    old.on("click", () => {});
    eq(old.replaceWith("<strong>S</strong><em>E</em>"), old);
    eq(old[0].isConnected, false);
    eq(df$.getRegisteredEventTypes(old[0]).size, 0);
    eq(df$("div").text(), "SEI");
    df$("i").remove();
    eq(df$("div").text(), "SE");
  });
  it("structural: detached before/after/replace are harmless; remove retains membership", () => {
    const q = df$("<b>X</b>");
    eq(q.before("<i/>").after("<i/>").replaceWith("<i/>").remove(), q);
    eq(q[0].localName, "b");
  });
  it("structural: cycles fail without modifying the destination", () => {
    fixture("<section><div><b>B</b></div></section>");
    const parent = df$("section")[0];
    const target = df$("div")[0];
    throws(() => df$(target).append(parent), /HierarchyRequestError/);
    eq(target.firstElementChild.localName, "b");
    eq(parent.parentNode, document.body);
  });
  it("structural: self replacement is a no-op, mixed self replacement rejected", () => {
    const b = fixture("<b>X</b>");
    df$(b).replaceWith(b);
    eq(document.body.firstChild, b);
    throws(
      () => df$(b).replaceWith([b, document.createElement("i")]),
      /only that target/,
    );
  });
  it("HTML parser: context-dependent table rows and cells", () => {
    fixture("<table><tbody></tbody></table>");
    df$("tbody").append("<tr><td>A</td><td>B</td></tr>");
    eq(df$("tr").length, 1);
    eq(df$("td").length, 2);
    df$("tr").html("<td>C</td><td>D</td>");
    eq(df$("td").text(), "CD");
    eq(df$("<td>X</td>")[0].localName, "td");
  });
  it("HTML parser: option/optgroup and col wrappers", () => {
    fixture("<select></select><table><colgroup></colgroup></table>");
    df$("select").append('<option value="a">A</option>');
    eq(df$("select").val(), "a");
    df$("colgroup").append("<col>");
    eq(df$("col").length, 1);
  });
  it("SVG construction uses morph renderer namespaces", () => {
    fixture("<div></div>");
    df$("div").append(
      '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="5"></circle></svg>',
    );
    eq(df$("svg")[0].namespaceURI, "http://www.w3.org/2000/svg");
    eq(df$("circle")[0].namespaceURI, "http://www.w3.org/2000/svg");
    df$("svg").append({ type: "circle", attributes: { r: 2 } });
    eq(df$("circle").last()[0].namespaceURI, "http://www.w3.org/2000/svg");
  });
  it("events: multi handlers, same-handler dedup, this and off", () => {
    fixture("<button>B</button>");
    const q = df$("button");
    let total = 0;
    const a = function (this: any, e: any) {
      eq(this, q[0]);
      eq(e.target, q[0]);
      total++;
    };
    const b = () => (total += 10);
    q.on("click", a).on("click", a).on("click", b).trigger("click");
    eq(total, 11);
    q.off("click", a).trigger("click");
    eq(total, 21);
    q.off("click").trigger("click");
    eq(total, 21);
  });
  it("events: whitespace-separated types and clear all", () => {
    fixture("<button>B</button>");
    let count = 0;
    const q = df$("button");
    q.on("one two", () => count++)
      .trigger("one")
      .trigger("two");
    eq(count, 2);
    q.off().trigger("one");
    eq(count, 2);
  });
  it("events: native custom detail and cancellation", () => {
    fixture("<button>B</button>");
    let detail: any;
    df$("button")
      .on("custom", (e: any) => {
        detail = e.detail;
        e.preventDefault();
      })
      .trigger("custom", { n: 3 });
    deep(detail, { n: 3 });
  });
  it("events: capture phase and explicit unsupported options", () => {
    fixture("<div><button>B</button></div>");
    const seen: string[] = [];
    df$("div").on("click", () => seen.push("capture"), { capture: true });
    df$("button").on("click", () => seen.push("button"));
    df$("button").trigger("click");
    deep(seen, ["capture", "button"]);
    throws(
      () => df$("button").on("click", () => {}, { once: true }),
      /capture only/,
    );
  });
  it("events: Document and Window use native listeners, removable without handler", () => {
    let a = 0,
      b = 0;
    df$(document).on("doc-test", () => a++);
    df$(window).on("win-test", () => b++);
    df$(document).trigger("doc-test");
    df$(window).trigger("win-test");
    eq(a, 1);
    eq(b, 1);
    df$(document).off("doc-test").trigger("doc-test");
    df$(window).off().trigger("win-test");
    eq(a, 1);
    eq(b, 1);
  });
  it("events: detached delegated handlers work after insertion", () => {
    fixture("<div></div>");
    let count = 0;
    df$("<button>B</button>")
      .on("click", () => count++)
      .appendTo("div")
      .trigger("click");
    eq(count, 1);
  });
  it("events: moved handlers re-arm a new ShadowRoot without a second registry", () => {
    fixture('<div id="host"></div><button>B</button>');
    const shadow = df$("#host")[0].attachShadow({ mode: "open" });
    let count = 0;
    const button = df$("button");
    button.on("custom", () => count++);
    df$(shadow).append(button);
    button.trigger("custom");
    eq(count, 1);
  });
  it("cross-document: querying, creation, FormData and moving event handlers", () => {
    const frame = fixture("<iframe></iframe>");
    const doc = frame.contentDocument;
    doc.body.innerHTML =
      '<form><input name="x" value="iframe"></form><section></section>';
    eq(df$("input", doc).val(), "iframe");
    ok(df$("form", doc).form() instanceof frame.contentWindow.FormData);
    const created = df$("<b>B</b>", doc);
    eq(created[0].ownerDocument, doc);
    let count = 0;
    const moved = df$("<button>M</button>").on("custom", () => count++);
    df$("section", doc).append(moved);
    moved.trigger("custom");
    eq(count, 1);
    eq(moved[0].ownerDocument, doc);
  });
  it("lifecycle: root onMount is not lost by detached VNode construction", async () => {
    fixture("<div></div>");
    let count = 0;
    const q = df$({
      type: "button",
      attributes: { onMount: () => count++ },
      children: ["B"],
    });
    q.appendTo("div");
    await Promise.resolve();
    eq(count, 1);
  });
  it("read isolation: append never serializes/reconciles existing siblings", () => {
    fixture("<div><input></div>");
    const input = df$("input")[0];
    input.value = "do not touch";
    Object.defineProperty(input, "outerHTML", {
      get() {
        throw Error("serialized sibling");
      },
    });
    df$("div").append("<b>new</b>");
    eq(input.value, "do not touch");
    eq(df$("input")[0], input);
  });
  it("text: native Text targets are literal and remain identical", () => {
    const root = fixture("<div>A</div>");
    const node = root.firstChild;
    df$(node).text("<unsafe>");
    eq(root.firstChild, node);
    eq(root.textContent, "<unsafe>");
    eq(root.children.length, 0);
  });
  it("cross-document: appendTo selector resolves the source owner document", () => {
    const frame = fixture("<iframe></iframe>");
    const doc = frame.contentDocument;
    doc.body.innerHTML = "<section></section>";
    const q = df$("<b>local</b>", doc);
    q.appendTo("section");
    eq(doc.querySelector("b"), q[0]);
    eq(q[0].ownerDocument, doc);
  });
  it("shadow: insert and morph share ordinary-host shadow targeting", () => {
    const host = fixture("<div></div>");
    const shadow = host.attachShadow({ mode: "open" });
    df$(host).append("<b>A</b>").prepend("<i>B</i>");
    eq(host.children.length, 0);
    eq(shadow.textContent, "BA");
    df$(host).html("<u>C</u>");
    eq(shadow.textContent, "C");
  });
  it("collection: toArray returns a plain copy", () => {
    fixture("<b>A</b><b>B</b>");
    const q = df$("b");
    const copy = q.toArray();
    eq(copy.constructor, Array);
    eq(copy.length, 2);
    eq(copy[0], q[0]);
    copy.push(document.createElement("b"));
    eq(q.length, 2);
  });
  it("traversal: is() ignores non-element targets", () => {
    const el = fixture("<div></div>");
    eq(df$(document).is("div"), false);
    eq(df$([document, el]).is("div"), true);
  });
  it("factory: invalid inputs fail clearly", () => {
    throws(() => df$([{}]), /EventTargets/);
    throws(() => df$({ wrong: true }), /expected/);
  });
  it("factory: markup in a document without defaultView fails clearly", () => {
    const doc = document.implementation.createHTMLDocument();
    throws(() => df$("<b>x</b>", doc), /DOMParser/);
  });
  it("forms: a document without FormData fails clearly", () => {
    const doc = document.implementation.createHTMLDocument();
    throws(() => df$(doc.createElement("form")).form(), /FormData/);
  });
  it("events: on() requires a function handler", () => {
    fixture("<button>B</button>");
    throws(() => df$("button").on("click", null), /requires a function/);
  });
  it("events: identical native registrations dedupe; off keeps non-matching entries", () => {
    let count = 0;
    const handler = () => count++;
    df$(document).on("dedupe-test", handler).on("dedupe-test", handler);
    df$(document).on("keep-test", () => {});
    df$(document).trigger("dedupe-test");
    eq(count, 1);
    df$(document).off("dedupe-test", handler).trigger("dedupe-test");
    eq(count, 1);
    df$(document).off("keep-test");
  });
  it("morph: DocumentFragment content is snapshotted per child", () => {
    fixture("<div></div>");
    const fragment = document.createDocumentFragment();
    const b = document.createElement("b");
    b.textContent = "A";
    const i = document.createElement("i");
    i.textContent = "B";
    fragment.append(b, i);
    df$("div").morph(fragment);
    eq(df$("div").text(), "AB");
    ok(df$("div b")[0] !== b);
  });
};

for (const artifact of ["all.js", "all.min.js", "global.min.js"]) {
  describe(`browser artifact: dist/${artifact}`, () => {
    beforeEach(async () => {
      delete (window as any).df$;
      document.body.innerHTML = "";
      await loadScript(MORPH_ALL_MIN);
      await loadScript(`/dist/${artifact}`, artifact === "global.min.js");
      df$ = (window as any).df$;
    });
    suite();
  });
}

// The same suite against the source modules: /src/all.ts is compiled and
// instrumented by the dev server, so these runs produce the src/*.ts
// coverage. Imported once per file (module side effects are cached), state
// is reset between cases via the DOM and the engine's own cleanup.
describe("source modules (src/all.ts, coverage-instrumented)", () => {
  beforeAll(async () => {
    delete (window as any).df$;
    await loadScript(MORPH_ALL_MIN);
    const srcUrl: string = "/src/all.ts";
    await import(/* @vite-ignore */ srcUrl);
    df$ = (window as any).df$;
  });
  beforeEach(() => {
    document.body.innerHTML = "";
  });
  suite();
});
