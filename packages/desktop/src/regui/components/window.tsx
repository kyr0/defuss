import { windowManager, type CreateWindowOptions } from "../../window.js";
import { createRef, type Props, $, type Ref } from "defuss";
import { throttle } from "defuss-runtime";

export interface WindowProps extends Props, CreateWindowOptions { }

export interface WindowRefState {
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  minimize: () => void;
  maximize: () => void;
  restore: () => void;
  close: () => void;
}

export function Window({
  title = "Untitled",
  height = 300,
  width = 200,
  x = 50,
  y = 100,
  children,
  ref = createRef<WindowRefState>(),
  resizable = true,
  minimizable = true,
  maximizable = true,
  id = undefined,
  onClose = () => { },
  onMinimize = () => { },
  onMaximize = () => { },
}: WindowProps) {
  let isDragging = false;

  const initialWindowState = windowManager.addWindow({
    id,
    title,
    width,
    height,
    x,
    y,
    resizable,
    minimizable,
    maximizable,
  });

  let dragStart = { x: initialWindowState.x, y: initialWindowState.y };

  ref.state = {
    onClose: () => {
      console.log("Window closed");
      onClose();
    },
    onMinimize: () => {
      console.log("Window minimized");
      onMinimize();
    },
    onMaximize: () => {
      console.log("Window maximized");
      onMaximize();
    },

    minimize: () => {
      windowManager.minimizeWindow(initialWindowState.id);
    },

    maximize: () => {
      windowManager.maximizeWindow(initialWindowState.id);
    },

    restore: () => {
      windowManager.restoreWindow(initialWindowState.id);
    },

    close: () => {
      console.log("Closing window");
      windowManager.closeWindow(initialWindowState.id);
    },
  } as WindowRefState;

  const updateWindowState = throttle(
    (newState: Partial<CreateWindowOptions>) => {
      windowManager.updateWindow(initialWindowState.id, newState);
    },
    250, // 1/4 second throttle
  );

  const onMouseMove = async (event: Event) => {
    if (!isDragging) return;

    const mouseEvent = event as MouseEvent;
    const win = await $(ref);
    const deltaX = mouseEvent.clientX - dragStart.x;
    const deltaY = mouseEvent.clientY - dragStart.y;

    // Get current offset and calculate new position
    const currentOffset = await win.offset();
    if (currentOffset) {
      const newX = (currentOffset as any).left + deltaX;
      const newY = (currentOffset as any).top + deltaY;

      // Update the window state in the WindowManager
      updateWindowState({ x: newX, y: newY });

      // Update position using jQuery css method
      await win.css({
        left: `${newX}px`,
        top: `${newY}px`,
      });
    }

    // Update drag start position for next movement
    dragStart = { x: mouseEvent.clientX, y: mouseEvent.clientY };
  };

  const onWindowMouseDown = (event: MouseEvent) =>
    windowManager.setActiveWindow(initialWindowState.id);

  const onMouseDown = (event: MouseEvent) => {
    if ((event.target! as HTMLElement).tagName === "BUTTON") {
      // If the target is a button, prevent dragging
      isDragging = false;
      return;
    }

    isDragging = true;

    dragStart = {
      x: event.clientX,
      y: event.clientY,
    };

    // Use dequery for global event attachment (now sync with createSyncCall!)
    $(document).on("mousemove", onMouseMove);
    $(document).on("mouseup", onMouseUp);

    // Prevent text selection during drag
    event.preventDefault();
  };

  const onMouseUp = () => {
    isDragging = false;
    // Remove global event listeners
    $(document).off("mousemove", onMouseMove);
    $(document).off("mouseup", onMouseUp);
  };

  const onWindowMounted = () => {
    windowManager.updateWindow(initialWindowState.id, {
      el: ref.current as HTMLElement,
      ref: ref as Ref<WindowRefState>,
    });
    windowManager.setActiveWindow(initialWindowState.id);
  };

  const onCloseClick = () => windowManager.closeWindow(initialWindowState.id);

  const onMaximizeClick = async () => {
    const currentState = windowManager.getWindow(initialWindowState.id);

    if (currentState?.maximized) {
      windowManager.restoreWindow(initialWindowState.id);
    } else {
      // If the window is not maximized, maximize it
      windowManager.maximizeWindow(initialWindowState.id);
    }
  };

  const onMinimizeClick = async () => {
    windowManager.minimizeWindow(initialWindowState.id);
  };

  return (
    <div
      class="window crt"
      ref={ref}
      onMouseDown={onWindowMouseDown}
      style={{
        width,
        height,
        left: `${initialWindowState.x}px`,
        top: `${initialWindowState.y}px`,
        position: "absolute",
      }}
    >
      <div
        class="title-bar"
        onMount={onWindowMounted}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
      >
        <div class="title-bar-text">{title}</div>
        <div class="title-bar-controls">
          <button
            type="button"
            aria-label="Minimize"
            onClick={onMinimizeClick}
          ></button>
          <button
            type="button"
            aria-label="Maximize"
            onClick={onMaximizeClick}
          ></button>
          <button
            type="button"
            aria-label="Close"
            onClick={onCloseClick}
          ></button>
        </div>
      </div>
      <div class="window-body">{children}</div>
    </div>
  );
}
