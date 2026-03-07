import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
} from "defuss-shadcn";
import type { StoryMeta } from "defuss-storybook";

export const meta: StoryMeta = {
  title: "Components/Card",
  order: 2,
  description: "Cards group related content and actions in a contained layout.",
};

/** Basic card with header and content */
export const Default = () => (
  <Card className="max-w-md">
    <CardHeader>
      <CardTitle>Card Title</CardTitle>
      <CardDescription>A short description of the card content.</CardDescription>
    </CardHeader>
    <CardContent>
      <p>This is the main content area of the card.</p>
    </CardContent>
  </Card>
);

/** Card with footer actions */
export const WithFooter = () => (
  <Card className="max-w-md">
    <CardHeader>
      <CardTitle>Create Project</CardTitle>
      <CardDescription>Deploy your new project in one click.</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="grid gap-2">
        <label class="label" for="project-name">Name</label>
        <input id="project-name" class="input" placeholder="My Project" />
      </div>
    </CardContent>
    <CardFooter className="flex justify-between">
      <Button variant="outline">Cancel</Button>
      <Button>Deploy</Button>
    </CardFooter>
  </Card>
);

/** Multiple cards in a grid */
export const Grid = () => (
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    {["Design", "Development", "Marketing"].map((title) => (
      <Card key={title}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Manage your {title.toLowerCase()} tasks.</CardDescription>
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold">12</p>
          <p class="text-sm text-muted-foreground">Active tasks</p>
        </CardContent>
      </Card>
    ))}
  </div>
);
