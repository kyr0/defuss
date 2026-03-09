/**
 * Transforms shadcn.css to scope all styles under .defuss-shadcn
 * and prefix custom properties with --defuss-
 */
const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

const filePath = join(__dirname, '..', 'src', 'css', 'shadcn.css');
let css = readFileSync(filePath, 'utf8');

console.log('Original file size:', css.length, 'bytes');

// Custom properties defined in :root and .dark blocks that need --defuss- prefix
const customProps = [
  'radius', 'background', 'foreground',
  'card-foreground', 'card',
  'popover-foreground', 'popover',
  'primary-foreground', 'primary',
  'secondary-foreground', 'secondary',
  'muted-foreground', 'muted',
  'accent-foreground', 'accent',
  'destructive',
  'border', 'input', 'ring',
  'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5',
  'sidebar-foreground', 'sidebar-primary-foreground', 'sidebar-primary',
  'sidebar-accent-foreground', 'sidebar-accent',
  'sidebar-border', 'sidebar-ring',
  'sidebar-width', 'sidebar-mobile-width', 'sidebar',
  'scrollbar-track', 'scrollbar-thumb',
  'scrollbar-width', 'scrollbar-radius',
  'chevron-down-icon-50', 'chevron-down-icon',
  'check-icon',
];

// Sort longest-first to prevent partial replacements
customProps.sort((a, b) => b.length - a.length);

function esc(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Step 1: :root → .defuss-shadcn
css = css.replace(':root {', '.defuss-shadcn {');
console.log('Step 1: Replaced :root with .defuss-shadcn');

// Step 2: .dark → scoped dark selector
css = css.replace(/\n\.dark \{/, '\n:is(.defuss-shadcn.dark, .dark .defuss-shadcn) {');
console.log('Step 2: Scoped .dark selector');

// Step 3: Prefix custom property declarations (--name: value)
for (const prop of customProps) {
  css = css.replace(
    new RegExp('--' + esc(prop) + '(\\s*:)', 'g'),
    '--defuss-' + prop + '$1'
  );
}
console.log('Step 3: Prefixed property declarations');

// Step 4: Prefix var() references to our custom properties
for (const prop of customProps) {
  css = css.replace(
    new RegExp('var\\(--' + esc(prop) + '\\)', 'g'),
    'var(--defuss-' + prop + ')'
  );
}
console.log('Step 4: Prefixed var() references');

// Step 5: Prefix Tailwind arbitrary value references (--prop) not in var()
// e.g. w-(--sidebar-width) → w-(--defuss-sidebar-width)
for (const prop of customProps) {
  css = css.replace(
    new RegExp('(?<!var)\\(--' + esc(prop) + '\\)', 'g'),
    '(--defuss-' + prop + ')'
  );
}
console.log('Step 5: Prefixed Tailwind arbitrary values');

// Step 6: Rename keyframes
css = css.replace('@keyframes toast-up', '@keyframes defuss-toast-up');
css = css.replace('animate-[toast-up_', 'animate-[defuss-toast-up_');
console.log('Step 6: Renamed keyframes');

// Step 7: Scope @layer base selectors
const baseOld = [
  '  * {',
  '    @apply border-border outline-ring/50;',
  '  }',
  '  html {',
  '    @apply scroll-smooth;',
  '  }',
  '  body {',
  '    @apply bg-background text-foreground overscroll-none antialiased;',
  '  }',
  '  .scrollbar {',
].join('\n');

const baseNew = [
  '  .defuss-shadcn, .defuss-shadcn * {',
  '    @apply border-border outline-ring/50;',
  '  }',
  '  .defuss-shadcn {',
  '    @apply scroll-smooth bg-background text-foreground overscroll-none antialiased;',
  '  }',
  '  .defuss-shadcn .scrollbar {',
].join('\n');

if (css.includes(baseOld)) {
  css = css.replace(baseOld, baseNew);
  console.log('Step 7: Scoped @layer base');
} else {
  console.error('Step 7 FAILED: Could not find @layer base content');
  console.error('Looking for:', JSON.stringify(baseOld));
  process.exit(1);
}

// Step 8: Scope @layer components blocks — wrap content in .defuss-shadcn { ... }
let result = '';
let i = 0;
const marker = '@layer components {';
let layerCount = 0;

while (i < css.length) {
  const idx = css.indexOf(marker, i);
  if (idx === -1) {
    result += css.slice(i);
    break;
  }

  // Add everything up to and including the marker
  result += css.slice(i, idx + marker.length);
  i = idx + marker.length;

  // Find the matching closing brace
  let braceCount = 1;
  let j = i;
  while (j < css.length && braceCount > 0) {
    if (css[j] === '{') braceCount++;
    else if (css[j] === '}') braceCount--;
    if (braceCount > 0) j++;
  }

  // j now points to the closing }
  const content = css.slice(i, j);
  const indentedContent = content.replace(/\n/g, '\n  ');
  result += '\n  .defuss-shadcn {' + indentedContent + '}\n';
  result += '}';
  i = j + 1;
  layerCount++;
}

css = result;
console.log(`Step 8: Scoped ${layerCount} @layer components blocks`);

// Verify no un-prefixed custom props remain (excluding @theme, comments, @apply Tailwind classes)
let issues = 0;
for (const prop of customProps) {
  // Check for var(--prop) without defuss prefix (should be zero)
  const varMatch = css.match(new RegExp('var\\(--(?!defuss-)' + esc(prop) + '\\)', 'g'));
  if (varMatch) {
    console.warn(`WARNING: Found un-prefixed var(--${prop}):`, varMatch.length, 'occurrences');
    issues++;
  }
}
if (issues === 0) {
  console.log('Verification: All custom property references are prefixed ✓');
}

writeFileSync(filePath, css);
console.log('Scoped file size:', css.length, 'bytes');
console.log('Done!');
