<h1 align="center">

<img src="assets/defuss_mascott.png" width="100px" />

<p align="center">
  <code>defuss-desktop</code>
</p>

<sup align="center">

Themable Desktop Environment

</sup>

</h1>


> `defuss-desktop` is a comprehensive window manager/desktop environment that enables you to create desktop-like environments directly in the browser - like Windows XP. It provides a complete window system with resizable, movable windows, desktop management, task bars, and application launchers - perfect for building complex web applications that need a desktop-style interface.

<h3 align="center">

Features

</h3>

- 🪟 **Full Window Management**: Create, resize, move, minimize, maximize, and close windows
- 🖥️ **Desktop Environment**: Desktop icons, wallpaper support, and multi-workspace functionality  
- 📊 **Task Management**: Task bar, system tray, and application launcher
- 🎨 **Customizable UI**: Themeable window decorations and desktop styling
- ⚡ **Performance Optimized**: Efficient DOM manipulation and memory management
- 📱 **Responsive Design**: Adapts to different screen sizes and orientations
- 🎯 **Event System**: Comprehensive window and desktop event handling
- 🔧 **Developer Friendly**: Simple API for creating window-based applications


<h3 align="center">

Basic Usage

</h3>

```typescript
import { WindowManager, Window } from 'defuss-desktop';

// Initialize the window manager
const wm = new WindowManager({
  container: document.body,
  enableDesktop: true,
  enableTaskbar: true
});

// Create a new window
const window = wm.createWindow({
  title: 'My Application',
  width: 800,
  height: 600,
  resizable: true,
  minimizable: true,
  maximizable: true,
  content: '<div>Hello, Desktop World!</div>'
});

// Show the window
window.show();
```

<h3 align="center">

Advanced Features

</h3>

- **Window States**: Normal, minimized, maximized, fullscreen
- **Desktop Management**: Multiple desktops/workspaces
- **Application Launcher**: Start menu and application grid
- **File Manager Integration**: Desktop file operations
- **System Tray**: Notification area and quick actions
- **Window Snapping**: Automatic window positioning and sizing
- **Keyboard Shortcuts**: Comprehensive keyboard navigation
- **Accessibility Support**: Screen reader and keyboard-only navigation


<h3 align="center">

Integrating `defuss-wm` in your project

</h3>

**🚀 Looking for a template to start from?** Check out our examples that demonstrate desktop environments and window management.

#### 1. Install `defuss-wm`:

```bash
# install a decent package manager
npm i -g bun@^1.3.9

# from your project root folder, add defuss-wm to your dependencies
bun install defuss-wm
```

#### 2. Set up your desktop environment:

```typescript
import { WindowManager } from 'defuss-wm';

// Create a desktop environment
const wm = new WindowManager({
  container: document.getElementById('desktop'),
  theme: 'default',
  enableDesktop: true,
  enableTaskbar: true,
  enableSystemTray: true
});

// Register an application
wm.registerApplication({
  id: 'text-editor',
  name: 'Text Editor',
  icon: '/icons/text-editor.svg',
  component: TextEditorComponent
});

// Create and show a window
const window = wm.createWindow({
  appId: 'text-editor',
  title: 'Untitled Document',
  width: 800,
  height: 600,
  x: 100,
  y: 100
});

window.show();
```

#### 3. Handle window events:

```typescript
// Listen for window events
window.on('resize', (event) => {
  console.log('Window resized:', event.width, event.height);
});

window.on('move', (event) => {
  console.log('Window moved:', event.x, event.y);
});

window.on('close', () => {
  console.log('Window closed');
});

// Desktop events
wm.on('windowCreated', (window) => {
  console.log('New window created:', window.id);
});

wm.on('desktopClick', (event) => {
  console.log('Desktop clicked at:', event.x, event.y);
});
```

<h3 align="center">

🚀 How does `defuss-wm` work?

</h3>

`defuss-wm` provides a complete window management system built on top of the defuss framework. It manages window lifecycle, desktop interactions, and provides a familiar desktop environment experience within web applications.

- **Window Rendering**: Uses defuss's efficient rendering system for window contents
- **Event Management**: Comprehensive event system for window and desktop interactions  
- **Layout Engine**: Automatic window positioning and snapping
- **Theme System**: Customizable window decorations and desktop styling
- **State Management**: Persistent window states and desktop configurations

Inside this package, you'll find the following relevant folders and files:

```text
/
├── src/
│   ├── WindowManager.ts
│   ├── Window.ts
│   ├── Desktop.ts
│   ├── Taskbar.ts
│   ├── ApplicationLauncher.ts
│   └── themes/
├── dist/
├── tsconfig.json
├── LICENSE
├── package.json
```

The core `WindowManager` class orchestrates all window operations, while individual components handle specific aspects like the desktop, taskbar, and application management.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command       | Action                                                                                                                                                                                                                           |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun build`    | Build a new version of the window manager. |
| `bun test`    | Run the test suite for `defuss-wm`. |

---

<img src="https://raw.githubusercontent.com/kyr0/defuss/refs/heads/main/assets/defuss_comic.png" />

<caption><i><b>Come visit us on defuss island!</b></i></caption>