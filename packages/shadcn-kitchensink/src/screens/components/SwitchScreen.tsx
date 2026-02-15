import type { FC } from "defuss";
import { Label, Switch } from "defuss-shadcn";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const SwitchScreen: FC = () => {
  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold tracking-tight">Switch</h1>
      <p class="text-lg text-muted-foreground">
        A control to toggle between two states.
      </p>

      <CodePreview
        code={`<div className="flex items-center gap-2">
  <Switch id="airplane-mode" />
  <Label htmlFor="airplane-mode">Airplane Mode</Label>
</div>`}
        language="tsx"
      >
        <div class="flex items-center gap-2">
          <Switch id="airplane-mode" />
          <Label for="airplane-mode">Airplane Mode</Label>
        </div>
      </CodePreview>

      <h2 class="text-2xl font-bold tracking-tight mt-8">
        With Text Labels (Left/Right)
      </h2>
      <p class="text-lg text-muted-foreground">
        Demonstrates switch with different labels for on/off states.
      </p>
      <CodePreview
        code={`<div className="flex items-center gap-2">
  <Label htmlFor="notifications-on">ON</Label>
  <Switch id="notifications-on" />
  <Label htmlFor="notifications-off">OFF</Label>
</div>`}
        language="tsx"
      >
        <div class="flex items-center gap-2">
          <Label for="notifications-on">ON</Label>
          <Switch id="notifications-on" />
          <Label for="notifications-off">OFF</Label>
        </div>
      </CodePreview>

      <h2 class="text-2xl font-bold tracking-tight mt-8">In Card</h2>
      <p class="text-lg text-muted-foreground">
        Switch embedded within a Card component.
      </p>
      <CodePreview
        code={`<Card>
  <CardHeader>
    <CardTitle>Notifications</CardTitle>
    <CardDescription>Manage your notification preferences</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="flex items-center justify-between">
      <div className="grid gap-1.5">
        <Label htmlFor="card-push">Push Notifications</Label>
        <p className="text-sm text-muted-foreground">Receive push notifications on your device</p>
      </div>
      <Switch id="card-push" />
    </div>
  </CardContent>
</Card>`}
        language="tsx"
      >
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Manage your notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="flex items-center justify-between">
              <div class="grid gap-1.5">
                <Label for="card-push">Push Notifications</Label>
                <p class="text-sm text-muted-foreground">
                  Receive push notifications on your device
                </p>
              </div>
              <Switch id="card-push" />
            </div>
          </CardContent>
        </Card>
      </CodePreview>

      <h2 class="text-2xl font-bold tracking-tight mt-8">Disabled State</h2>
      <p class="text-lg text-muted-foreground">Switch in a disabled state.</p>
      <CodePreview
        code={`<div className="flex items-center gap-2">
  <Switch id="disabled-switch" disabled />
  <Label htmlFor="disabled-switch">Disabled Switch</Label>
</div>`}
        language="tsx"
      >
        <div class="flex items-center gap-2">
          <Switch id="disabled-switch" disabled />
          <Label for="disabled-switch">Disabled Switch</Label>
        </div>
      </CodePreview>

      <h2 class="text-2xl font-bold tracking-tight mt-8">
        In Form (Horizontal Layout)
      </h2>
      <p class="text-lg text-muted-foreground">
        Switch with label in a horizontal form layout.
      </p>
      <CodePreview
        code={`<form className="flex items-center justify-between py-4">
  <Label htmlFor="form-switch" className="flex items-center gap-2">
    <span>Two-Factor Authentication</span>
  </Label>
  <Switch id="form-switch" />
</form>`}
        language="tsx"
      >
        <form class="flex items-center justify-between py-4">
          <Label for="form-switch" class="flex items-center gap-2">
            <span>Two-Factor Authentication</span>
          </Label>
          <Switch id="form-switch" />
        </form>
      </CodePreview>

      <h2 class="text-2xl font-bold tracking-tight mt-8">
        Multiple Switches in Form
      </h2>
      <p class="text-lg text-muted-foreground">
        Multiple switches in a form with labels and descriptions.
      </p>
      <CodePreview
        code={`<form className="space-y-4">
  <div className="flex items-center justify-between">
    <div className="grid gap-1.5">
      <Label htmlFor="form-toggle-1">Email Notifications</Label>
      <p className="text-sm text-muted-foreground">Receive daily summaries via email</p>
    </div>
    <Switch id="form-toggle-1" />
  </div>
  <div className="flex items-center justify-between">
    <div className="grid gap-1.5">
      <Label htmlFor="form-toggle-2">Marketing Emails</Label>
      <p className="text-sm text-muted-foreground">Receive promotional offers and updates</p>
    </div>
    <Switch id="form-toggle-2" />
  </div>
  <div className="flex items-center justify-between">
    <div className="grid gap-1.5">
      <Label htmlFor="form-toggle-3">Security Alerts</Label>
      <p className="text-sm text-muted-foreground">Get immediate notifications about security</p>
    </div>
    <Switch id="form-toggle-3" defaultChecked />
  </div>
</form>`}
        language="tsx"
      >
        <form class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="grid gap-1.5">
              <Label for="form-toggle-1">Email Notifications</Label>
              <p class="text-sm text-muted-foreground">
                Receive daily summaries via email
              </p>
            </div>
            <Switch id="form-toggle-1" />
          </div>
          <div class="flex items-center justify-between">
            <div class="grid gap-1.5">
              <Label for="form-toggle-2">Marketing Emails</Label>
              <p class="text-sm text-muted-foreground">
                Receive promotional offers and updates
              </p>
            </div>
            <Switch id="form-toggle-2" />
          </div>
          <div class="flex items-center justify-between">
            <div class="grid gap-1.5">
              <Label for="form-toggle-3">Security Alerts</Label>
              <p class="text-sm text-muted-foreground">
                Get immediate notifications about security
              </p>
            </div>
            <Switch id="form-toggle-3" checked />
          </div>
        </form>
      </CodePreview>

      <h2 class="text-2xl font-bold tracking-tight mt-8">Custom Colors</h2>
      <p class="text-lg text-muted-foreground">
        Switch with custom background colors using inline styles.
      </p>
      <CodePreview
        code={`<div className="flex items-center gap-2">
  <Switch 
    id="custom-color-switch"
    style={{
      backgroundColor: '#6366f1',
      borderColor: '#6366f1'
    }}
  />
  <Label htmlFor="custom-color-switch">Custom Theme</Label>
</div>`}
        language="tsx"
      >
        <div class="flex items-center gap-2">
          <Switch
            id="custom-color-switch"
            style={{
              backgroundColor: "#6366f1",
              borderColor: "#6366f1",
            }}
          />
          <Label for="custom-color-switch">Custom Theme</Label>
        </div>
      </CodePreview>

      <h2 class="text-2xl font-bold tracking-tight mt-8">
        In Toggle Group (Radio Group Style)
      </h2>
      <p class="text-lg text-muted-foreground">
        Multiple switches grouped together, similar to a radio group.
      </p>
      <CodePreview
        code={`<div className="grid gap-4">
  <div className="flex items-center gap-3">
    <Label htmlFor="toggle-group-1" className="flex-1">Basic Plan</Label>
    <Switch id="toggle-group-1" defaultChecked />
  </div>
  <div className="flex items-center gap-3">
    <Label htmlFor="toggle-group-2" className="flex-1">Pro Plan</Label>
    <Switch id="toggle-group-2" />
  </div>
  <div className="flex items-center gap-3">
    <Label htmlFor="toggle-group-3" className="flex-1">Enterprise</Label>
    <Switch id="toggle-group-3" />
  </div>
</div>`}
        language="tsx"
      >
        <div class="grid gap-4">
          <div class="flex items-center gap-3">
            <Label for="toggle-group-1" class="flex-1">
              Basic Plan
            </Label>
            <Switch id="toggle-group-1" checked />
          </div>
          <div class="flex items-center gap-3">
            <Label for="toggle-group-2" class="flex-1">
              Pro Plan
            </Label>
            <Switch id="toggle-group-2" />
          </div>
          <div class="flex items-center gap-3">
            <Label for="toggle-group-3" class="flex-1">
              Enterprise
            </Label>
            <Switch id="toggle-group-3" />
          </div>
        </div>
      </CodePreview>
    </div>
  );
};
