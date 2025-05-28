A window manager extension for defuss/dequery.

API:

type DequeryExtended = Dequery & DefussWindowMixin

```ts
// turns an element into a taskbar
$('#taskbar').taskbar<HTMLElement, DequeryExtended>({
    position: 'bottom',
    theme: 'windows-xp',
    startButton: <button>Start</button>,
    startMenuEntries: <>
        <StartMenuEntry>Entry 1</StartMenuEntry>
        <StartMenuEntry>Entry 2</StartMenuEntry>
        <StartMenuEntry>
          Entry 3
          <StartMenuSubmenu>
            <StartMenuEntry>Submenu Entry 1</StartMenuEntry>
            <StartMenuEntry>Submenu Entry 2</StartMenuEntry>
          </StartMenuSubmenu>
        </StartMenuEntry>
    </>
    onTaskClick: function(task) {
        console.log('Task clicked:', task);
    },
    onTaskClose: function(task) {
        console.log('Task closed:', task);
    }
});

// turns an element into a window
$('someDiv').decorateWindow<HTMLElement, DequeryExtended>({
    title: 'My Window', or <span>My Window</span>,
    theme: 'windows-xp',
    icon: 'path/to/icon.png', or <img src="path/to/icon.png" alt="icon" />,
    width: 400,
    height: 300,
    resizable: true,
    draggable: true,
    closeable: true,
    minimizable: true,
    maximizable: true,
    onClose: function() {
        console.log('Window closed');
    },
    onMinimize: function() {
        console.log('Window minimized');
    },
    onMaximize: function() {
        console.log('Window maximized');
    }
});
```

Internally uses: 

$.extend({
  createTaskbar: function(options) {
    // Implementation for taskbar decoration
  },
  createWindow: function(options) {
    // Implementation for window decoration
  }
})

Like this:

import { dequery, Dequery, createCall, CallChainImpl, createStore } from "defuss/dequery";

export interface CreateTaskbarOptions {
  position?: 'top' | 'bottom' | 'left' | 'right';
  stateful?: boolean; // if stateful, and if it has an id, it uses windowManagerStore to save its state
  theme?: string; // e.g., 'windows-xp', 'macos', etc.
  size?: 'small' | 'medium' | 'large';
  startButton?: HTMLElement;
  startMenuEntries?: HTMLElement;
  onTaskClick?: (task: HTMLElement) => void;
  onTaskClose?: (task: HTMLElement) => void;
}

export interface CreateWindowOptions {
  id?: string;
  theme: string; // e.g., 'windows-xp', 'macos', etc.
  title?: string;
  stateful?: boolean; // if stateful, and if it has an id, it uses windowManagerStore to save its state
  icon?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  resizable?: boolean;
  draggable?: boolean;
  closeable?: boolean;
  minimizable?: boolean;
  maximizable?: boolean;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

interface WindowManagerTaskbarState {
  position: 'top' | 'bottom' | 'left' | 'right';
  theme: string;
  size: 'small' | 'medium' | 'large';
}

interface WindowManagerWindowState {
  id: string;
  theme: string;
  title: string;
  icon: string;
  width: number;
  height: number;
  x: number;
  y: number;
  resizable: boolean;
  draggable: boolean;
  closeable: boolean;
  minimizable: boolean;
  maximizable: boolean;
  minimized: boolean;
  maximized: boolean;
}

interface DefussWindowManagerState {
  taskbar: WindowManagerTaskbarState;
  windows: Record<string, WindowManagerWindowState>;
}

const windowManagerStore = createStore<{
  taskbars: HTMLElement[];
  windows: HTMLElement[];
}>({
  taskbars: [],
  windows: []
});

class DequeryWithWindowManager<NT> extends CallChainImpl<
  NT,
  DequeryWithWindowManager<NT> & Dequery<NT>
> {
  foo(bar: number): this & Dequery<NT> {
    return createCall(this, "foo", async () => {
      didCall = bar;
      return this.nodes as NT;
    }) as unknown as this & Dequery<NT>;
  }
}

const $ = dequery.extend(DequeryWithWindowManager);

Exposes interfaces for TypeScript:

```typescript

export interface DefussWindowMixin {
  // creates a taskbar root element itself if not already created
  createTaskbar: (options: CreateTaskbarOptions) => void;

  // creates a window root decoration element itself if not already created
  createWindow: (options: CreateWindowOptions) => void;
}
```

Eventually, the user can do:

