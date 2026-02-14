import "./css/index.css";

import { render, createRef } from "defuss/client";
import { $ } from "defuss";
import type { FC } from "defuss";
import {
  Slider,
  Separator,
  Toaster,
  toast
} from "defuss-shadcn";

// ============================================================================
// Component Section IDs for Navigation
// ============================================================================
const SECTIONS = [
  { id: 'buttons', label: 'Buttons' },
  { id: 'badges', label: 'Badges' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'cards', label: 'Cards' },
  { id: 'form-elements', label: 'Form Elements' },
  { id: 'accordion', label: 'Accordion' },
  { id: 'avatar', label: 'Avatar' },
  { id: 'table', label: 'Table' },
  { id: 'tabs', label: 'Tabs' },
  { id: 'dialog', label: 'Dialog' },
  { id: 'popover', label: 'Popover' },
  { id: 'dropdown-menu', label: 'Dropdown Menu' },
  { id: 'breadcrumb', label: 'Breadcrumb' },
  { id: 'spinner', label: 'Spinner' },
  { id: 'skeleton', label: 'Skeleton' },
  { id: 'tooltip', label: 'Tooltip' },
  { id: 'kbd', label: 'Kbd' },
  { id: 'toast', label: 'Toast' },
];

// ============================================================================
// Initialize Basecoat components after render
// ============================================================================
function initBasecoatComponents() {
  // Initialize Tabs
  document.querySelectorAll('.tabs').forEach(tabsEl => {
    const tabs = tabsEl.querySelectorAll('[role="tab"]');
    const panels = tabsEl.querySelectorAll('[role="tabpanel"]');

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => {
        // Deselect all tabs and hide all panels
        tabs.forEach(t => {
          t.setAttribute('aria-selected', 'false');
          t.setAttribute('tabindex', '-1');
        });
        panels.forEach(p => {
          p.setAttribute('hidden', '');
          p.setAttribute('aria-selected', 'false');
        });
        // Select clicked tab and show panel
        tab.setAttribute('aria-selected', 'true');
        tab.setAttribute('tabindex', '0');
        if (panels[index]) {
          panels[index].removeAttribute('hidden');
          panels[index].setAttribute('aria-selected', 'true');
        }
      });
    });
  });

  // Initialize Popovers
  document.querySelectorAll('.popover').forEach(popoverEl => {
    const trigger = popoverEl.querySelector(':scope > button') as HTMLButtonElement;
    const content = popoverEl.querySelector(':scope > [data-popover]') as HTMLElement;

    if (!trigger || !content) return;

    const closePopover = (focusOnTrigger = true) => {
      trigger.setAttribute('aria-expanded', 'false');
      content.setAttribute('aria-hidden', 'true');
      if (focusOnTrigger) trigger.focus();
    };

    const openPopover = () => {
      document.dispatchEvent(new CustomEvent('basecoat:popover', { detail: { source: popoverEl } }));
      trigger.setAttribute('aria-expanded', 'true');
      content.setAttribute('aria-hidden', 'false');
    };

    trigger.addEventListener('click', () => {
      const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
      if (isExpanded) closePopover();
      else openPopover();
    });

    popoverEl.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Escape') closePopover();
    });

    document.addEventListener('click', (e) => {
      if (!popoverEl.contains(e.target as Node)) closePopover(false);
    });

    document.addEventListener('basecoat:popover', ((e: CustomEvent) => {
      if (e.detail.source !== popoverEl) closePopover(false);
    }) as EventListener);
  });

  // Initialize Dropdown Menus
  document.querySelectorAll('.dropdown-menu').forEach(dropdownEl => {
    const trigger = dropdownEl.querySelector(':scope > button') as HTMLButtonElement;
    const popover = dropdownEl.querySelector(':scope > [data-popover]') as HTMLElement;
    const menu = popover?.querySelector('[role="menu"]') as HTMLElement;

    if (!trigger || !popover || !menu) return;

    let menuItems: HTMLElement[] = [];
    let activeIndex = -1;

    const closeMenu = (focusOnTrigger = true) => {
      trigger.setAttribute('aria-expanded', 'false');
      trigger.removeAttribute('aria-activedescendant');
      popover.setAttribute('aria-hidden', 'true');
      if (focusOnTrigger) trigger.focus();
      setActiveItem(-1);
    };

    const openMenu = (initialSelection: false | 'first' | 'last' = false) => {
      document.dispatchEvent(new CustomEvent('basecoat:popover', { detail: { source: dropdownEl } }));
      trigger.setAttribute('aria-expanded', 'true');
      popover.setAttribute('aria-hidden', 'false');
      menuItems = Array.from(menu.querySelectorAll('[role^="menuitem"]')).filter(item =>
        !item.hasAttribute('disabled') && item.getAttribute('aria-disabled') !== 'true'
      ) as HTMLElement[];

      if (menuItems.length > 0 && initialSelection) {
        if (initialSelection === 'first') setActiveItem(0);
        else if (initialSelection === 'last') setActiveItem(menuItems.length - 1);
      }
    };

    const setActiveItem = (index: number) => {
      if (activeIndex > -1 && menuItems[activeIndex]) {
        menuItems[activeIndex].classList.remove('active');
      }
      activeIndex = index;
      if (activeIndex > -1 && menuItems[activeIndex]) {
        const activeItem = menuItems[activeIndex];
        activeItem.classList.add('active');
        trigger.setAttribute('aria-activedescendant', activeItem.id || '');
      } else {
        trigger.removeAttribute('aria-activedescendant');
      }
    };

    trigger.addEventListener('click', () => {
      const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
      if (isExpanded) closeMenu();
      else openMenu(false);
    });

    dropdownEl.addEventListener('keydown', (event) => {
      const e = event as KeyboardEvent;
      const isExpanded = trigger.getAttribute('aria-expanded') === 'true';

      if (e.key === 'Escape') {
        if (isExpanded) closeMenu();
        return;
      }

      if (!isExpanded) {
        if (['Enter', ' '].includes(e.key)) { e.preventDefault(); openMenu(false); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); openMenu('first'); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); openMenu('last'); }
        return;
      }

      if (menuItems.length === 0) return;

      let nextIndex = activeIndex;
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); nextIndex = activeIndex === -1 ? 0 : Math.min(activeIndex + 1, menuItems.length - 1); break;
        case 'ArrowUp': e.preventDefault(); nextIndex = activeIndex === -1 ? menuItems.length - 1 : Math.max(activeIndex - 1, 0); break;
        case 'Home': e.preventDefault(); nextIndex = 0; break;
        case 'End': e.preventDefault(); nextIndex = menuItems.length - 1; break;
        case 'Enter': case ' ': e.preventDefault(); menuItems[activeIndex]?.click(); closeMenu(); return;
      }
      if (nextIndex !== activeIndex) setActiveItem(nextIndex);
    });

    menu.addEventListener('mousemove', (e) => {
      const item = (e.target as HTMLElement).closest('[role^="menuitem"]') as HTMLElement;
      if (item && menuItems.includes(item)) {
        const index = menuItems.indexOf(item);
        if (index !== activeIndex) setActiveItem(index);
      }
    });

    menu.addEventListener('mouseleave', () => setActiveItem(-1));
    menu.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[role^="menuitem"]')) closeMenu();
    });

    document.addEventListener('click', (e) => {
      if (!dropdownEl.contains(e.target as Node)) closeMenu(false);
    });

    document.addEventListener('basecoat:popover', ((e: CustomEvent) => {
      if (e.detail.source !== dropdownEl) closeMenu(false);
    }) as EventListener);
  });

  // Initialize Sidebar
  const sidebar = document.querySelector('.sidebar') as HTMLElement;
  const sidebarToggle = document.getElementById('sidebar-toggle');

  if (sidebar && sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      const isHidden = sidebar.getAttribute('aria-hidden') === 'true';
      sidebar.setAttribute('aria-hidden', isHidden ? 'false' : 'true');
    });

    // Close sidebar on mobile when clicking a link
    sidebar.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth < 768) {
          sidebar.setAttribute('aria-hidden', 'true');
        }
      });
    });
  }
}

// ============================================================================
// APP COMPONENT
// ============================================================================
function App() {
  return (
    <div class="flex min-h-screen">
      {/* Sidebar */}
      <aside id="sidebar" class="sidebar" data-side="left" aria-hidden="false">
        <nav aria-label="Components navigation">
          <header class="p-4 border-b">
            <h1 class="text-lg font-semibold">Basecoat UI</h1>
            <p class="text-sm text-muted-foreground">Component Library</p>
          </header>
          <section class="p-2 overflow-y-auto max-h-[calc(100vh-120px)]">
            <div role="group" aria-labelledby="sidebar-components">
              <h3 id="sidebar-components" class="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Components</h3>
              <ul class="space-y-0.5">
                {SECTIONS.map(section => (
                  <li>
                    <a href={`#${section.id}`} class="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors">
                      <span>{section.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </nav>
      </aside>

      {/* Main Content */}
      <main class="flex-1 min-w-0">
        <header class="bg-background sticky top-0 z-10 flex items-center gap-2 border-b h-14 px-4">
          <button id="sidebar-toggle" type="button" class="btn-icon-ghost size-8 md:hidden" aria-label="Toggle sidebar">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /></svg>
          </button>
          <h2 class="text-lg font-semibold">Kitchen Sink Demo</h2>
        </header>

        <div class="p-6 md:p-8 space-y-12 max-w-4xl">

          {/* ====== BUTTONS ====== */}
          <section id="buttons" class="space-y-4 scroll-mt-20">
            <h2 class="text-2xl font-bold">Buttons</h2>
            <div class="space-y-4">
              <div class="flex flex-wrap gap-2">
                <button class="btn">Primary</button>
                <button class="btn-secondary">Secondary</button>
                <button class="btn-destructive">Destructive</button>
                <button class="btn-outline">Outline</button>
                <button class="btn-ghost">Ghost</button>
                <button class="btn-link">Link</button>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <button class="btn-sm">Small</button>
                <button class="btn">Default</button>
                <button class="btn-lg">Large</button>
                <button class="btn-icon-outline" aria-label="Settings">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3" /><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /></svg>
                </button>
              </div>
              <div role="group" class="button-group">
                <button type="button" class="btn-outline">Archive</button>
                <button type="button" class="btn-outline">Report</button>
                <button type="button" class="btn-outline">Delete</button>
              </div>
            </div>
          </section>

          <Separator />

          {/* ====== BADGES ====== */}
          <section id="badges" class="space-y-4 scroll-mt-20">
            <h2 class="text-2xl font-bold">Badges</h2>
            <div class="flex flex-wrap gap-2">
              <span class="badge">Primary</span>
              <span class="badge-secondary">Secondary</span>
              <span class="badge-destructive">Destructive</span>
              <span class="badge-outline">Outline</span>
            </div>
          </section>

          <Separator />

          {/* ====== ALERTS ====== */}
          <section id="alerts" class="space-y-4 scroll-mt-20">
            <h2 class="text-2xl font-bold">Alerts</h2>
            <div class="grid gap-4 max-w-xl">
              <div class="alert">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
                <h2>Success!</h2>
                <section>Your changes have been saved.</section>
              </div>
              <div class="alert-destructive">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
                <h2>Error</h2>
                <section>Something went wrong.</section>
              </div>
            </div>
          </section>

          <Separator />

          {/* ====== CARDS ====== */}
          <section id="cards" class="space-y-4 scroll-mt-20">
            <h2 class="text-2xl font-bold">Cards</h2>
            <div class="card max-w-sm">
              <header>
                <h2>Card Title</h2>
                <p>Card description goes here</p>
              </header>
              <section>
                <p>This is the card content area.</p>
              </section>
              <footer>
                <button class="btn-sm">Action</button>
              </footer>
            </div>
          </section>

          <Separator />

          {/* ====== FORM ELEMENTS ====== */}
          <section id="form-elements" class="space-y-4 scroll-mt-20">
            <h2 class="text-2xl font-bold">Form Elements</h2>
            <form class="form max-w-md grid gap-6">
              <div class="grid gap-3">
                <label for="input-demo">Input</label>
                <input type="text" id="input-demo" placeholder="Enter text..." />
              </div>
              <div class="grid gap-3">
                <label for="textarea-demo">Textarea</label>
                <textarea id="textarea-demo" placeholder="Enter message..."></textarea>
              </div>
              <div class="flex items-center gap-2">
                <input type="checkbox" id="checkbox-demo" />
                <label for="checkbox-demo">Checkbox</label>
              </div>
              <div class="flex items-center gap-2">
                <input type="checkbox" role="switch" id="switch-demo" />
                <label for="switch-demo">Switch</label>
              </div>
              <fieldset class="grid gap-3">
                <legend class="text-sm font-medium">Radio Group</legend>
                <div class="flex items-center gap-2">
                  <input type="radio" name="radio-demo" id="radio1" value="option1" />
                  <label for="radio1">Option 1</label>
                </div>
                <div class="flex items-center gap-2">
                  <input type="radio" name="radio-demo" id="radio2" value="option2" />
                  <label for="radio2">Option 2</label>
                </div>
              </fieldset>
              <div class="grid gap-3">
                <label>Slider</label>
                <Slider min={0} max={100} value={50} />
              </div>
            </form>
          </section>

          <Separator />

          {/* ====== ACCORDION ====== */}
          <section id="accordion" class="space-y-4 scroll-mt-20">
            <h2 class="text-2xl font-bold">Accordion</h2>
            <section class="accordion max-w-md">
              <details class="group border-b">
                <summary class="w-full py-4 cursor-pointer">
                  <h2 class="flex items-center justify-between text-sm font-medium">
                    Is it accessible?
                    <svg class="size-4 transition-transform group-open:rotate-180" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg>
                  </h2>
                </summary>
                <section class="pb-4 text-sm text-muted-foreground">Yes. It adheres to the WAI-ARIA design pattern.</section>
              </details>
              <details class="group border-b">
                <summary class="w-full py-4 cursor-pointer">
                  <h2 class="flex items-center justify-between text-sm font-medium">
                    Is it styled?
                    <svg class="size-4 transition-transform group-open:rotate-180" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg>
                  </h2>
                </summary>
                <section class="pb-4 text-sm text-muted-foreground">Yes. It comes with default styles.</section>
              </details>
            </section>
          </section>

          <Separator />

          {/* ====== AVATAR ====== */}
          <section id="avatar" class="space-y-4 scroll-mt-20">
            <h2 class="text-2xl font-bold">Avatar</h2>
            <div class="flex items-center gap-4">
              <img class="size-8 rounded-full object-cover" alt="User" src="https://github.com/shadcn.png" />
              <img class="size-10 rounded-lg object-cover" alt="User" src="https://github.com/hunvreus.png" />
              <div class="flex -space-x-2 [&_img]:ring-2 [&_img]:ring-background">
                <img class="size-8 rounded-full object-cover" alt="User" src="https://github.com/shadcn.png" />
                <img class="size-8 rounded-full object-cover" alt="User" src="https://github.com/hunvreus.png" />
              </div>
            </div>
          </section>

          <Separator />

          {/* ====== TABLE ====== */}
          <section id="table" class="space-y-4 scroll-mt-20">
            <h2 class="text-2xl font-bold">Table</h2>
            <div class="overflow-x-auto">
              <table class="table">
                <caption>A list of invoices.</caption>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Status</th>
                    <th>Method</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td class="font-medium">INV001</td><td>Paid</td><td>Credit Card</td><td class="text-right">$250.00</td></tr>
                  <tr><td class="font-medium">INV002</td><td>Pending</td><td>PayPal</td><td class="text-right">$150.00</td></tr>
                  <tr><td class="font-medium">INV003</td><td>Unpaid</td><td>Bank Transfer</td><td class="text-right">$350.00</td></tr>
                </tbody>
                <tfoot>
                  <tr><td colSpan={3}>Total</td><td class="text-right">$750.00</td></tr>
                </tfoot>
              </table>
            </div>
          </section>

          <Separator />

          {/* ====== TABS ====== */}
          <section id="tabs" class="space-y-4 scroll-mt-20">
            <h2 class="text-2xl font-bold">Tabs</h2>
            <div class="tabs w-full max-w-md">
              <nav role="tablist" aria-orientation="horizontal">
                <button type="button" role="tab" id="tabs-demo-tab-1" aria-controls="tabs-demo-panel-1" aria-selected="true" tabIndex={0}>Account</button>
                <button type="button" role="tab" id="tabs-demo-tab-2" aria-controls="tabs-demo-panel-2" aria-selected="false" tabIndex={-1}>Password</button>
              </nav>
              <div role="tabpanel" id="tabs-demo-panel-1" aria-labelledby="tabs-demo-tab-1" tabIndex={-1} aria-selected="true">
                <div class="card mt-2">
                  <header><h2>Account</h2><p>Make changes to your account here.</p></header>
                  <section>
                    <form class="form grid gap-4">
                      <div class="grid gap-2">
                        <label for="tabs-name">Name</label>
                        <input type="text" id="tabs-name" value="Pedro Duarte" />
                      </div>
                      <div class="grid gap-2">
                        <label for="tabs-username">Username</label>
                        <input type="text" id="tabs-username" value="@peduarte" />
                      </div>
                    </form>
                  </section>
                  <footer><button class="btn">Save changes</button></footer>
                </div>
              </div>
              <div role="tabpanel" id="tabs-demo-panel-2" aria-labelledby="tabs-demo-tab-2" tabIndex={-1} aria-selected="false" hidden>
                <div class="card mt-2">
                  <header><h2>Password</h2><p>Change your password here.</p></header>
                  <section>
                    <form class="form grid gap-4">
                      <div class="grid gap-2">
                        <label for="tabs-current-password">Current password</label>
                        <input type="password" id="tabs-current-password" autoComplete="current-password" />
                      </div>
                      <div class="grid gap-2">
                        <label for="tabs-new-password">New password</label>
                        <input type="password" id="tabs-new-password" autoComplete="new-password" />
                      </div>
                    </form>
                  </section>
                  <footer><button class="btn">Save password</button></footer>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* ====== DIALOG ====== */}
          <section id="dialog" class="space-y-4 scroll-mt-20">
            <h2 class="text-2xl font-bold">Dialog</h2>
            <div class="flex gap-4">
              <button class="btn-outline" onClick={() => (document.getElementById('demo-dialog') as HTMLDialogElement)?.showModal()}>
                Open Dialog
              </button>
              <dialog id="demo-dialog" class="dialog" aria-labelledby="dialog-title" onClick={(e) => { if ((e.target as HTMLElement).tagName === 'DIALOG') (e.target as HTMLDialogElement).close(); }}>
                <article>
                  <header>
                    <h2 id="dialog-title">Are you sure?</h2>
                    <p>This action cannot be undone.</p>
                  </header>
                  <footer>
                    <button class="btn-outline" onClick={() => (document.getElementById('demo-dialog') as HTMLDialogElement)?.close()}>Cancel</button>
                    <button class="btn" onClick={() => (document.getElementById('demo-dialog') as HTMLDialogElement)?.close()}>Continue</button>
                  </footer>
                </article>
              </dialog>
            </div>
          </section>

          <Separator />

          {/* ====== POPOVER ====== */}
          <section id="popover" class="space-y-4 scroll-mt-20">
            <h2 class="text-2xl font-bold">Popover</h2>
            <div id="demo-popover" class="popover">
              <button id="demo-popover-trigger" type="button" aria-expanded="false" aria-controls="demo-popover-popover" class="btn-outline">Open popover</button>
              <div id="demo-popover-popover" data-popover aria-hidden="true" class="w-80">
                <div class="grid gap-4">
                  <header class="grid gap-1.5">
                    <h4 class="leading-none font-medium">Dimensions</h4>
                    <p class="text-muted-foreground text-sm">Set the dimensions for the layer.</p>
                  </header>
                  <form class="form grid gap-2">
                    <div class="grid grid-cols-3 items-center gap-4">
                      <label for="popover-width">Width</label>
                      <input type="text" id="popover-width" value="100%" class="col-span-2 h-8" />
                    </div>
                    <div class="grid grid-cols-3 items-center gap-4">
                      <label for="popover-height">Height</label>
                      <input type="text" id="popover-height" value="25px" class="col-span-2 h-8" />
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* ====== DROPDOWN MENU ====== */}
          <section id="dropdown-menu" class="space-y-4 scroll-mt-20">
            <h2 class="text-2xl font-bold">Dropdown Menu</h2>
            <div id="demo-dropdown-menu" class="dropdown-menu">
              <button id="demo-dropdown-menu-trigger" type="button" aria-haspopup="menu" aria-controls="demo-dropdown-menu-menu" aria-expanded="false" class="btn-outline">
                Open Menu
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg>
              </button>
              <div id="demo-dropdown-menu-popover" data-popover aria-hidden="true">
                <div role="menu" id="demo-dropdown-menu-menu" aria-labelledby="demo-dropdown-menu-trigger">
                  <div role="group" aria-labelledby="my-account-label">
                    <div role="heading" id="my-account-label">My Account</div>
                    <div role="menuitem" id="menu-item-profile">Profile <span class="text-muted-foreground ml-auto text-xs">⇧⌘P</span></div>
                    <div role="menuitem" id="menu-item-billing">Billing <span class="text-muted-foreground ml-auto text-xs">⌘B</span></div>
                    <div role="menuitem" id="menu-item-settings">Settings <span class="text-muted-foreground ml-auto text-xs">⌘S</span></div>
                  </div>
                  <hr role="separator" />
                  <div role="menuitem" id="menu-item-logout">Logout</div>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* ====== BREADCRUMB ====== */}
          <section id="breadcrumb" class="space-y-4 scroll-mt-20">
            <h2 class="text-2xl font-bold">Breadcrumb</h2>
            <ol class="text-muted-foreground flex items-center gap-1.5 text-sm">
              <li><a href="#" class="hover:text-foreground">Home</a></li>
              <li><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6" /></svg></li>
              <li><a href="#" class="hover:text-foreground">Components</a></li>
              <li><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6" /></svg></li>
              <li class="text-foreground font-medium">Breadcrumb</li>
            </ol>
          </section>

          <Separator />

          {/* ====== SPINNER ====== */}
          <section id="spinner" class="space-y-4 scroll-mt-20">
            <h2 class="text-2xl font-bold">Spinner</h2>
            <div class="flex items-center gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-spin" role="status" aria-label="Loading">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <span class="text-sm text-muted-foreground">Loading...</span>
            </div>
            <button class="btn" disabled>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-spin" role="status" aria-label="Loading">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Processing...
            </button>
          </section>

          <Separator />

          {/* ====== SKELETON ====== */}
          <section id="skeleton" class="space-y-4 scroll-mt-20">
            <h2 class="text-2xl font-bold">Skeleton</h2>
            <div class="flex items-center gap-4">
              <div class="bg-accent animate-pulse size-10 rounded-full"></div>
              <div class="grid gap-2">
                <div class="bg-accent animate-pulse rounded-md h-4 w-[150px]"></div>
                <div class="bg-accent animate-pulse rounded-md h-4 w-[100px]"></div>
              </div>
            </div>
          </section>

          <Separator />

          {/* ====== TOOLTIP ====== */}
          <section id="tooltip" class="space-y-4 scroll-mt-20">
            <h2 class="text-2xl font-bold">Tooltip</h2>
            <button class="btn-outline" data-tooltip="This is a tooltip" data-side="top">Hover me</button>
          </section>

          <Separator />

          {/* ====== KBD ====== */}
          <section id="kbd" class="space-y-4 scroll-mt-20">
            <h2 class="text-2xl font-bold">Keyboard Shortcut</h2>
            <div class="flex items-center gap-2">
              <span>Press</span>
              <kbd class="kbd">⌘</kbd>
              <kbd class="kbd">K</kbd>
              <span>to search</span>
            </div>
          </section>

          <Separator />

          {/* ====== TOAST ====== */}
          <section id="toast" class="space-y-4 scroll-mt-20">
            <h2 class="text-2xl font-bold">Toast</h2>
            <div class="flex flex-wrap gap-2">
              <button class="btn" onClick={() => toast({ category: 'success', title: 'Success!', description: 'Your changes have been saved.' })}>Success Toast</button>
              <button class="btn-destructive" onClick={() => toast({ category: 'error', title: 'Error!', description: 'Something went wrong.' })}>Error Toast</button>
              <button class="btn-outline" onClick={() => toast({ category: 'info', title: 'Info', description: 'Here is some information.' })}>Info Toast</button>
            </div>
          </section>

        </div>
      </main>

      <Toaster />
    </div>
  );
}

// Render and initialize
render(<App />, $("#app"));

// Initialize Basecoat JS behaviors after DOM is ready
requestAnimationFrame(() => {
  initBasecoatComponents();
});
