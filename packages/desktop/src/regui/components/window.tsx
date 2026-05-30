import { windowManager, type CreateWindowOptions } from "../../window.js";
import { $, createRef, type Props, type Ref } from "defuss";
import { throttle } from "defuss-runtime";

export interface WindowProps
  extends Props<HTMLDivElement, WindowRefState>,
  CreateWindowOptions { 
	ref: Ref<HTMLDivElement, WindowRefState>;
}

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
  ref = createRef<HTMLDivElement, WindowRefState>(),
  resizable = true,
  minimizable = true,
  maximizable = true,
  id = undefined,
  onClose = () => { },
  onMinimize = () => { },
  onMaximize = () => { },
}: WindowProps) {
  const MIN_WINDOW_WIDTH = 240;
  const MIN_WINDOW_HEIGHT = 160;

  // ---- drag state ----
  let isDragging = false;
  let dragPointerId: number | null = null;

  // Baselines at pointerdown (prevents jump)
  let dragStartMouse = { x: 0, y: 0 };
  let dragStartWin = { x: 0, y: 0 };

  // Last known position (flush on stop)
  let lastWin = { x, y };

  // Element used for pointer capture (because currentTarget is #document in delegated systems)
  let capturedTitleBar: HTMLElement | null = null;

  // ---- resize state ----
  let isResizing = false;
  let resizePointerId: number | null = null;
  let resizeDirection: string | null = null;
  let capturedResizeHandle: HTMLElement | null = null;
  let resizeStartMouse = { x: 0, y: 0 };
  let resizeStartWin = { x, y, width, height };

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

  lastWin = { x: initialWindowState.x, y: initialWindowState.y };

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

    minimize: () => windowManager.minimizeWindow(initialWindowState.id),
    maximize: () => windowManager.maximizeWindow(initialWindowState.id),
    restore: () => windowManager.restoreWindow(initialWindowState.id),
    close: () => {
      console.log("Closing window");
      windowManager.closeWindow(initialWindowState.id);
    },
  } as WindowRefState;

  const updateWindowState = throttle(
    (newState: Partial<CreateWindowOptions>) => {
      windowManager.updateWindow(initialWindowState.id, newState);
    },
    250
  );

  const onWindowMouseDown = (_event: MouseEvent) =>
    windowManager.setActiveWindow(initialWindowState.id);

  const getCurrentWinPos = () => {
    const el = ref.current as HTMLElement | null;
    if (!el) return { x: lastWin.x, y: lastWin.y };

    // Prefer inline style (we set it), fallback to offsetLeft/Top
    const left = Number.parseFloat(el.style.left);
    const top = Number.parseFloat(el.style.top);

    return {
      x: Number.isFinite(left) ? left : el.offsetLeft,
      y: Number.isFinite(top) ? top : el.offsetTop,
    };
  };

  const stopDragging = (event?: PointerEvent) => {
    if (!isDragging) return;

    // release capture (if any)
    if (
      event &&
      capturedTitleBar &&
      typeof capturedTitleBar.releasePointerCapture === "function" &&
      dragPointerId === event.pointerId
    ) {
      try {
        capturedTitleBar.releasePointerCapture(event.pointerId);
      } catch { }
    }

    isDragging = false;
    dragPointerId = null;
    capturedTitleBar = null;

    // Flush final state (don’t rely on throttle for the last position)
    windowManager.updateWindow(initialWindowState.id, { x: lastWin.x, y: lastWin.y });
  };

  const stopResizing = (event?: PointerEvent) => {
    if (!isResizing) return;

    if (
      event &&
      capturedResizeHandle &&
      typeof capturedResizeHandle.releasePointerCapture === "function" &&
      resizePointerId === event.pointerId
    ) {
      try {
        capturedResizeHandle.releasePointerCapture(event.pointerId);
      } catch { }
    }

    isResizing = false;
    resizePointerId = null;
    resizeDirection = null;
    capturedResizeHandle = null;

    const el = ref.current as HTMLElement | null;
    if (!el) return;

    const left = Number.parseFloat(el.style.left);
    const top = Number.parseFloat(el.style.top);
    const width = Number.parseFloat(el.style.width);
    const height = Number.parseFloat(el.style.height);

    windowManager.updateWindow(initialWindowState.id, {
      x: Number.isFinite(left) ? left : lastWin.x,
      y: Number.isFinite(top) ? top : lastWin.y,
      width: Number.isFinite(width) ? width : el.offsetWidth,
      height: Number.isFinite(height) ? height : el.offsetHeight,
    });
  };

  const onTitlePointerDown = (event: PointerEvent) => {
    if (isResizing) return;

    // left button only for mouse; allow touch/pen
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const target = event.target as Element | null;

    // Don’t drag from buttons
    if ((target as HTMLElement | null)?.tagName === "BUTTON") return;

    const titleBarEl = target?.closest?.(".title-bar") as HTMLElement | null;
    if (!titleBarEl) return;

    windowManager.setActiveWindow(initialWindowState.id);

    isDragging = true;
    dragPointerId = event.pointerId;
    capturedTitleBar = titleBarEl;

    dragStartMouse = { x: event.clientX, y: event.clientY };
    dragStartWin = getCurrentWinPos();

    if (typeof titleBarEl.setPointerCapture === "function") {
      titleBarEl.setPointerCapture(event.pointerId);
    }

    event.preventDefault();
  };

  const onResizePointerDown = (event: PointerEvent) => {
    if (!resizable) return;
    if (isDragging) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const currentState = windowManager.getWindow(initialWindowState.id);
    if (currentState?.maximized) return;

    const target = event.target as Element | null;
    const handle = target?.closest?.(".window-resize-handle") as HTMLElement | null;
    const direction = handle?.getAttribute("data-dir");
    if (!handle || !direction) return;

    const currentPos = getCurrentWinPos();
    const el = ref.current as HTMLElement | null;
    if (!el) return;

    isResizing = true;
    resizePointerId = event.pointerId;
    resizeDirection = direction;
    capturedResizeHandle = handle;
    resizeStartMouse = { x: event.clientX, y: event.clientY };
    resizeStartWin = {
      x: currentPos.x,
      y: currentPos.y,
      width: el.offsetWidth,
      height: el.offsetHeight,
    };

    if (typeof handle.setPointerCapture === "function") {
      handle.setPointerCapture(event.pointerId);
    }

    windowManager.setActiveWindow(initialWindowState.id);
    event.preventDefault();
    event.stopPropagation();
  };

  const onResizePointerMove = (event: PointerEvent) => {
    if (!isResizing) return;
    if (resizePointerId !== null && event.pointerId !== resizePointerId) return;
    if (!resizeDirection) return;

    const el = ref.current as HTMLElement | null;
    if (!el) return;

    const deltaX = event.clientX - resizeStartMouse.x;
    const deltaY = event.clientY - resizeStartMouse.y;

    let newX = resizeStartWin.x;
    let newY = resizeStartWin.y;
    let newWidth = resizeStartWin.width;
    let newHeight = resizeStartWin.height;

    if (resizeDirection.includes("e")) {
      newWidth = Math.max(MIN_WINDOW_WIDTH, resizeStartWin.width + deltaX);
    }

    if (resizeDirection.includes("s")) {
      newHeight = Math.max(MIN_WINDOW_HEIGHT, resizeStartWin.height + deltaY);
    }

    if (resizeDirection.includes("w")) {
      const tentativeWidth = resizeStartWin.width - deltaX;
      newWidth = Math.max(MIN_WINDOW_WIDTH, tentativeWidth);
      newX = resizeStartWin.x + (resizeStartWin.width - newWidth);
    }

    if (resizeDirection.includes("n")) {
      const tentativeHeight = resizeStartWin.height - deltaY;
      newHeight = Math.max(MIN_WINDOW_HEIGHT, tentativeHeight);
      newY = resizeStartWin.y + (resizeStartWin.height - newHeight);
    }

    lastWin = { x: newX, y: newY };

    el.style.left = `${newX}px`;
    el.style.top = `${newY}px`;
    el.style.width = `${newWidth}px`;
    el.style.height = `${newHeight}px`;

    updateWindowState({
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
    });

    event.preventDefault();
    event.stopPropagation();
  };

  const onResizePointerUp = (event: PointerEvent) => {
    stopResizing(event);
  };

  const onResizePointerCancel = (event: PointerEvent) => {
    stopResizing(event);
  };

  const onTitlePointerMove = (event: PointerEvent) => {
    if (!isDragging) return;
    if (dragPointerId !== null && event.pointerId !== dragPointerId) return;

    const newX = dragStartWin.x + (event.clientX - dragStartMouse.x);
    const newY = dragStartWin.y + (event.clientY - dragStartMouse.y);

    lastWin = { x: newX, y: newY };

    const el = ref.current as HTMLElement | null;
    if (el) {
      el.style.left = `${newX}px`;
      el.style.top = `${newY}px`;
    }
    updateWindowState({ x: newX, y: newY });

    event.preventDefault();
  };

  const onTitlePointerUp = (event: PointerEvent) => {
    stopDragging(event);
  };

  const onTitlePointerCancel = (event: PointerEvent) => {
    stopDragging(event);
  };

  const onWindowMounted = () => {
    windowManager.updateWindow(initialWindowState.id, {
      el: ref.current as HTMLElement,
      ref: ref as Ref<HTMLElement, WindowRefState>,
    });
    windowManager.setActiveWindow(initialWindowState.id);

    // Safety nets: leaving tab/window can drop the "up" event
    $(document).on("blur", () => stopDragging());
    $(document).on("visibilitychange", () => {
      if (document.hidden) {
        stopDragging();
        stopResizing();
      }
    });
  };

  const onCloseClick = () => windowManager.closeWindow(initialWindowState.id);

  const onMaximizeClick = () => {
    const currentState = windowManager.getWindow(initialWindowState.id);
    if (currentState?.maximized) windowManager.restoreWindow(initialWindowState.id);
    else windowManager.maximizeWindow(initialWindowState.id);
  };

  const onMinimizeClick = () => {
    windowManager.minimizeWindow(initialWindowState.id);
  };

  return (
    <div
      class="window crt"
      ref={ref}
      data-resizable={String(resizable)}
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
        onPointerDown={onTitlePointerDown}
        onPointerMove={onTitlePointerMove}
        onPointerUp={onTitlePointerUp}
        onPointerCancel={onTitlePointerCancel}
        onDblClick={onMaximizeClick}
        style={{ touchAction: "none" }}
      >
        <div class="title-bar-text">{title}</div>
        <div class="title-bar-controls">
          <button type="button" aria-label="Minimize" onClick={onMinimizeClick}></button>
          <button type="button" aria-label="Maximize" onClick={onMaximizeClick}></button>
          <button type="button" aria-label="Close" onClick={onCloseClick}></button>
        </div>
      </div>
      <div class="window-body">{children}</div>
      {resizable && (
        <>
          <div
            class="window-resize-handle window-resize-handle--n"
            data-dir="n"
            onPointerDown={onResizePointerDown}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerCancel}
          ></div>
          <div
            class="window-resize-handle window-resize-handle--e"
            data-dir="e"
            onPointerDown={onResizePointerDown}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerCancel}
          ></div>
          <div
            class="window-resize-handle window-resize-handle--s"
            data-dir="s"
            onPointerDown={onResizePointerDown}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerCancel}
          ></div>
          <div
            class="window-resize-handle window-resize-handle--w"
            data-dir="w"
            onPointerDown={onResizePointerDown}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerCancel}
          ></div>
          <div
            class="window-resize-handle window-resize-handle--ne"
            data-dir="ne"
            onPointerDown={onResizePointerDown}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerCancel}
          ></div>
          <div
            class="window-resize-handle window-resize-handle--se"
            data-dir="se"
            onPointerDown={onResizePointerDown}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerCancel}
          ></div>
          <div
            class="window-resize-handle window-resize-handle--sw"
            data-dir="sw"
            onPointerDown={onResizePointerDown}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerCancel}
          ></div>
          <div
            class="window-resize-handle window-resize-handle--nw"
            data-dir="nw"
            onPointerDown={onResizePointerDown}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerCancel}
          ></div>
        </>
      )}
    </div>
  );
}
