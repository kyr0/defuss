# Defuss Transition Effects

The defuss framework now includes a powerful transition system that allows you to add smooth animations to DOM updates. The transitions are applied to parent elements while preserving defuss's intelligent partial DOM update behavior.

## Basic Usage

```typescript
import { $ } from 'defuss';

// Update with a fade transition
const $element = await $('#my-element');
await $element.update('<div>New content</div>', {
  type: 'fade',
  duration: 300,
  easing: 'ease-in-out'
});
```

## API Reference

### TransitionConfig Interface

```typescript
interface TransitionConfig {
  /** Predefined transition type */
  type?: TransitionType;
  /** Custom CSS-in-JS styles for each transition phase */
  styles?: TransitionStyles;
  /** Duration in milliseconds */
  duration?: number;
  /** CSS easing function */
  easing?: string;
  /** Delay before starting transition in milliseconds */
  delay?: number;
}
```

### Predefined Transition Types

The following predefined transition types are available:

- `'fade'` - Fade in/out effect (default)
- `'slide-left'` - Slide from right to left
- `'slide-right'` - Slide from left to right  
- `'slide-up'` - Slide from bottom to top
- `'slide-down'` - Slide from top to bottom
- `'scale'` - Scale and fade effect
- `'none'` - No transition

### Default Configuration

```typescript
const DEFAULT_TRANSITION_CONFIG = {
  type: 'fade',
  duration: 300,
  easing: 'ease-in-out',
  delay: 0
};
```

## Examples

### 1. Basic Fade Transition

```typescript
await $element.update('<div>New content</div>', {
  type: 'fade'
});
```

### 2. Slide Transition with Custom Duration

```typescript
await $element.update('<div>New content</div>', {
  type: 'slide-left',
  duration: 500,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
});
```

### 3. Custom Transition Styles

```typescript
await $element.update('<div>New content</div>', {
  styles: {
    enter: { 
      opacity: '0', 
      transform: 'scale(0.8) rotate(-90deg)',
      transition: 'all 400ms ease-out'
    },
    enterActive: { 
      opacity: '1', 
      transform: 'scale(1) rotate(0deg)' 
    },
    exit: { 
      opacity: '1', 
      transform: 'scale(1) rotate(0deg)',
      transition: 'all 200ms ease-in'
    },
    exitActive: { 
      opacity: '0', 
      transform: 'scale(1.2) rotate(90deg)' 
    }
  },
  duration: 400
});
```

### 4. Delayed Transition

```typescript
await $element.update('<div>New content</div>', {
  type: 'scale',
  delay: 200,
  duration: 300
});
```

## How It Works

The transition system works by:

1. **Exit Phase**: Applies exit styles to the parent element and waits for the transition to complete
2. **Update Phase**: Performs the actual DOM update using defuss's intelligent `updateDomWithVdom` function
3. **Enter Phase**: Applies enter styles and waits for the transition to complete
4. **Cleanup**: Restores original styles to avoid side effects

### Transition Phases

Each transition has four phases defined by CSS-in-JS style objects:

- **`enter`**: Initial styles when content is entering (before animation starts)
- **`enterActive`**: Target styles for the enter animation
- **`exit`**: Initial styles when content is exiting (before animation starts)  
- **`exitActive`**: Target styles for the exit animation

## Advanced Usage

### Combining with JSX Updates

```typescript
import { jsx } from 'defuss';

const NewComponent = () => jsx('div', {
  style: { padding: '20px', background: '#f0f0f0' }
}, 'Updated with JSX!');

await $element.update(NewComponent, {
  type: 'slide-up',
  duration: 400
});
```

### Error Handling

The transition system includes automatic error recovery:

```typescript
try {
  await $element.update(newContent, { type: 'fade' });
} catch (error) {
  console.error('Transition failed:', error);
  // Original styles are automatically restored on error
}
```

### Performance Considerations

- Transitions are applied to parent elements to avoid interfering with partial DOM updates
- Original styles are stored and restored to prevent side effects
- Fallback timeouts ensure transitions don't hang indefinitely
- The system gracefully degrades when parent elements are not available

## Browser Support

The transition system uses modern CSS features:
- CSS Transitions
- CSS Transforms  
- `transitionend` events

Supported in all modern browsers (IE11+ with some limitations).

## Migration Guide

If you're upgrading from a version without transitions:

### Before
```typescript
await $element.update('<div>New content</div>');
```

### After (with transitions)
```typescript
await $element.update('<div>New content</div>', {
  type: 'fade',
  duration: 300
});
```

The transition parameter is optional, so existing code continues to work without changes.

## Tips and Best Practices

1. **Choose appropriate durations**: 200-500ms work well for most UI transitions
2. **Use CSS easing functions**: `ease-in-out` provides natural feeling animations
3. **Test on slower devices**: Ensure transitions don't impact performance
4. **Provide fallbacks**: The system gracefully handles missing parent elements
5. **Keep it subtle**: Overly dramatic transitions can hurt user experience

## Troubleshooting

### Transition not visible
- Ensure the target element has a parent element
- Check that the parent element is not hidden or positioned in a way that clips the transition
- Verify CSS transition properties are valid

### Performance issues
- Reduce transition duration
- Use `transform` and `opacity` properties for best performance
- Avoid transitioning properties that trigger layout recalculation

### Transition interrupted
- The system automatically handles cleanup if transitions are interrupted
- Original styles are always restored, even on errors
