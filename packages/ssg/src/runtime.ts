import { $ } from "defuss";
import { hydrate } from "defuss/client"; // CSR package with hydration support

export async function hydrateIslands() {
  const nodes = $<HTMLDivElement>("[data-hydrate]");
  await Promise.all(
    Array.from(nodes).map(async (el) => {
      const modPath = el.dataset.module!;
      const exportKey = el.dataset.export || "default";
      const propsId = el.dataset.propsId!;
      const props = JSON.parse(
        document.getElementById(propsId)!.textContent || "{}",
      );

      const mod = await import(/* @vite-ignore */ modPath);
      const Cmp = mod[exportKey];

      // Hydrate into the *previousElementSibling* which contains the SSR’d children
      // (the wrapper renders children before the marker).
      const target = el.previousElementSibling as Element;

      hydrate;
      /*
      // If your runtime exposes hydrate, prefer it; else use render.
      hydrate
        ? hydrate(h(Cmp, props), target)
        : (await import("defuss/dom")).render(h(Cmp, props), target);
      */
    }),
  );
}

//hydrateIslands();
