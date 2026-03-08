import "./popup-styles.css";

import { render, createRef, createStore } from "defuss";
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

// -- Helper to talk to the service worker --
function workerMessage(action: string, data: Record<string, unknown>): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action, text: JSON.stringify(data) },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (response?.success) {
          resolve(response.value != null ? JSON.parse(response.value) : undefined);
        } else {
          reject(new Error("Worker responded with failure"));
        }
      },
    );
  });
}

// -- Theme toggle (persisted via chrome.storage prefs) --
const themeStore = createStore<{ dark: boolean }>({
  dark: window.matchMedia("(prefers-color-scheme: dark)").matches,
});

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
}

applyTheme(themeStore.value.dark);

// Restore saved theme from prefs on load
workerMessage("get", { key: "__defuss_ext_darkMode", local: true }).then((val) => {
  if (typeof val === "boolean") {
    themeStore.set({ dark: val });
  }
});

themeStore.subscribe((val) => {
  applyTheme(val.dark);
  // Persist theme preference to chrome.storage via worker
  workerMessage("set", { key: "__defuss_ext_darkMode", value: val.dark, local: true }).catch(
    (err) => console.warn("Failed to persist theme:", err),
  );
});

// -- Counter demo (persisted via defuss-db through the worker) --
const counterStore = createStore({ count: 0 });
const counterRef = createRef<HTMLSpanElement>();

// Restore saved count from defuss-db on load
workerMessage("db-get", { key: "popup_counter" }).then((val) => {
  if (val != null) {
    const parsed = Number(val);
    if (!Number.isNaN(parsed)) {
      counterStore.set({ count: parsed });
      // Update the ref directly in case JSX already rendered with default value
      if (counterRef.current) {
        counterRef.current.textContent = String(parsed);
      }
    }
  }
});

function updateCount(count: number) {
  counterStore.set({ count });
  // Persist to defuss-db via worker
  workerMessage("db-set", { key: "popup_counter", value: String(count) }).catch(
    (err) => console.warn("Failed to persist count:", err),
  );
}

counterStore.subscribe(() => {
  if (counterRef.current) {
    counterRef.current.textContent = String(counterStore.value.count);
  }
});

// -- Progress demo --
const progressStore = createStore({ value: 33 });
const progressRef = createRef<HTMLDivElement>();

// -- Components --

const ThemeToggle: FC = () => (
  <div class="flex items-center gap-2">
    <Label htmlFor="dark-mode">Dark mode</Label>
    <Switch
      id="dark-mode"
      checked={themeStore.value.dark}
      onCheckedChange={(checked: boolean) => themeStore.set({ dark: checked })}
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
