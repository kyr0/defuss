import { hydrate } from "defuss/client"; // CSR package with hydration support

export const LiveReloadUrl = `${document.location.origin
  .replace(/https/, "wss")
  .replace(/http/, "ws")}/livereload`;

export const setupLiveReload = () => {
  console.log(`[live-reload] trying to (re-)connect to: ${LiveReloadUrl}...`);
  const liveReloadSocket = new WebSocket(LiveReloadUrl);
  liveReloadSocket.onmessage = (event) => {
    console.log("[live-reload] message received", event);
    const eventData = JSON.parse(event.data);
    if (eventData.command === "reload") {
      const path = eventData.path || "/";

      let pathMatch = location.pathname === path;
      console.log(
        "live-reload location.pathname",
        location.pathname,
        "vs",
        path,
      );
      if (
        location.pathname.endsWith("/") &&
        (eventData.path === "/index.html" || eventData.path === "/index")
      ) {
        pathMatch = true;
      }
      if (!eventData.path || pathMatch) {
        document.location.reload(); // TODO: no hard reload, but fetch and replace content with transitions, keeping scroll position, etc.
      }
    }
  };
  liveReloadSocket.onclose = () => {
    setTimeout(setupLiveReload, 5000);
  };
};

// automatically setup live-reload in dev mode
setupLiveReload();

export { hydrate };
