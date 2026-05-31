import { Reactive, createStore, type FC } from "defuss";
import {
  Badge,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ToggleButton,
} from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

const filterStore = createStore({ value: "filter1" });

// Multi-selection mode stores (each mode tracks its own active toggles independently)
const mode1Store = createStore<string[]>([]);
const mode2Store = createStore<string[]>([]);

const toggleInStore = (store: ReturnType<typeof createStore<string[]>>, item: string) => {
  const current = store.value;
  if (current.includes(item)) {
    store.set(current.filter((v: string) => v !== item));
  } else {
    store.set([...current, item]);
  }
};

export const ButtonGroupScreen: FC = () => {

  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold tracking-tight">Button Group</h1>
      <p class="text-lg text-muted-foreground">
        Group related actions with shared borders and optional menus.
      </p>

      <CodePreview
        previewClassName="items-start justify-start"
        className="w-full"
        code={`<div className="flex w-fit items-stretch gap-2">
  <Button variant="outline" size="icon" aria-label="Go Back">...</Button>

  <ButtonGroup>
    <Button variant="outline">Archive</Button>
    <Button variant="outline">Report</Button>
  </ButtonGroup>

  <ButtonGroup>
    <Button variant="outline">Snooze</Button>
    <DropdownMenu id="demo-button-group-menu">
      <DropdownMenuTrigger id="demo-button-group-menu-trigger" className="btn-icon-outline">...</DropdownMenuTrigger>
      <DropdownMenuContent id="demo-button-group-menu-popover" data-align="end">
        <DropdownMenuItem>Mark as Read</DropdownMenuItem>
        <DropdownMenuItem>Archive</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Snooze</DropdownMenuItem>
        <DropdownMenuItem>Add to Calendar</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 [&_svg]:!text-destructive">Trash</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </ButtonGroup>
</div>`}
        language="tsx"
      >
        <div class="flex w-fit items-stretch gap-2">
          <Button variant="outline" size="icon" aria-label="Go Back">
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
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
          </Button>

          <ButtonGroup>
            <Button variant="outline">Archive</Button>
            <Button variant="outline">Report</Button>
          </ButtonGroup>

          <ButtonGroup>
            <Button variant="outline">Snooze</Button>

            <DropdownMenu id="demo-button-group-menu">
              <DropdownMenuTrigger
                id="demo-button-group-menu-trigger"
                className="btn-icon-outline"
                aria-label="More actions"
              >
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
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                  <circle cx="5" cy="12" r="1" />
                </svg>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                id="demo-button-group-menu-popover"
                data-align="end"
              >
                <DropdownMenuItem>Mark as Read</DropdownMenuItem>
                <DropdownMenuItem>Archive</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Snooze</DropdownMenuItem>
                <DropdownMenuItem>Add to Calendar</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 [&_svg]:!text-destructive">
                  Trash
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>
        </div>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8">
        Toggle Button Group
      </h2>
      <p class="text-sm text-muted-foreground">
        Single-selection toggle group with store-driven state. Only one button
        can be active at a time.
      </p>

      <CodePreview
        previewClassName="items-start justify-start"
        className="w-full"
        code={`import { $, createRef, createStore } from "defuss";
import { ButtonGroup, ToggleButton } from "defuss-shadcn";

const store = createStore({ value: "filter1" });
const ref = createRef<HTMLDivElement>();

const render = () => {
  $(ref).jsx(
    <ButtonGroup>
      <ToggleButton
        value="filter1"
        pressed={store.value.value === "filter1"}
        onClick={() => store.set({ value: "filter1" })}
      >
        Filter 1
      </ToggleButton>
      <ToggleButton
        value="filter2"
        pressed={store.value.value === "filter2"}
        onClick={() => store.set({ value: "filter2" })}
      >
        Filter 2
      </ToggleButton>
      <ToggleButton
        value="filter3"
        pressed={store.value.value === "filter3"}
        onClick={() => store.set({ value: "filter3" })}
      >
        Filter 3
      </ToggleButton>
    </ButtonGroup>
  );
};

store.subscribe(render);

<div ref={ref} onMount={render} />`}
        language="tsx"
      >
        <Reactive store={filterStore} render={() => (
          <ButtonGroup>
            <ToggleButton
              value="filter1"
              pressed={filterStore.value.value === "filter1"}
              onClick={() => filterStore.set({ value: "filter1" })}
            >
              Filter 1
            </ToggleButton>
            <ToggleButton
              value="filter2"
              pressed={filterStore.value.value === "filter2"}
              onClick={() => filterStore.set({ value: "filter2" })}
            >
              Filter 2
            </ToggleButton>
            <ToggleButton
              value="filter3"
              pressed={filterStore.value.value === "filter3"}
              onClick={() => filterStore.set({ value: "filter3" })}
            >
              Filter 3
            </ToggleButton>
          </ButtonGroup>
        )}/>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8">
        Split Toggle Button Group
      </h2>
      <p class="text-sm text-muted-foreground">
        Each toggle button of the same group lives in its own card. Multiple
        buttons can be active simultaneously across cards.
      </p>

      <CodePreview
        previewClassName="items-start justify-start"
        className="w-full"
        code={`import { Reactive, createStore } from "defuss";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "defuss-shadcn";

const modeStore = createStore<string[]>([]);

const toggleMode = (mode: string) => {
  const current = modeStore.value;
  if (current.includes(mode)) {
    modeStore.set(current.filter((v) => v !== mode));
  } else {
    modeStore.set([...current, mode]);
  }
};

const modes = [
  { id: "mode1", title: "Mode 1", description: "Enable parallel processing." },
  { id: "mode2", title: "Mode 2", description: "Enable streaming output." },
  { id: "mode3", title: "Mode 3", description: "Enable batch mode." },
];

<Reactive store={modeStore} render={() => (
  <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
    {modes.map((mode) => (
      <Card key={mode.id}>
        <CardHeader>
          <CardTitle>{mode.title}</CardTitle>
          <CardDescription>{mode.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant={modeStore.value.includes(mode.id) ? "default" : "outline"}
            onClick={() => toggleMode(mode.id)}
          >
            {modeStore.value.includes(mode.id) ? "Active" : "Enable"}
          </Button>
        </CardContent>
      </Card>
    ))}
  </div>
)}/>`}
        language="tsx"
      >
        <Reactive store={mode1Store} render={() => (
          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Mode 1</CardTitle>
                <CardDescription>Enable parallel processing for faster throughput.</CardDescription>
              </CardHeader>
              <CardContent class="space-y-3">
                <ToggleButton
                  class="w-full"
                  pressed={mode1Store.value.includes("parallel")}
                  onClick={() => toggleInStore(mode1Store, "parallel")}
                >
                  {mode1Store.value.includes("parallel") ? "Active" : "Enable"}
                </ToggleButton>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mode 2</CardTitle>
                <CardDescription>Stream results in real-time as they become available.</CardDescription>
              </CardHeader>
              <CardContent class="space-y-3">
                <ToggleButton
                  class="w-full"
                  pressed={mode1Store.value.includes("streaming")}
                  onClick={() => toggleInStore(mode1Store, "streaming")}
                >
                  {mode1Store.value.includes("streaming") ? "Active" : "Enable"}
                </ToggleButton>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mode 3</CardTitle>
                <CardDescription>Process items in optimized batch groups.</CardDescription>
              </CardHeader>
              <CardContent class="space-y-3">
                <ToggleButton
                  class="w-full"
                  pressed={mode1Store.value.includes("batch")}
                  onClick={() => toggleInStore(mode1Store, "batch")}
                >
                  {mode1Store.value.includes("batch") ? "Active" : "Enable"}
                </ToggleButton>
              </CardContent>
            </Card>
          </div>
        )}/>
      </CodePreview>
    </div>
  );
};
