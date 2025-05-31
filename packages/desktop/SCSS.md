# SCSS Imports

This package includes SCSS files that can be imported in your projects for styling desktop components.

## Available SCSS Files

### Main Entry Points
- `defuss-desktop/dist/index.scss` - Main SCSS entry point, forwards desktop-panel styles
- `defuss-desktop/dist/xp.scss` - Windows XP theme styles

### Theme Components
- `defuss-desktop/dist/themes/xp/index.scss` - Complete Windows XP theme
- `defuss-desktop/dist/scss/desktop-panel.scss` - Desktop panel with cursors, fonts, and utilities

## Usage

In your SCSS/CSS files, you can import these styles:

```scss
// Import the main desktop styles
@use "defuss-desktop/dist/index.scss";

// Or import the XP theme specifically
@use "defuss-desktop/dist/xp.scss";

// Or import specific components
@use "defuss-desktop/dist/scss/desktop-panel.scss";
@use "defuss-desktop/dist/themes/xp/index.scss";
```

## Features Included

### Custom Cursors
- Support for custom .cur files from `/cursors/` directory
- Data attributes and CSS classes for cursor management
- Fallbacks to system cursors

### Custom Fonts
- Windows XP Tahoma font (normal and bold variants)
- Font utility classes for different families and sizes
- Optimized text rendering

### Responsive Components
- Viewport-based sizing for consistent scaling
- Modern CSS Grid and Flexbox layouts
- Mobile-friendly responsive design

## Font Requirements

The XP theme expects the following font file to be available:
- `/fonts/tahoma/windows-xp-tahoma.otf.woff2`

Make sure to include this font file in your public directory for the XP theme to work correctly.
