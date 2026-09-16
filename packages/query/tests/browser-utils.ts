/**
 * Shared helpers for browser tests: the URL of the real morph engine bundle
 * (served by the defuss-query-serve-morph vitest plugin from the workspace
 * peer — not a mock or vendored snapshot) and a loader that evaluates an
 * artifact via fresh blob URLs (unique URL => re-evaluation per case, no
 * module-map caching).
 */

export const MORPH_ALL_MIN = "/__morph__/all.min.js";

export const loadScript = async (
  path: string,
  classic = false,
): Promise<void> => {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`fetch failed: ${path} (${res.status})`);
  const code = await res.text();
  const url = URL.createObjectURL(
    new Blob([code], { type: "text/javascript" }),
  );
  try {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      if (!classic) script.type = "module";
      script.src = url;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`script load failed: ${path}`));
      document.head.appendChild(script);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
};
