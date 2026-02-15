import type { FC } from "defuss";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormField,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
} from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const RadioGroupScreen: FC = () => {
  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold tracking-tight">Radio Group</h1>
      <p class="text-lg text-muted-foreground">
        A set of checkable buttons where only one can be selected.
      </p>
      <CodePreview
        code={`<RadioGroup className="space-y-2" name="plan">
  <label className="flex items-center gap-2"><RadioGroupItem name="plan" value="starter" /> <span>Starter</span></label>
  <label className="flex items-center gap-2"><RadioGroupItem name="plan" value="pro" /> <span>Pro</span></label>
  <label className="flex items-center gap-2"><RadioGroupItem name="plan" value="enterprise" /> <span>Enterprise</span></label>
</RadioGroup>`}
        language="tsx"
      >
        <RadioGroup className="space-y-2" name="plan">
          <label class="flex items-center gap-2">
            <RadioGroupItem name="plan" value="starter" />{" "}
            <Label>Starter</Label>
          </label>
          <label class="flex items-center gap-2">
            <RadioGroupItem name="plan" value="pro" /> <Label>Pro</Label>
          </label>
          <label class="flex items-center gap-2">
            <RadioGroupItem name="plan" value="enterprise" />{" "}
            <Label>Enterprise</Label>
          </label>
        </RadioGroup>
      </CodePreview>
      <h2
        id="example-horizontal"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Radio Group with horizontal orientation
      </h2>
      <p class="text-muted-foreground mb-4">
        Inline radio buttons displayed horizontally using flexbox layout.
      </p>
      <CodePreview
        code={`<RadioGroup className="flex gap-6" name="size">
  <label className="flex items-center gap-2">
    <RadioGroupItem name="size" value="small" />
    <span>Small</span>
  </label>
  <label className="flex items-center gap-2">
    <RadioGroupItem name="size" value="medium" />
    <span>Medium</span>
  </label>
  <label className="flex items-center gap-2">
    <RadioGroupItem name="size" value="large" />
    <span>Large</span>
  </label>
</RadioGroup>`}
        language="tsx"
      >
        <RadioGroup className="flex gap-6" name="size">
          <label class="flex items-center gap-2">
            <RadioGroupItem name="size" value="small" />
            <Label>Small</Label>
          </label>
          <label class="flex items-center gap-2">
            <RadioGroupItem name="size" value="medium" />
            <Label>Medium</Label>
          </label>
          <label class="flex items-center gap-2">
            <RadioGroupItem name="size" value="large" />
            <Label>Large</Label>
          </label>
        </RadioGroup>
      </CodePreview>
      <h2
        id="example-with-descriptions"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Radio Group with labels and descriptions
      </h2>
      <p class="text-muted-foreground mb-4">
        Each radio option includes helper text for better context.
      </p>
      <CodePreview
        code={`<RadioGroup className="space-y-4" name="frequency">
  <label className="flex items-start gap-3">
    <RadioGroupItem name="frequency" value="daily" />
    <div className="flex flex-col">
      <span className="font-medium">Daily</span>
      <span className="text-sm text-muted-foreground">Get updates once per day</span>
    </div>
  </label>
  <label className="flex items-start gap-3">
    <RadioGroupItem name="frequency" value="weekly" />
    <div className="flex flex-col">
      <span className="font-medium">Weekly</span>
      <span className="text-sm text-muted-foreground">Get updates once per week</span>
    </div>
  </label>
  <label className="flex items-start gap-3">
    <RadioGroupItem name="frequency" value="monthly" />
    <div className="flex flex-col">
      <span className="font-medium">Monthly</span>
      <span className="text-sm text-muted-foreground">Get updates once per month</span>
    </div>
  </label>
</RadioGroup>`}
        language="tsx"
      >
        <RadioGroup className="space-y-4" name="frequency">
          <label class="flex items-start gap-3">
            <RadioGroupItem name="frequency" value="daily" />
            <div class="flex flex-col">
              <span class="font-medium">Daily</span>
              <span class="text-sm text-muted-foreground">
                Get updates once per day
              </span>
            </div>
          </label>
          <label class="flex items-start gap-3">
            <RadioGroupItem name="frequency" value="weekly" />
            <div class="flex flex-col">
              <span class="font-medium">Weekly</span>
              <span class="text-sm text-muted-foreground">
                Get updates once per week
              </span>
            </div>
          </label>
          <label class="flex items-start gap-3">
            <RadioGroupItem name="frequency" value="monthly" />
            <div class="flex flex-col">
              <span class="font-medium">Monthly</span>
              <span class="text-sm text-muted-foreground">
                Get updates once per month
              </span>
            </div>
          </label>
        </RadioGroup>
      </CodePreview>
      <h2
        id="example-form-validation"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Radio Group in form with validation
      </h2>
      <p class="text-muted-foreground mb-4">
        Integrated into a form with field validation and submission.
      </p>
      <CodePreview
        code={`<Form className="form grid gap-6 max-w-md">
  <FormField
    name="notification_preference"
    render={() => (
      <div className="flex flex-col gap-3">
        <Label htmlFor="notification-preference">Notification preference</Label>
        <RadioGroup id="notification-preference" name="notification_preference" className="grid gap-3" required>
          <label className="flex items-center gap-2 rounded-md border p-3 hover:bg-accent">
            <RadioGroupItem name="notification_preference" value="email" />
            <span>Email</span>
          </label>
          <label className="flex items-center gap-2 rounded-md border p-3 hover:bg-accent">
            <RadioGroupItem name="notification_preference" value="sms" />
            <span>SMS</span>
          </label>
          <label className="flex items-center gap-2 rounded-md border p-3 hover:bg-accent">
            <RadioGroupItem name="notification_preference" value="push" />
            <span>Push</span>
          </label>
        </RadioGroup>
      </div>
    )}
  />
  <Button type="submit">Submit</Button>
</Form>`}
        language="tsx"
      >
        <Form class="form grid gap-6 max-w-md">
          <FormField
            name="notification_preference"
            render={() => (
              <div class="flex flex-col gap-3">
                <Label htmlFor="notification-preference">
                  Notification preference
                </Label>
                <RadioGroup
                  id="notification-preference"
                  name="notification_preference"
                  className="grid gap-3"
                  required
                >
                  <label class="flex items-center gap-2 rounded-md border p-3 hover:bg-accent">
                    <RadioGroupItem
                      name="notification_preference"
                      value="email"
                    />
                    <span>Email</span>
                  </label>
                  <label class="flex items-center gap-2 rounded-md border p-3 hover:bg-accent">
                    <RadioGroupItem
                      name="notification_preference"
                      value="sms"
                    />
                    <span>SMS</span>
                  </label>
                  <label class="flex items-center gap-2 rounded-md border p-3 hover:bg-accent">
                    <RadioGroupItem
                      name="notification_preference"
                      value="push"
                    />
                    <span>Push</span>
                  </label>
                </RadioGroup>
              </div>
            )}
          />
          <Button type="submit">Submit</Button>
        </Form>
      </CodePreview>
      <h2
        id="example-with-icons"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Radio Group with icons
      </h2>
      <p class="text-muted-foreground mb-4">
        Each radio option includes an icon for visual representation.
      </p>
      <CodePreview
        code={`<RadioGroup className="space-y-3" name="icons">
  <label className="flex items-center gap-3 rounded-md border p-3 hover:bg-accent">
    <RadioGroupItem name="icons" value="home" />
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    <span>Home</span>
  </label>
  <label className="flex items-center gap-3 rounded-md border p-3 hover:bg-accent">
    <RadioGroupItem name="icons" value="users" />
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    <span>Users</span>
  </label>
  <label className="flex items-center gap-3 rounded-md border p-3 hover:bg-accent">
    <RadioGroupItem name="icons" value="settings" />
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
    <span>Settings</span>
  </label>
</RadioGroup>`}
        language="tsx"
      >
        <RadioGroup className="space-y-3" name="icons">
          <label class="flex items-center gap-3 rounded-md border p-3 hover:bg-accent">
            <RadioGroupItem name="icons" value="home" />
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
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>Home</span>
          </label>
          <label class="flex items-center gap-3 rounded-md border p-3 hover:bg-accent">
            <RadioGroupItem name="icons" value="users" />
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Users</span>
          </label>
          <label class="flex items-center gap-3 rounded-md border p-3 hover:bg-accent">
            <RadioGroupItem name="icons" value="settings" />
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
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>Settings</span>
          </label>
        </RadioGroup>
      </CodePreview>
      <h2
        id="example-horizontal-card"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Radio Group horizontal in card
      </h2>
      <p class="text-muted-foreground mb-4">
        Horizontal radio group integrated into a card layout.
      </p>
      <CodePreview
        code={`<Card className="w-full max-w-md">
  <CardHeader>
    <CardTitle>Display Settings</CardTitle>
    <CardDescription>Choose your preferred display mode</CardDescription>
  </CardHeader>
  <CardContent>
    <RadioGroup className="flex items-center justify-between gap-4" name="display-mode">
      <label className="flex flex-col items-center gap-2 rounded-lg border p-4 hover:bg-accent hover:border-primary transition-colors cursor-pointer">
        <RadioGroupItem name="display-mode" value="light" />
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>
        <span className="text-sm font-medium">Light</span>
      </label>
      <label className="flex flex-col items-center gap-2 rounded-lg border p-4 hover:bg-accent hover:border-primary transition-colors cursor-pointer">
        <RadioGroupItem name="display-mode" value="dark" />
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
        <span className="text-sm font-medium">Dark</span>
      </label>
      <label className="flex flex-col items-center gap-2 rounded-lg border p-4 hover:bg-accent hover:border-primary transition-colors cursor-pointer">
        <RadioGroupItem name="display-mode" value="system" />
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.1 4-2 4-2"/><path d="M12 15v5s3.03-.55 4-2c1.1-1.62 2-4 2-2"/></svg>
        <span className="text-sm font-medium">System</span>
      </label>
    </RadioGroup>
  </CardContent>
</Card>`}
        language="tsx"
      >
        <Card class="w-full max-w-md">
          <CardHeader>
            <CardTitle>Display Settings</CardTitle>
            <CardDescription>
              Choose your preferred display mode
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              className="flex items-center justify-between gap-4"
              name="display-mode"
            >
              <label className="flex flex-col items-center gap-2 rounded-lg border p-4 hover:bg-accent hover:border-primary transition-colors cursor-pointer">
                <RadioGroupItem name="display-mode" value="light" />
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
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2" />
                  <path d="M12 21v2" />
                  <path d="M4.22 4.22l1.42 1.42" />
                  <path d="M18.36 18.36l1.42 1.42" />
                  <path d="M1 12h2" />
                  <path d="M21 12h2" />
                  <path d="M4.22 19.78l1.42-1.42" />
                  <path d="M18.36 5.64l1.42-1.42" />
                </svg>
                <span className="text-sm font-medium">Light</span>
              </label>
              <label className="flex flex-col items-center gap-2 rounded-lg border p-4 hover:bg-accent hover:border-primary transition-colors cursor-pointer">
                <RadioGroupItem name="display-mode" value="dark" />
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
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
                <span className="text-sm font-medium">Dark</span>
              </label>
              <label className="flex flex-col items-center gap-2 rounded-lg border p-4 hover:bg-accent hover:border-primary transition-colors cursor-pointer">
                <RadioGroupItem name="display-mode" value="system" />
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
                  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                  <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                  <path d="M9 12H4s.55-3.03 2-4c1.62-1.1 4-2 4-2" />
                  <path d="M12 15v5s3.03-.55 4-2c1.1-1.62 2-4 2-2" />
                </svg>
                <span className="text-sm font-medium">System</span>
              </label>
            </RadioGroup>
          </CardContent>
        </Card>
      </CodePreview>
      <h2
        id="example-choice-cards"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Radio Group as cards (choice card pattern)
      </h2>
      <p class="text-muted-foreground mb-4">
        Each option is styled as a card that highlights when selected.
      </p>
      <CodePreview
        code={`<RadioGroup className="grid gap-4 sm:grid-cols-2" name="plan-tier">
  <label className="group relative flex flex-col gap-3 rounded-xl border-2 border-border bg-card p-5 hover:bg-accent hover:border-primary transition-all cursor-pointer">
    <RadioGroupItem name="plan-tier" value="basic" className="absolute right-4 top-4 h-4 w-4" />
    <div className="flex flex-col gap-1">
      <span className="font-semibold">Basic</span>
      <span className="text-sm text-muted-foreground">Perfect for individuals</span>
    </div>
    <div className="mt-auto flex items-baseline gap-1">
      <span className="text-2xl font-bold">$0</span>
      <span className="text-sm text-muted-foreground">/month</span>
    </div>
  </label>
  <label className="group relative flex flex-col gap-3 rounded-xl border-2 border-border bg-card p-5 hover:bg-accent hover:border-primary transition-all cursor-pointer">
    <RadioGroupItem name="plan-tier" value="pro" className="absolute right-4 top-4 h-4 w-4" />
    <div className="flex flex-col gap-1">
      <span className="font-semibold">Pro</span>
      <span className="text-sm text-muted-foreground">Best for professionals</span>
    </div>
    <div className="mt-auto flex items-baseline gap-1">
      <span className="text-2xl font-bold">$29</span>
      <span className="text-sm text-muted-foreground">/month</span>
    </div>
  </label>
  <label className="group relative flex flex-col gap-3 rounded-xl border-2 border-border bg-card p-5 hover:bg-accent hover:border-primary transition-all cursor-pointer">
    <RadioGroupItem name="plan-tier" value="enterprise" className="absolute right-4 top-4 h-4 w-4" />
    <div className="flex flex-col gap-1">
      <span className="font-semibold">Enterprise</span>
      <span className="text-sm text-muted-foreground">For large teams</span>
    </div>
    <div className="mt-auto flex items-baseline gap-1">
      <span className="text-2xl font-bold">$99</span>
      <span className="text-sm text-muted-foreground">/month</span>
    </div>
  </label>
</RadioGroup>`}
        language="tsx"
      >
        <RadioGroup className="grid gap-4 sm:grid-cols-2" name="plan-tier">
          <label className="group relative flex flex-col gap-3 rounded-xl border-2 border-border bg-card p-5 hover:bg-accent hover:border-primary transition-all cursor-pointer">
            <RadioGroupItem
              name="plan-tier"
              value="basic"
              className="absolute right-4 top-4 h-4 w-4"
            />
            <div className="flex flex-col gap-1">
              <span className="font-semibold">Basic</span>
              <span className="text-sm text-muted-foreground">
                Perfect for individuals
              </span>
            </div>
            <div className="mt-auto flex items-baseline gap-1">
              <span className="text-2xl font-bold">$0</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
          </label>
          <label className="group relative flex flex-col gap-3 rounded-xl border-2 border-border bg-card p-5 hover:bg-accent hover:border-primary transition-all cursor-pointer">
            <RadioGroupItem
              name="plan-tier"
              value="pro"
              className="absolute right-4 top-4 h-4 w-4"
            />
            <div className="flex flex-col gap-1">
              <span className="font-semibold">Pro</span>
              <span className="text-sm text-muted-foreground">
                Best for professionals
              </span>
            </div>
            <div className="mt-auto flex items-baseline gap-1">
              <span className="text-2xl font-bold">$29</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
          </label>
          <label className="group relative flex flex-col gap-3 rounded-xl border-2 border-border bg-card p-5 hover:bg-accent hover:border-primary transition-all cursor-pointer">
            <RadioGroupItem
              name="plan-tier"
              value="enterprise"
              className="absolute right-4 top-4 h-4 w-4"
            />
            <div className="flex flex-col gap-1">
              <span className="font-semibold">Enterprise</span>
              <span className="text-sm text-muted-foreground">
                For large teams
              </span>
            </div>
            <div className="mt-auto flex items-baseline gap-1">
              <span className="text-2xl font-bold">$99</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
          </label>
        </RadioGroup>
      </CodePreview>
      <h2
        id="example-error-state"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Radio Group with error state
      </h2>
      <p class="text-muted-foreground mb-4">
        Radio group displayed in an error state with validation message.
      </p>
      <CodePreview
        code={`<div className="grid gap-3">
  <Label htmlFor="error-state-group">Payment method</Label>
  <RadioGroup id="error-state-group" name="payment" className="grid gap-3" aria-invalid={true} aria-describedby="payment-error-msg">
    <label className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3">
      <RadioGroupItem name="payment" value="credit-card" />
      <span>Credit Card</span>
    </label>
    <label className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3">
      <RadioGroupItem name="payment" value="paypal" />
      <span>PayPal</span>
    </label>
    <label className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3">
      <RadioGroupItem name="payment" value="bank" />
      <span>Bank Transfer</span>
    </label>
  </RadioGroup>
  <p id="payment-error-msg" role="alert" className="text-destructive text-sm">
    Please select a payment method.
  </p>
</div>`}
        language="tsx"
      >
        <div class="grid gap-3">
          <Label htmlFor="error-state-group">Payment method</Label>
          <RadioGroup
            id="error-state-group"
            name="payment"
            className="grid gap-3"
            aria-invalid={true}
            aria-describedby="payment-error-msg"
          >
            <label class="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <RadioGroupItem name="payment" value="credit-card" />
              <span>Credit Card</span>
            </label>
            <label class="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <RadioGroupItem name="payment" value="paypal" />
              <span>PayPal</span>
            </label>
            <label class="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <RadioGroupItem name="payment" value="bank" />
              <span>Bank Transfer</span>
            </label>
          </RadioGroup>
          <p
            id="payment-error-msg"
            role="alert"
            class="text-destructive text-sm"
          >
            Please select a payment method.
          </p>
        </div>
      </CodePreview>
    </div>
  );
};
