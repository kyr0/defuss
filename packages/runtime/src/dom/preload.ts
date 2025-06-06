export type PreloadAs =
  | "image"
  | "script"
  | "style"
  | "fetch"
  | "track"
  | "font";

export function preload(url: string | string[], as: PreloadAs = "image") {
  const urls = Array.isArray(url) ? url : [url];
  urls.forEach((u) => {
    const p = document.createElement("link");
    p.href = u;
    p.rel = "preload";
    p.as = as;
    document.head.appendChild(p);
  });
}
