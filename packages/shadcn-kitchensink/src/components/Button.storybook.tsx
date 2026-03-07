import { Button } from "defuss-shadcn";
import type { StoryMeta } from "defuss-storybook";

export const meta: StoryMeta = {
  title: "Components/Button",
  component: Button,
  order: 1,
  description:
    "Buttons trigger actions or navigation. Available in multiple variants and sizes.",
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "secondary",
        "destructive",
        "outline",
        "ghost",
        "link",
      ],
      defaultValue: "default",
      description: "Visual style variant",
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
      defaultValue: "default",
      description: "Size of the button",
    },
    disabled: {
      control: "boolean",
      defaultValue: false,
      description: "Whether the button is disabled",
    },
  },
  args: {
    variant: "default",
    size: "default",
    disabled: false,
  },
};

/** Default button */
export const Default = (args?: Record<string, unknown>) => (
  <Button
    variant={(args?.variant as any) ?? "default"}
    size={(args?.size as any) ?? "default"}
    disabled={!!args?.disabled}
  >
    Button
  </Button>
);

/** Secondary variant */
export const Secondary = () => <Button variant="secondary">Secondary</Button>;

/** Destructive variant */
export const Destructive = () => <Button variant="destructive">Delete</Button>;

/** Outline variant */
export const Outline = () => <Button variant="outline">Outline</Button>;

/** Ghost variant */
export const Ghost = () => <Button variant="ghost">Ghost</Button>;

/** Link variant */
export const Link = () => <Button variant="link">Link</Button>;

/** Small button */
export const Small = () => <Button size="sm">Small</Button>;

/** Large button */
export const Large = () => <Button size="lg">Large</Button>;

/** Disabled state */
export const Disabled = () => <Button disabled>Disabled</Button>;

/** Button with icon */
export const WithIcon = () => (
  <Button>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
    Add Item
  </Button>
);

/** All variants side by side */
export const AllVariants = () => (
  <div class="flex flex-wrap gap-3">
    <Button variant="default">Default</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="destructive">Destructive</Button>
    <Button variant="outline">Outline</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="link">Link</Button>
  </div>
);
