import { createRef, type VNode } from "defuss";

export interface ResizableProps {
  north?: boolean;
  south?: boolean;
  west?: boolean;
  east?: boolean;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  initialWidth?: number;
  initialHeight?: number;
  className?: string;
  style?: any;
  children?: VNode;
}

type SizeState = { width?: number; height?: number };

export function Resizable({
  north,
  south,
  west,
  east,
  minWidth = 24,
  maxWidth = Number.POSITIVE_INFINITY,
  minHeight = 24,
  maxHeight = Number.POSITIVE_INFINITY,
  initialWidth,
  initialHeight,
  className = "",
  style = {},
  children,
}: ResizableProps) {
  const ref = createRef<SizeState, HTMLDivElement>(undefined, {
    width: initialWidth,
    height: initialHeight,
  });

  const updateSize = (newSize: SizeState) => {
    ref.updateState(newSize);

    if (ref.current) {
      if (newSize.width !== undefined) {
        ref.current.style.width =
          newSize.width != null ? `${newSize.width}px` : `${initialWidth}px`;
      }
      if (newSize.height !== undefined) {
        ref.current.style.height =
          newSize.height != null ? `${newSize.height}px` : `${initialHeight}px`;
      }
    }
  };

  function startResize(
    axis: "horizontal" | "vertical",
    edge: "W" | "E" | "N" | "S",
    startX: number,
    startY: number,
  ) {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const startWidth = rect.width;
    const startHeight = rect.height;

    function onMove(e: MouseEvent) {
      let newWidth = startWidth;
      let newHeight = startHeight;
      if (axis === "horizontal") {
        const delta = edge === "E" ? e.clientX - startX : startX - e.clientX;
        newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + delta));
        updateSize({ width: newWidth });
      }
      if (axis === "vertical") {
        const delta = edge === "S" ? e.clientY - startY : startY - e.clientY;
        newHeight = Math.max(
          minHeight,
          Math.min(maxHeight, startHeight + delta),
        );
        updateSize({ height: newHeight });
      }
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div
      ref={ref}
      style={{
        ...style,
        width: ref.state?.width != null ? `${ref.state.width}px` : undefined,
        height: ref.state?.height != null ? `${ref.state.height}px` : undefined,
        position: "relative",
        overflow: "hidden",
      }}
      className={className}
    >
      {north && (
        <div
          style={{
            cursor: "ns-resize",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            zIndex: 50,
          }}
          onMouseDown={(e) =>
            startResize("vertical", "N", e.clientX, e.clientY)
          }
        />
      )}
      {south && (
        <div
          style={{
            cursor: "ns-resize",
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "6px",
            zIndex: 50,
          }}
          onMouseDown={(e) =>
            startResize("vertical", "S", e.clientX, e.clientY)
          }
        />
      )}
      {west && (
        <div
          style={{
            cursor: "ew-resize",
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: "6px",
            zIndex: 50,
          }}
          onMouseDown={(e) =>
            startResize("horizontal", "W", e.clientX, e.clientY)
          }
        />
      )}
      {east && (
        <div
          style={{
            cursor: "ew-resize",
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: "6px",
            zIndex: 50,
          }}
          onMouseDown={(e) =>
            startResize("horizontal", "E", e.clientX, e.clientY)
          }
        />
      )}
      <div style={{ width: "100%", height: "100%" }}>{children}</div>
    </div>
  );
}
