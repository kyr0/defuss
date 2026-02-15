import type { FC } from "defuss";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Kbd,
} from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const DropdownMenuScreen: FC = () => {
  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold tracking-tight">Dropdown Menu</h1>
      <p class="text-lg text-muted-foreground">Displays a menu to the user.</p>

      <CodePreview
        code={`<DropdownMenu>
  <DropdownMenuTrigger className="btn-outline">Open</DropdownMenuTrigger>
    <DropdownMenuContent id="demo-dropdown-menu-popover" className="min-w-56">
        <div role="menu" id="demo-dropdown-menu-menu" aria-labelledby="demo-dropdown-menu-trigger">
        <div role="group" aria-labelledby="account-options">
                    <div role="heading" id="account-options">My Account</div>
                    <DropdownMenuItem>
                        Profile
                        <Kbd className="text-muted-foreground ml-auto text-xs tracking-widest bg-transparent">⇧⌘P</Kbd>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        Billing
                        <Kbd className="text-muted-foreground ml-auto text-xs tracking-widest bg-transparent">⌘B</Kbd>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        Settings
                        <Kbd className="text-muted-foreground ml-auto text-xs tracking-widest bg-transparent">⌘S</Kbd>
                    </DropdownMenuItem>
        </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>GitHub</DropdownMenuItem>
            <DropdownMenuItem disabled>API</DropdownMenuItem>
        </div>
  </DropdownMenuContent>
</DropdownMenu>`}
        language="tsx"
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            id="demo-dropdown-menu-trigger"
            className="btn-outline"
          >
            Open
          </DropdownMenuTrigger>
          <DropdownMenuContent
            id="demo-dropdown-menu-popover"
            className="min-w-56"
          >
            <div role="group" aria-labelledby="account-options">
              <div role="heading" id="account-options">
                My Account
              </div>
              <DropdownMenuItem>
                Profile
                <Kbd className="text-muted-foreground ml-auto text-xs tracking-widest bg-transparent">
                  ⇧⌘P
                </Kbd>
              </DropdownMenuItem>
              <DropdownMenuItem>
                Billing
                <Kbd className="text-muted-foreground ml-auto text-xs tracking-widest bg-transparent">
                  ⌘B
                </Kbd>
              </DropdownMenuItem>
              <DropdownMenuItem>
                Settings
                <Kbd className="text-muted-foreground ml-auto text-xs tracking-widest bg-transparent">
                  ⌘S
                </Kbd>
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>GitHub</DropdownMenuItem>
            <DropdownMenuItem disabled>API</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CodePreview>

      <CodePreview
        code={`<DropdownMenu>
  <DropdownMenuTrigger className="btn-outline">Open</DropdownMenuTrigger>
  <DropdownMenuContent id="dropdown-menu-checkboxes-popover" className="min-w-56">
    <div role="menu" id="dropdown-menu-checkboxes-menu" aria-labelledby="dropdown-menu-checkboxes-trigger">
      <div role="group" aria-labelledby="account-options">
        <div role="heading" id="account-options">Account Options</div>
        <DropdownMenuItem>
          <svg className="size-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem>
          <svg className="size-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Billing
        </DropdownMenuItem>
        <DropdownMenuItem>
          <svg className="size-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </DropdownMenuItem>
      </div>
      <DropdownMenuSeparator />
      <div role="group" aria-labelledby="appearance-options">
        <div role="heading" id="appearance-options">Appearance</div>
        <DropdownMenuItem role="menuitemcheckbox" data-checked="true">
          <label className="flex w-full items-center gap-2 cursor-pointer">
            <input type="checkbox" className="checkbox checkbox-xs" checked />
            <span>Status Bar</span>
          </label>
        </DropdownMenuItem>
        <DropdownMenuItem role="menuitemcheckbox" disabled>
          <label className="flex w-full items-center gap-2 cursor-not-allowed opacity-60">
            <input type="checkbox" className="checkbox checkbox-xs" disabled />
            <span>Activity Bar</span>
          </label>
        </DropdownMenuItem>
        <DropdownMenuItem role="menuitemcheckbox">
          <label className="flex w-full items-center gap-2 cursor-pointer">
            <input type="checkbox" className="checkbox checkbox-xs" />
            <span>Panel</span>
          </label>
        </DropdownMenuItem>
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem>
        <svg className="size-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Logout
      </DropdownMenuItem>
    </div>
  </DropdownMenuContent>
</DropdownMenu>`}
        language="tsx"
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            id="dropdown-menu-checkboxes-trigger"
            className="btn-outline"
          >
            Checkboxes Menu
          </DropdownMenuTrigger>
          <DropdownMenuContent
            id="dropdown-menu-checkboxes-popover"
            className="min-w-56"
          >
            <div
              role="menu"
              id="dropdown-menu-checkboxes-menu"
              aria-labelledby="dropdown-menu-checkboxes-trigger"
            >
              <div role="group" aria-labelledby="account-options">
                <div role="heading" id="account-options">
                  Account Options
                </div>
                <DropdownMenuItem>
                  <svg
                    className="size-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <svg
                    className="size-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  Billing
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <svg
                    className="size-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Settings
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator />
              <div role="group" aria-labelledby="appearance-options">
                <div role="heading" id="appearance-options">
                  Appearance
                </div>
                <DropdownMenuItem role="menuitemcheckbox" data-checked="true">
                  <label class="flex w-full items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      class="checkbox checkbox-xs"
                      checked
                    />
                    <span>Status Bar</span>
                  </label>
                </DropdownMenuItem>
                <DropdownMenuItem role="menuitemcheckbox" disabled>
                  <label class="flex w-full items-center gap-2 cursor-not-allowed opacity-60">
                    <input
                      type="checkbox"
                      class="checkbox checkbox-xs"
                      disabled
                    />
                    <span>Activity Bar</span>
                  </label>
                </DropdownMenuItem>
                <DropdownMenuItem role="menuitemcheckbox">
                  <label class="flex w-full items-center gap-2 cursor-pointer">
                    <input type="checkbox" class="checkbox checkbox-xs" />
                    <span>Panel</span>
                  </label>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <svg
                  className="size-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Logout
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </CodePreview>

      <CodePreview
        code={`<DropdownMenu>
  <DropdownMenuTrigger className="btn-outline">Open</DropdownMenuTrigger>
  <DropdownMenuContent id="dropdown-menu-radio-popover" className="min-w-56">
    <div role="menu" id="dropdown-menu-radio-menu" aria-labelledby="dropdown-menu-radio-trigger">
      <div role="group" aria-labelledby="position-options">
        <div role="heading" id="position-options">Panel Position</div>
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem role="menuitemradio" data-checked="true">
        <label className="flex w-full items-center gap-2 cursor-pointer">
          <input type="radio" name="panel-position" className="radio radio-xs" checked />
          <span>Status Bar</span>
        </label>
      </DropdownMenuItem>
      <DropdownMenuItem role="menuitemradio" disabled>
        <label className="flex w-full items-center gap-2 cursor-not-allowed opacity-60">
          <input type="radio" name="panel-position" className="radio radio-xs" disabled />
          <span>Activity Bar</span>
        </label>
      </DropdownMenuItem>
      <DropdownMenuItem role="menuitemradio">
        <label className="flex w-full items-center gap-2 cursor-pointer">
          <input type="radio" name="panel-position" className="radio radio-xs" />
          <span>Panel</span>
        </label>
      </DropdownMenuItem>
    </div>
  </DropdownMenuContent>
</DropdownMenu>`}
        language="tsx"
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            id="dropdown-menu-radio-trigger"
            className="btn-outline"
          >
            Radio Group Menu
          </DropdownMenuTrigger>
          <DropdownMenuContent
            id="dropdown-menu-radio-popover"
            className="min-w-56"
          >
            <div
              role="menu"
              id="dropdown-menu-radio-menu"
              aria-labelledby="dropdown-menu-radio-trigger"
            >
              <div role="group" aria-labelledby="position-options">
                <div role="heading" id="position-options">
                  Panel Position
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem role="menuitemradio" data-checked="true">
                <label class="flex w-full items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="panel-position"
                    class="radio radio-xs"
                    checked
                  />
                  <span>Status Bar</span>
                </label>
              </DropdownMenuItem>
              <DropdownMenuItem role="menuitemradio" disabled>
                <label class="flex w-full items-center gap-2 cursor-not-allowed opacity-60">
                  <input
                    type="radio"
                    name="panel-position"
                    class="radio radio-xs"
                    disabled
                  />
                  <span>Activity Bar</span>
                </label>
              </DropdownMenuItem>
              <DropdownMenuItem role="menuitemradio">
                <label class="flex w-full items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="panel-position"
                    class="radio radio-xs"
                  />
                  <span>Panel</span>
                </label>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </CodePreview>

      <CodePreview
        code={`<DropdownMenu>
  <DropdownMenuTrigger className="btn-outline">Open</DropdownMenuTrigger>
  <DropdownMenuContent id="dropdown-menu-disabled-popover" className="min-w-56">
    <div role="menu" id="dropdown-menu-disabled-menu" aria-labelledby="dropdown-menu-disabled-trigger">
      <DropdownMenuItem>Enabled Item</DropdownMenuItem>
      <DropdownMenuItem disabled>Disabled Item</DropdownMenuItem>
      <DropdownMenuItem>Another Enabled</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem disabled>Completely Disabled</DropdownMenuItem>
    </div>
  </DropdownMenuContent>
</DropdownMenu>`}
        language="tsx"
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            id="dropdown-menu-disabled-trigger"
            className="btn-outline"
          >
            Disabled Items
          </DropdownMenuTrigger>
          <DropdownMenuContent
            id="dropdown-menu-disabled-popover"
            className="min-w-56"
          >
            <div
              role="menu"
              id="dropdown-menu-disabled-menu"
              aria-labelledby="dropdown-menu-disabled-trigger"
            >
              <DropdownMenuItem>Enabled Item</DropdownMenuItem>
              <DropdownMenuItem disabled>Disabled Item</DropdownMenuItem>
              <DropdownMenuItem>Another Enabled</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>Completely Disabled</DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </CodePreview>

      <CodePreview
        code={`<DropdownMenu>
  <DropdownMenuTrigger className="btn-outline">Open</DropdownMenuTrigger>
  <DropdownMenuContent id="dropdown-menu-icons-popover" className="min-w-56">
    <div role="menu" id="dropdown-menu-icons-menu" aria-labelledby="dropdown-menu-icons-trigger">
      <DropdownMenuItem>
        <svg className="size-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Settings
      </DropdownMenuItem>
      <DropdownMenuItem>
        <svg className="size-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        Billing
      </DropdownMenuItem>
      <DropdownMenuItem>
        <svg className="size-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Logout
      </DropdownMenuItem>
    </div>
  </DropdownMenuContent>
</DropdownMenu>`}
        language="tsx"
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            id="dropdown-menu-icons-trigger"
            className="btn-outline"
          >
            Menu With Icons
          </DropdownMenuTrigger>
          <DropdownMenuContent
            id="dropdown-menu-icons-popover"
            className="min-w-56"
          >
            <div
              role="menu"
              id="dropdown-menu-icons-menu"
              aria-labelledby="dropdown-menu-icons-trigger"
            >
              <DropdownMenuItem>
                <svg
                  className="size-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <svg
                  className="size-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <svg
                  className="size-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Logout
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </CodePreview>

      <CodePreview
        code={`<DropdownMenu>
  <DropdownMenuTrigger className="btn-outline">Open</DropdownMenuTrigger>
  <DropdownMenuContent id="dropdown-menu-right-align-popover" className="min-w-56" data-align="end">
    <div role="menu" id="dropdown-menu-right-align-menu" aria-labelledby="dropdown-menu-right-align-trigger">
      <DropdownMenuItem>Profile</DropdownMenuItem>
      <DropdownMenuItem>Billing</DropdownMenuItem>
      <DropdownMenuItem>Settings</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem>GitHub</DropdownMenuItem>
      <DropdownMenuItem>API</DropdownMenuItem>
    </div>
  </DropdownMenuContent>
</DropdownMenu>`}
        language="tsx"
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            id="dropdown-menu-right-align-trigger"
            className="btn-outline"
          >
            Right-Aligned Menu
          </DropdownMenuTrigger>
          <DropdownMenuContent
            id="dropdown-menu-right-align-popover"
            className="min-w-56"
            data-align="end"
          >
            <div
              role="menu"
              id="dropdown-menu-right-align-menu"
              aria-labelledby="dropdown-menu-right-align-trigger"
            >
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Billing</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>GitHub</DropdownMenuItem>
              <DropdownMenuItem>API</DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </CodePreview>

      <CodePreview
        code={`<div class="flex items-center justify-center space-x-4">
  <DropdownMenu>
    <DropdownMenuTrigger className="btn-outline">Bottom (default)</DropdownMenuTrigger>
    <DropdownMenuContent id="dropdown-menu-side-bottom-popover" className="min-w-56">
      <div role="menu" id="dropdown-menu-side-bottom-menu" aria-labelledby="dropdown-menu-side-bottom-trigger">
        <DropdownMenuItem>Item 1</DropdownMenuItem>
        <DropdownMenuItem>Item 2</DropdownMenuItem>
      </div>
    </DropdownMenuContent>
  </DropdownMenu>

  <DropdownMenu>
    <DropdownMenuTrigger className="btn-outline">Top</DropdownMenuTrigger>
    <DropdownMenuContent id="dropdown-menu-side-top-popover" className="min-w-56" data-side="top">
      <div role="menu" id="dropdown-menu-side-top-menu" aria-labelledby="dropdown-menu-side-top-trigger">
        <DropdownMenuItem>Item 1</DropdownMenuItem>
        <DropdownMenuItem>Item 2</DropdownMenuItem>
      </div>
    </DropdownMenuContent>
  </DropdownMenu>

  <DropdownMenu>
    <DropdownMenuTrigger className="btn-outline">Left</DropdownMenuTrigger>
    <DropdownMenuContent id="dropdown-menu-side-left-popover" className="min-w-56" data-side="left">
      <div role="menu" id="dropdown-menu-side-left-menu" aria-labelledby="dropdown-menu-side-left-trigger">
        <DropdownMenuItem>Item 1</DropdownMenuItem>
        <DropdownMenuItem>Item 2</DropdownMenuItem>
      </div>
    </DropdownMenuContent>
  </DropdownMenu>

  <DropdownMenu>
    <DropdownMenuTrigger className="btn-outline">Right</DropdownMenuTrigger>
    <DropdownMenuContent id="dropdown-menu-side-right-popover" className="min-w-56" data-side="right">
      <div role="menu" id="dropdown-menu-side-right-menu" aria-labelledby="dropdown-menu-side-right-trigger">
        <DropdownMenuItem>Item 1</DropdownMenuItem>
        <DropdownMenuItem>Item 2</DropdownMenuItem>
      </div>
    </DropdownMenuContent>
  </DropdownMenu>
</div>`}
        language="tsx"
      >
        <div class="flex items-center justify-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger
              id="dropdown-menu-side-bottom-trigger"
              className="btn-outline"
            >
              Bottom (default)
            </DropdownMenuTrigger>
            <DropdownMenuContent
              id="dropdown-menu-side-bottom-popover"
              className="min-w-56"
            >
              <div
                role="menu"
                id="dropdown-menu-side-bottom-menu"
                aria-labelledby="dropdown-menu-side-bottom-trigger"
              >
                <DropdownMenuItem>Item 1</DropdownMenuItem>
                <DropdownMenuItem>Item 2</DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger
              id="dropdown-menu-side-top-trigger"
              className="btn-outline"
            >
              Top
            </DropdownMenuTrigger>
            <DropdownMenuContent
              id="dropdown-menu-side-top-popover"
              className="min-w-56"
              data-side="top"
            >
              <div
                role="menu"
                id="dropdown-menu-side-top-menu"
                aria-labelledby="dropdown-menu-side-top-trigger"
              >
                <DropdownMenuItem>Item 1</DropdownMenuItem>
                <DropdownMenuItem>Item 2</DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger
              id="dropdown-menu-side-left-trigger"
              className="btn-outline"
            >
              Left
            </DropdownMenuTrigger>
            <DropdownMenuContent
              id="dropdown-menu-side-left-popover"
              className="min-w-56"
              data-side="left"
            >
              <div
                role="menu"
                id="dropdown-menu-side-left-menu"
                aria-labelledby="dropdown-menu-side-left-trigger"
              >
                <DropdownMenuItem>Item 1</DropdownMenuItem>
                <DropdownMenuItem>Item 2</DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger
              id="dropdown-menu-side-right-trigger"
              className="btn-outline"
            >
              Right
            </DropdownMenuTrigger>
            <DropdownMenuContent
              id="dropdown-menu-side-right-popover"
              className="min-w-56"
              data-side="right"
            >
              <div
                role="menu"
                id="dropdown-menu-side-right-menu"
                aria-labelledby="dropdown-menu-side-right-trigger"
              >
                <DropdownMenuItem>Item 1</DropdownMenuItem>
                <DropdownMenuItem>Item 2</DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CodePreview>

      <CodePreview
        code={`<DropdownMenu>
  <DropdownMenuTrigger className="btn-outline">Open</DropdownMenuTrigger>
  <DropdownMenuContent id="dropdown-menu-nested-popover" className="min-w-56">
    <div role="menu" id="dropdown-menu-nested-menu" aria-labelledby="dropdown-menu-nested-trigger">
      <DropdownMenuItem>File</DropdownMenuItem>
      <DropdownMenuItem>Edit</DropdownMenuItem>
      <div role="group" aria-labelledby="view-group-heading">
        <div role="heading" id="view-group-heading">View</div>
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full flex items-center justify-between px-2 py-1.5 text-sm">
            <span>Zoom</span>
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-48">
            <div role="menu">
              <DropdownMenuItem>Zoom In</DropdownMenuItem>
              <DropdownMenuItem>Zoom Out</DropdownMenuItem>
              <DropdownMenuItem>Reset Zoom</DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem>Help</DropdownMenuItem>
    </div>
  </DropdownMenuContent>
</DropdownMenu>`}
        language="tsx"
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            id="dropdown-menu-nested-trigger"
            className="btn-outline"
          >
            Nested Menus
          </DropdownMenuTrigger>
          <DropdownMenuContent
            id="dropdown-menu-nested-popover"
            className="min-w-56"
          >
            <div
              role="menu"
              id="dropdown-menu-nested-menu"
              aria-labelledby="dropdown-menu-nested-trigger"
            >
              <DropdownMenuItem>File</DropdownMenuItem>
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <div role="group" aria-labelledby="view-group-heading">
                <div role="heading" id="view-group-heading">
                  View
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger className="w-full flex items-center justify-between px-2 py-1.5 text-sm">
                    <span>Zoom</span>
                    <svg
                      className="size-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="min-w-48">
                    <div role="menu">
                      <DropdownMenuItem>Zoom In</DropdownMenuItem>
                      <DropdownMenuItem>Zoom Out</DropdownMenuItem>
                      <DropdownMenuItem>Reset Zoom</DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Help</DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </CodePreview>
    </div>
  );
};
