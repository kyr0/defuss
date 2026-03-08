import "./popup-styles.css";

import { $, render, createRef, createStore } from "defuss";
import type { FC } from "defuss";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  Label,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Switch,
  Alert,
  AlertTitle,
  AlertDescription,
  Separator,
  Progress,
} from "defuss-shadcn";
import { createWorkerRpcClient } from "../lib/rpc";
import { registerRpc } from "../lib/rpc";
import type { WorkerRpcApi } from "../worker-rpc";
import { PopupRpc } from "../popup-rpc";

// -- Register popup RPC so the worker can forward captured events to us --
registerRpc("PopupRpc", PopupRpc);

// -- RPC client for the service worker --
type WorkerRpc = { WorkerRpc: WorkerRpcApi };
let rpc: WorkerRpc;
const rpcReady = createWorkerRpcClient<WorkerRpc>().then((client) => {
  rpc = client;
});

// -- Theme toggle (persisted via chrome.storage prefs) --

// Set up the basecoat:theme listener (same pattern as kitchensink)
document.addEventListener("basecoat:theme", ((event: CustomEvent) => {
  const mode = event.detail?.mode;
  const isDark = mode === "dark" ? true
    : mode === "light" ? false
    : !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", isDark);
  themeStore.set({ dark: isDark });
}) as EventListener);

const themeStore = createStore<{ dark: boolean }>({
  dark: window.matchMedia("(prefers-color-scheme: dark)").matches,
});

// Apply initial theme synchronously
document.documentElement.classList.toggle("dark", themeStore.value.dark);

// Restore saved theme from prefs on load
rpcReady.then(async () => {
  const val = await rpc.WorkerRpc.getPrefValue("__defuss_ext_darkMode", true);
  if (typeof val === "boolean") {
    document.documentElement.classList.toggle("dark", val);
    themeStore.set({ dark: val });
    if (switchRef.current) {
      switchRef.current.checked = val;
    }
  }
});

themeStore.subscribe((val) => {
  // Sync the Switch toggle
  if (switchRef.current) {
    switchRef.current.checked = val.dark;
  }
  // Persist theme preference to chrome.storage via worker RPC
  if (rpc) {
    rpc.WorkerRpc.setPrefValue("__defuss_ext_darkMode", val.dark, true).catch(
      (err) => console.warn("Failed to persist theme:", err),
    );
  }
});

// -- Counter demo (persisted via defuss-db through the worker) --
const counterStore = createStore({ count: 0 });
const counterRef = createRef<HTMLSpanElement>();

// Restore saved count from defuss-db on load
rpcReady.then(async () => {
  const val = await rpc.WorkerRpc.dbGet("popup_counter");
  if (val != null) {
    const parsed = Number(val);
    if (!Number.isNaN(parsed)) {
      counterStore.set({ count: parsed });
      $(counterRef).text(String(parsed));
    }
  }
});

function updateCount(count: number) {
  counterStore.set({ count });
  // Persist to defuss-db via worker RPC
  rpc?.WorkerRpc.dbSet("popup_counter", String(count)).catch(
    (err) => console.warn("Failed to persist count:", err),
  );
}

counterStore.subscribe(() => {
  $(counterRef).text(String(counterStore.value.count));
});

// -- Progress demo --
const progressStore = createStore({ value: 33 });
const progressRef = createRef<HTMLDivElement>();

// -- Components --

const switchRef = createRef<HTMLInputElement>();

const ThemeToggle: FC = () => (
  <div class="flex items-center gap-2">
    <Label htmlFor="dark-mode">Dark mode</Label>
    <Switch
      ref={switchRef}
      id="dark-mode"
      checked={themeStore.value.dark}
      onCheckedChange={(checked: boolean) => {
        document.dispatchEvent(
          new CustomEvent("basecoat:theme", { detail: { mode: checked ? "dark" : "light" } }),
        );
      }}
    />
  </div>
);

const CounterCard: FC = () => (
  <Card>
    <CardHeader>
      <CardTitle>Counter</CardTitle>
      <CardDescription>Store-driven reactivity demo (persisted in defuss-db)</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => updateCount(counterStore.value.count - 1)}
        >
          -
        </Button>
        <span
          ref={counterRef}
          class="text-2xl font-bold tabular-nums w-12 text-center"
        >
          {String(counterStore.value.count)}
        </span>
        <Button
          variant="outline"
          onClick={() => updateCount(counterStore.value.count + 1)}
        >
          +
        </Button>
      </div>
    </CardContent>
  </Card>
);

const ButtonShowcase: FC = () => (
  <Card>
    <CardHeader>
      <CardTitle>Buttons</CardTitle>
      <CardDescription>All button variants</CardDescription>
    </CardHeader>
    <CardContent class="space-y-3">
      <div class="flex flex-wrap gap-2">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button size="sm">Small</Button>
        <Button>Default</Button>
        <Button size="lg">Large</Button>
      </div>
    </CardContent>
  </Card>
);

const BadgeShowcase: FC = () => (
  <Card>
    <CardHeader>
      <CardTitle>Badges</CardTitle>
      <CardDescription>Status indicators</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="flex flex-wrap gap-2">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="outline">Outline</Badge>
      </div>
    </CardContent>
  </Card>
);

const ActiveTabCard: FC = () => (
  <Card>
    <CardHeader>
      <CardTitle>Active Tab</CardTitle>
      <CardDescription>Run functions in the active tab's content script via RPC</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="flex flex-wrap gap-2">
        <Button onClick={() => {
          rpc?.WorkerRpc.tabRpcCall("TabRpc", "showAlert", "Hello from defuss!").catch(
            (err) => console.warn("tabRpcCall failed:", err),
          );
        }}>
          Show Notification
        </Button>
      </div>
    </CardContent>
  </Card>
);

const FormCard: FC = () => (
  <Card>
    <CardHeader>
      <CardTitle>Form</CardTitle>
      <CardDescription>Input components</CardDescription>
    </CardHeader>
    <CardContent class="space-y-3">
      <div class="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="Enter your name" />
      </div>
      <div class="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="you@example.com" />
      </div>
    </CardContent>
    <CardFooter>
      <Button class="w-full">Submit</Button>
    </CardFooter>
  </Card>
);

const ProgressCard: FC = () => (
  <Card>
    <CardHeader>
      <CardTitle>Progress</CardTitle>
      <CardDescription>Animated progress bar</CardDescription>
    </CardHeader>
    <CardContent class="space-y-3">
      <Progress ref={progressRef} value={progressStore.value.value} />
      <div class="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const next = Math.max(0, progressStore.value.value - 10);
            progressStore.set({ value: next });
            if (progressRef.current) {
              const bar = progressRef.current.querySelector(
                "[role=progressbar]",
              ) as HTMLElement;
              if (bar) bar.style.width = `${next}%`;
            }
          }}
        >
          -10%
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const next = Math.min(100, progressStore.value.value + 10);
            progressStore.set({ value: next });
            if (progressRef.current) {
              const bar = progressRef.current.querySelector(
                "[role=progressbar]",
              ) as HTMLElement;
              if (bar) bar.style.width = `${next}%`;
            }
          }}
        >
          +10%
        </Button>
      </div>
    </CardContent>
  </Card>
);

const AlertShowcase: FC = () => (
  <div class="space-y-3">
    <Alert>
      <AlertTitle>Info</AlertTitle>
      <AlertDescription>This is a default alert message.</AlertDescription>
    </Alert>
    <Alert variant="destructive">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>Something went wrong.</AlertDescription>
    </Alert>
  </div>
);

const App: FC = () => (
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold tracking-tight">defuss Kitchensink</h1>
      <ThemeToggle />
    </div>
    <Separator />
    <Tabs defaultValue="components">
      <TabsList class="w-full">
        <TabsTrigger value="components">Components</TabsTrigger>
        <TabsTrigger value="forms">Forms</TabsTrigger>
        <TabsTrigger value="feedback">Feedback</TabsTrigger>
      </TabsList>
      <TabsContent value="components" class="space-y-4 mt-4">
        <ActiveTabCard />
        <ButtonShowcase />
        <BadgeShowcase />
        <CounterCard />
      </TabsContent>
      <TabsContent value="forms" class="space-y-4 mt-4">
        <FormCard />
        <ProgressCard />
      </TabsContent>
      <TabsContent value="feedback" class="space-y-4 mt-4">
        <AlertShowcase />
      </TabsContent>
    </Tabs>
  </div>
);

render(<App />, document.getElementById("app")!);
