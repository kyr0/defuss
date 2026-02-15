import { Router, type FC } from "defuss";

const KitchenSinkEntryLink: FC<{ href: string }> = ({ href, children }) => {
  return (
    <a
      href={href}
      class="font-semibold text-primary hover:underline underline-offset-4"
      onClick={(event) => {
        if (href.includes("#")) {
          return;
        }
        event.preventDefault();
        Router.navigate(href);
      }}
    >
      {children}
    </a>
  );
};

export const KitchenSink: FC = () => {
  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold tracking-tight">Kitchen Sink</h1>
      <p class="text-xl text-muted-foreground">All components in one place.</p>
      <p class="text-muted-foreground">
        This page documents the comprehensive coverage of 40 screens in the
        component library, covering all defuss-shadcn components with detailed
        examples based on Basecoat styling.
      </p>
      <div class="bg-muted rounded-lg p-4 inline-block mb-6">
        <span class="font-semibold">Total Screens:</span>{" "}
        <span class="ml-2 font-bold text-primary">40</span>
      </div>

      <div class="prose dark:prose-invert max-w-none">
        <h2
          id="currently-covered"
          class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2"
        >
          Currently Covered
        </h2>
        <p class="text-muted-foreground">
          The following 40 screens have been implemented with comprehensive
          examples based on the defuss-shadcn components and Basecoat styling
          classes.
        </p>

        <h3
          id="basic-components"
          class="text-xl font-semibold tracking-tight scroll-m-20 mt-8"
        >
          Basic Components
        </h3>
        <ul class="list-disc pl-6 space-y-2">
          <li>
            <KitchenSinkEntryLink href="/components/button">Button</KitchenSinkEntryLink> - All variants (default, secondary,
            destructive, outline, ghost, link), sizes (sm, lg, icon), with
            icons, loading state, as link, with spinner, grouped, disabled
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/badge">Badge</KitchenSinkEntryLink> - All variants (default, secondary,
            destructive, outline, primary), with icons, as links, pill style,
            count badges, custom colors, grouped
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/card">Card</KitchenSinkEntryLink> - Basic structure, with image, avatar group,
            interactive, grid layout, horizontal, no footer, header with actions
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/avatar">Avatar</KitchenSinkEntryLink> - Basic, different shapes (rounded, circle,
            square), stacked/group with ring styling, fallback, loading states
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/separator">Separator</KitchenSinkEntryLink> - Horizontal, vertical, in forms, with
            text
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/label">Label</KitchenSinkEntryLink> - Basic, with input, disabled, error states,
            requiredIndicator
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/kbd">Kbd</KitchenSinkEntryLink> - Basic, grouped (key + key), shortcut
            combinations (Cmd+K, Ctrl+Shift+P), with icon
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/progress">Progress</KitchenSinkEntryLink> - With label, percentage, colors, in card,
            multiple, custom height, indeterminate
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/spinner">Spinner</KitchenSinkEntryLink> - Basic, in button, with Item, different
            sizes, colors
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/skeleton">Skeleton</KitchenSinkEntryLink> - With rounded corners, in list, in card,
            custom sizing, different timing
          </li>
        </ul>

        <h3
          id="form-components"
          class="text-xl font-semibold tracking-tight scroll-m-20 mt-8"
        >
          Form Components
        </h3>
        <ul class="list-disc pl-6 space-y-2">
          <li>
            <KitchenSinkEntryLink href="/components/input">Input</KitchenSinkEntryLink> - All variants: basic, different types
            (password, email, tel, url, number), with button, clear, password
            toggle, prefix/suffix, character counter, disabled, invalid,
            readonly
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/textarea">Textarea</KitchenSinkEntryLink> - Basic, with code editor styling,
            auto-resize
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/field">Field</KitchenSinkEntryLink> - Basic input, textarea, select, fieldset,
            horizontal, error states, disabled, responsive
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/form">Form</KitchenSinkEntryLink> - Complete form with validation, fieldset
            layouts
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/select">Select</KitchenSinkEntryLink> - Basic with options, search, multiple,
            disabled, invalid, custom trigger
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/radio-group">Radio Group</KitchenSinkEntryLink> - Basic, horizontal, with
            labels/descriptions, in form with validation, with icons, in card,
            choice card, error state
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/checkbox">Checkbox</KitchenSinkEntryLink> - Basic, with text, in forms, list,
            indeterminate state
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/switch">Switch</KitchenSinkEntryLink> - Basic with label, disabled, in card,
            custom colors
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/slider">Slider</KitchenSinkEntryLink> - Basic, range, disabled, with step values,
            custom values, value display, inline, in form, with markers
          </li>
        </ul>

        <h3
          id="navigation-components"
          class="text-xl font-semibold tracking-tight scroll-m-20 mt-8"
        >
          Navigation Components
        </h3>
        <ul class="list-disc pl-6 space-y-2">
          <li>
            <KitchenSinkEntryLink href="/components/breadcrumb">Breadcrumb</KitchenSinkEntryLink> - Basic, ellipsis with dropdown, custom
            separator
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/pagination">Pagination</KitchenSinkEntryLink> - Previous/Next, page numbers, ellipsis,
            select page size, show total
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/tabs">Tabs</KitchenSinkEntryLink> - Basic, with icons, close buttons, pill
            variant, underline variant, different panel content, vertical
          </li>
        </ul>

        <h3
          id="interactive-components"
          class="text-xl font-semibold tracking-tight scroll-m-20 mt-8"
        >
          Interactive Components
        </h3>
        <ul class="list-disc pl-6 space-y-2">
          <li>
            <KitchenSinkEntryLink href="/components/accordion">Accordion</KitchenSinkEntryLink> - Basic with expandable sections,
            accordion item with custom trigger, multiple expanded
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/dialog">Dialog</KitchenSinkEntryLink> - Edit dialog, scrollable, command dialog,
            responsive, close on escape
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/alert-dialog">Alert Dialog</KitchenSinkEntryLink> - Confirmation dialog, destructive
            action, with icons
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/dropdown-menu">Dropdown Menu</KitchenSinkEntryLink> - Basic, checkboxes, radio group,
            disabled, icons, alignment, sides, nested, custom content
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/popover">Popover</KitchenSinkEntryLink> - Basic, with form, nested content,
            different triggers, different alignments, open/close triggers
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/tooltip">Tooltip</KitchenSinkEntryLink> - Basic, different positions, various
            triggers, custom delay
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/combobox">Combobox</KitchenSinkEntryLink> - Basic frameworks, multiple selection
            working, searchable, disabled, invalid, with icons, grouped options,
            readonly
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/command">Command</KitchenSinkEntryLink> - Basic command menu, dialog, popover, kbd
            shortcuts
          </li>
        </ul>

        <h3
          id="feedback-components"
          class="text-xl font-semibold tracking-tight scroll-m-20 mt-8"
        >
          Feedback Components
        </h3>
        <ul class="list-disc pl-6 space-y-2">
          <li>
            <KitchenSinkEntryLink href="/components/alert">Alert</KitchenSinkEntryLink> - Success, destructive, with/without icon,
            with/without description, with actions
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/toast">Toast</KitchenSinkEntryLink> - Success, info, warning, error, custom
            duration, multiple concurrent, custom JSX
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/table">Table</KitchenSinkEntryLink> - Basic, striped, checkbox selection,
            interactive rows, actions column, responsive, sortable headers
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/theme-switcher">Theme Switcher</KitchenSinkEntryLink> - JavaScript implementation with
            toggle, explicit light/dark
          </li>
        </ul>

        <h3
          id="scrollable"
          class="text-xl font-semibold tracking-tight scroll-m-20 mt-8"
        >
          Scrollable Containers (7 variants)
        </h3>
        <ul class="list-disc pl-6 space-y-2">
          <li>
            <KitchenSinkEntryLink href="/components/scrollable#list-scroll">List Scroll</KitchenSinkEntryLink> - Long lists with virtualization
            patterns
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/scrollable#grid-scroll">Grid Scroll</KitchenSinkEntryLink> - Product grids, image galleries
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/scrollable#table-scroll">Table Scroll</KitchenSinkEntryLink> - Large data tables with sticky
            headers
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/scrollable#text-scroll">Text Scroll</KitchenSinkEntryLink> - Long-form content, documentation
            style
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/scrollable#card-scroll">Card Scroll</KitchenSinkEntryLink> - Card with overflow content
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/scrollable#modal-dialog-scroll">Modal Dialog Scroll</KitchenSinkEntryLink> - Modal with scrollable content
            area
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/scrollable#sidebar-scroll">Sidebar Scroll</KitchenSinkEntryLink> - Sidebar with scrolled content
          </li>
        </ul>

        <h3
          id="empty-states"
          class="text-xl font-semibold tracking-tight scroll-m-20 mt-8"
        >
          Empty States (7 variants)
        </h3>
        <ul class="list-disc pl-6 space-y-2">
          <li>
            <KitchenSinkEntryLink href="/components/empty">No Projects</KitchenSinkEntryLink> - Project management empty state
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/empty">Welcome</KitchenSinkEntryLink> - First-time user welcome state
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/empty">No Results</KitchenSinkEntryLink> - Empty search results state
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/empty">Empty Table</KitchenSinkEntryLink> - Empty data table state
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/empty">Empty List</KitchenSinkEntryLink> - Empty list view state
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/empty">Empty Card</KitchenSinkEntryLink> - Card with no content state
          </li>
          <li>
            <KitchenSinkEntryLink href="/components/empty">Feature Disabled</KitchenSinkEntryLink> - Feature temporarily disabled
          </li>
        </ul>
      </div>
    </div>
  );
};
