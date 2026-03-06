import { Router, type FC } from "defuss";
import {
  Sidebar as SidebarRoot,
  SidebarHeader,
  SidebarFooter,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
} from "defuss-shadcn";
import { Popover, PopoverContent, PopoverTrigger } from "defuss-shadcn";
import { DefussLogo } from "./DefussLogo.js";

type MenuItem = {
  label: string;
  url: string;
  icon?: JSX.Element;
  isExternal?: boolean;
  isNew?: boolean;
};

const iconInfo = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);
const iconTerminal = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="m7 11 2-2-2-2" />
    <path d="M11 13h4" />
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
  </svg>
);
const iconDashboard = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect width="7" height="9" x="3" y="3" rx="1" />
    <rect width="7" height="5" x="14" y="3" rx="1" />
    <rect width="7" height="9" x="14" y="12" rx="1" />
    <rect width="7" height="5" x="3" y="16" rx="1" />
  </svg>
);
const iconGithub = (
  <svg
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

const MenuGroups: Array<{ type: string; label: string; items: MenuItem[] }> = [
  {
    type: "group",
    label: "Getting started",
    items: [
      { label: "Introduction", url: "/introduction", icon: iconInfo },
      { label: "Installation", url: "/installation", icon: iconTerminal },
      { label: "Kitchen sink", url: "/kitchen-sink", icon: iconDashboard },
      {
        label: "GitHub",
        url: "https://github.com/kyr0/defuss",
        icon: iconGithub,
        isExternal: true,
      },
      /*{ label: "Discord", url: "https://basecoatui.com/chat", icon: iconDiscord, isExternal: true },*/
    ],
  },
  {
    type: "group",
    label: "Components",
    items: [
      { label: "Accordion", url: "/components/accordion" },
      { label: "Alert", url: "/components/alert" },
      { label: "Alert Dialog", url: "/components/alert-dialog" },
      { label: "Avatar", url: "/components/avatar" },
      { label: "Badge", url: "/components/badge" },
      { label: "Breadcrumb", url: "/components/breadcrumb" },
      { label: "Button", url: "/components/button" },
      { label: "Button Group", url: "/components/button-group", isNew: true },
      { label: "Card", url: "/components/card" },
      { label: "Checkbox", url: "/components/checkbox" },
      { label: "Command", url: "/components/command" },
      { label: "Combobox", url: "/components/combobox" },
      { label: "Dialog", url: "/components/dialog" },
      { label: "Dropdown Menu", url: "/components/dropdown-menu" },
      { label: "Empty", url: "/components/empty", isNew: true },
      { label: "Field", url: "/components/field", isNew: true },
      { label: "Form", url: "/components/form" },
      { label: "Drop Area", url: "/components/drop-area", isNew: true },
      { label: "Input Group", url: "/components/input-group", isNew: true },
      { label: "Item", url: "/components/item", isNew: true },
      { label: "Kbd", url: "/components/kbd", isNew: true },
      { label: "Label", url: "/components/label" },
      { label: "Pagination", url: "/components/pagination", isNew: true },
      { label: "Popover", url: "/components/popover" },
      { label: "Progress", url: "/components/progress", isNew: true },
      { label: "Radio Group", url: "/components/radio-group" },
      { label: "Select", url: "/components/select" },
      { label: "Separator", url: "/components/separator" },
      { label: "Scrollable", url: "/components/scrollable", isNew: true },
      { label: "Sidebar", url: "/components/sidebar" },
      { label: "Skeleton", url: "/components/skeleton" },
      { label: "Slider", url: "/components/slider" },
      { label: "Spinner", url: "/components/spinner", isNew: true },
      { label: "Switch", url: "/components/switch" },
      { label: "Table", url: "/components/table" },
      { label: "Tabs", url: "/components/tabs" },
      { label: "Textarea", url: "/components/textarea" },
      { label: "Toast", url: "/components/toast" },
      { label: "Tooltip", url: "/components/tooltip" },
      { label: "Tree View", url: "/components/tree-view", isNew: true },
      {
        label: "Theme Switcher",
        url: "/components/theme-switcher",
        isNew: true,
      },
    ],
  },
];

export const Sidebar: FC = () => {
  return (
    <SidebarRoot id="sidebar">
      <SidebarHeader>
        <a
          href="/"
          class="btn-ghost p-2 h-12 w-full flex justify-start items-center gap-2"
        >
          <div class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <DefussLogo />
          </div>
          <div class="grid flex-1 text-left text-sm leading-tight">
            <span class="truncate font-medium">defuss-shadcn</span>
            <span class="truncate text-xs">v0.0.1</span>
          </div>
        </a>
      </SidebarHeader>
      <SidebarContent className="scrollbar [&_[data-new-link]::after]:content-['New'] [&_[data-new-link]::after]:ml-auto [&_[data-new-link]::after]:text-xs [&_[data-new-link]::after]:font-medium [&_[data-new-link]::after]:bg-sidebar-primary [&_[data-new-link]::after]:text-sidebar-primary-foreground [&_[data-new-link]::after]:px-2 [&_[data-new-link]::after]:py-0.5 [&_[data-new-link]::after]:rounded-md">
        {MenuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              {group.label}
            </SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={`${group.label}-${item.label}`}>
                  <SidebarMenuButton
                    href={item.url}
                    target={item.isExternal ? "_blank" : undefined}
                    rel={item.isExternal ? "noopener noreferrer" : undefined}
                    data-new-link={item.isNew ? "true" : undefined}
                    onClick={(event) => {
                      if (item.isExternal) {
                        return;
                      }
                      event.preventDefault();
                      Router.navigate(item.url);
                    }}
                  >
                    {item.icon && (
                      <span class="[&_svg]:size-4">{item.icon}</span>
                    )}
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <Popover id="sidebar-footer-popover">
          <PopoverTrigger
            className="btn-ghost p-2 h-12 w-full flex items-center justify-start gap-2"
            data-keep-mobile-sidebar-open=""
          >
            <img
              aria-label="Aron Homberg's GitHub profile picture"
              src="https://github.com/kyr0.png"
              class="rounded-lg shrink-0 size-8"
            />
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-medium">Aron Homberg</span>
              <span class="truncate text-xs">@kyr0</span>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="lucide lucide-chevrons-up-down"
            >
              <path d="m7 15 5 5 5-5" />
              <path d="m7 9 5-5 5 5" />
            </svg>
          </PopoverTrigger>
          <PopoverContent
            className="w-[271px] md:w-[239px]"
            data-side="top"
            data-align="end"
          >
            <div class="grid gap-4">
              <header class="grid gap-1.5">
                <h2 class="font-semibold">❤️ I hope you like defuss!</h2>
                <p class="text-muted-foreground text-sm">
                  My name is{" "}
                  <a
                    href="https://aron-homberg.de"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="underline underline-offset-4"
                  >
                    Aron
                  </a>{" "}
                  and I made this (and{" "}
                  <a
                    class="underline underline-offset-4"
                    href="https://github.com/kyr0"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    many other things
                  </a>
                  ). If you find it useful, please star the <b>defuss</b>{" "}
                  repository and consider sponsoring me on GitHub.
                </p>
              </header>
              <footer class="grid gap-2">
                <a
                  href="https://github.com/sponsors/kyr0"
                  class="btn-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Sponsor me on GitHub
                </a>
              </footer>
            </div>
          </PopoverContent>
        </Popover>
      </SidebarFooter>
    </SidebarRoot>
  );
};
