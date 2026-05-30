import { $, createRef } from "defuss";
import { windowManager } from "../../window.js";
import { StartButton } from "./start-button.js";

export const Taskbar = () => {
  const taskbarListRef = createRef<HTMLUListElement>();
  const clockRef = createRef<HTMLSpanElement>();

  const renderTasks = async () => {
    const windows = [...windowManager.windows];
    const activeWindow = windowManager.getActiveWindow();

    await $(taskbarListRef).update(
      <>
        {windows.map((win) => (
          <li key={win.id} class={activeWindow?.id === win.id && !win.minimized ? "active" : ""}>
            <button
              type="button"
              class="taskbar__task-btn"
              onClick={() => {
                const current = windowManager.getWindow(win.id);
                if (!current) return;

                if (current.minimized) {
                  windowManager.restoreWindow(current.id);
                  return;
                }

                const active = windowManager.getActiveWindow();
                if (active?.id === current.id) {
                  windowManager.minimizeWindow(current.id);
                  return;
                }

                windowManager.setActiveWindow(current.id);
              }}
            >
              <div class="cell">
                {win.icon ? <img src={win.icon} alt="" /> : null}
                <span class="cell-name">{win.title}</span>
              </div>
            </button>
          </li>
        ))}
      </>,
    );
  };

  const renderClock = () => {
    const now = new Date();
    const value = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    $(clockRef).text(value);
  };

  const onMount = () => {
    void renderTasks();
    renderClock();

    const unsubscribe = windowManager.subscribe(() => {
      void renderTasks();
    });

    const interval = setInterval(renderClock, 30_000);
    (clockRef as any).state = { unsubscribe, interval };
  };

  const onUnmount = () => {
    const state = (clockRef as any).state;
    state?.unsubscribe?.();
    if (state?.interval) clearInterval(state.interval);
  };

  return (
    <div class="bar crt" onMount={onMount} onUnmount={onUnmount}>
      <StartButton />
      <ul class="taskbar" ref={taskbarListRef}></ul>
      <div class="tray-toggle">
        <div class="arrow"></div>
      </div>
      <div class="taskbar__clock">
        <span ref={clockRef}>--:--</span>
      </div>
    </div>
  );
};
