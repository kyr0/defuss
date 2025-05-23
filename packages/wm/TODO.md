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
  decorateTaskbar: function(options) {
    // Implementation for taskbar decoration
  },
  decorateWindow: function(options) {
    // Implementation for window decoration
  }
})

Exposes interfaces for TypeScript:

```typescript

export interface DefussWindowMixin {
  decorateTaskbar: (options: {
    position?: 'top' | 'bottom' | 'left' | 'right';
    startButton?: HTMLElement;
    startMenuEntries?: HTMLElement;
    onTaskClick?: (task: HTMLElement) => void;
    onTaskClose?: (task: HTMLElement) => void;
  }) => void;
  decorateWindow: (options: {
    title?: string | HTMLElement;
    icon?: string | HTMLElement;
    width?: number;
    height?: number;
    resizable?: boolean;
    draggable?: boolean;
    closeable?: boolean;
    minimizable?: boolean;
    maximizable?: boolean;
    onClose?: () => void;
    onMinimize?: () => void;
    onMaximize?: () => void;
  }) => void;
}
```