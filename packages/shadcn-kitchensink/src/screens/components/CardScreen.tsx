import type { FC } from "defuss";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const CardScreen: FC = () => {
  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold tracking-tight">Card</h1>
      <p class="text-lg text-muted-foreground">
        Displays a card with header, content, and footer.
      </p>

      <h2
        id="example-login"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2"
      >
        Login card
      </h2>
      <CodePreview
        code={`<Card className="w-full max-w-sm">
    <CardHeader>
        <CardTitle>Login to your account</CardTitle>
        <CardDescription>Enter your details below to login to your account</CardDescription>
    </CardHeader>
    <CardContent>
        <form className="form grid gap-6">
            <div className="grid gap-2">
                <Label for="demo-card-form-email">Email</Label>
                <Input type="email" id="demo-card-form-email" />
            </div>
            <div className="grid gap-2">
                <div className="flex items-center gap-2">
                    <Label for="demo-card-form-password">Password</Label>
                    <a href="#" className="ml-auto inline-block text-sm underline-offset-4 hover:underline">Forgot your password?</a>
                </div>
                <Input type="password" id="demo-card-form-password" />
            </div>
        </form>
    </CardContent>
    <CardFooter className="flex flex-col items-center gap-2">
        <Button className="w-full">Login</Button>
        <Button variant="outline" className="w-full">Login with Google</Button>
        <p className="mt-4 text-center text-sm">Don't have an account? <a href="#" className="underline-offset-4 hover:underline">Sign up</a></p>
    </CardFooter>
</Card>`}
        language="tsx"
      >
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Login to your account</CardTitle>
            <CardDescription>
              Enter your details below to login to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form class="form grid gap-6">
              <div class="grid gap-2">
                <Label for="demo-card-form-email">Email</Label>
                <Input type="email" id="demo-card-form-email" />
              </div>
              <div class="grid gap-2">
                <div class="flex items-center gap-2">
                  <Label for="demo-card-form-password">Password</Label>
                  <a
                    href="#"
                    class="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <Input type="password" id="demo-card-form-password" />
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-2">
            <Button className="w-full">Login</Button>
            <Button variant="outline" className="w-full">
              Login with Google
            </Button>
            <p class="mt-4 text-center text-sm">
              Don't have an account?{" "}
              <a href="#" class="underline-offset-4 hover:underline">
                Sign up
              </a>
            </p>
          </CardFooter>
        </Card>
      </CodePreview>

      <h2
        id="example-basic-structure"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Card with header, content, and footer
      </h2>
      <CodePreview
        code={`<Card>
    <CardHeader>
        <CardTitle>Meeting Notes</CardTitle>
        <CardDescription>Transcript from the meeting with the client.</CardDescription>
    </CardHeader>
    <CardContent>
        <p className="text-sm">Client requested dashboard redesign with focus on mobile responsiveness.</p>
        <ol className="mt-4 flex list-decimal flex-col gap-2 pl-6">
            <li>New analytics widgets for daily/weekly metrics</li>
            <li>Simplified navigation menu</li>
            <li>Dark mode support</li>
            <li>Timeline: 6 weeks</li>
            <li>Follow-up meeting scheduled for next Tuesday</li>
        </ol>
    </CardContent>
    <CardFooter className="flex items-center gap-2">
        <Button variant="outline" className="h-7 text-xs">View Project</Button>
        <Button variant="outline" className="h-7 text-xs">Add Comment</Button>
    </CardFooter>
</Card>`}
        language="tsx"
      >
        <Card>
          <CardHeader>
            <CardTitle>Meeting Notes</CardTitle>
            <CardDescription>
              Transcript from the meeting with the client.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Client requested dashboard redesign with focus on mobile
              responsiveness.
            </p>
            <ol className="mt-4 flex list-decimal flex-col gap-2 pl-6">
              <li>New analytics widgets for daily/weekly metrics</li>
              <li>Simplified navigation menu</li>
              <li>Dark mode support</li>
              <li>Timeline: 6 weeks</li>
              <li>Follow-up meeting scheduled for next Tuesday</li>
            </ol>
          </CardContent>
          <CardFooter className="flex items-center gap-2">
            <Button variant="outline" className="h-7 text-xs">
              View Project
            </Button>
            <Button variant="outline" className="h-7 text-xs">
              Add Comment
            </Button>
          </CardFooter>
        </Card>
      </CodePreview>

      <h2
        id="example-with-image"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Card with image
      </h2>
      <CodePreview
        code={`<Card>
    <CardHeader>
        <CardTitle>Is this an image?</CardTitle>
        <CardDescription>This is a card with an image.</CardDescription>
    </CardHeader>
    <section className="px-0">
                <img
                    alt="Photo by Drew Beamer"
                    width="500"
                    height="500"
                    className="aspect-video w-full object-cover"
                    src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&amp;dpr=2&amp;q=80&amp;w=1080&amp;q=75"
                />
    </Section>
    <CardFooter className="flex items-center gap-2 px-6 pb-6">
        <span className="badge-outline">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" /></svg>
            1
        </span>
        <span className="badge-outline">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4 8 6" /><path d="M17 19v2" /><path d="M2 12h20" /><path d="M7 19v2" /><path d="M9 5 7.621 3.621A2.121 2.121 0 0 0 4 5v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" /></svg>
            2
        </span>
        <span className="badge-outline">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 8 6-3-6-3v10" /><path d="m8 11.99-5.5 3.14a1 1 0 0 0 0 1.74l8.5 4.86a2 2 0 0 0 2 0l8.5-4.86a1 1 0 0 0 0-1.74L16 12" /><path d="m6.49 12.85 11.02 6.3" /><path d="M17.51 12.85 6.5 19.15" /></svg>
            350m²
        </span>
        <span className="ml-auto font-medium tabular-nums">$135,000</span>
    </CardFooter>
</Card>`}
        language="tsx"
      >
        <Card>
          <CardHeader>
            <CardTitle>Is this an image?</CardTitle>
            <CardDescription>This is a card with an image.</CardDescription>
          </CardHeader>
          <section className="px-0">
            <img
              alt="Photo by Drew Beamer"
              width="500"
              height="500"
              className="aspect-video w-full object-cover"
              src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&amp;dpr=2&amp;q=80&amp;w=1080&amp;q=75"
            />
          </section>
          <CardFooter className="flex items-center gap-2 px-6 pb-6">
            <span className="badge-outline">
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
                <path d="M2 4v16" />
                <path d="M2 8h18a2 2 0 0 1 2 2v10" />
                <path d="M2 17h20" />
                <path d="M6 8v9" />
              </svg>
              1
            </span>
            <span className="badge-outline">
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
                <path d="M10 4 8 6" />
                <path d="M17 19v2" />
                <path d="M2 12h20" />
                <path d="M7 19v2" />
                <path d="M9 5 7.621 3.621A2.121 2.121 0 0 0 4 5v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
              </svg>
              2
            </span>
            <span className="badge-outline">
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
                <path d="m12 8 6-3-6-3v10" />
                <path d="m8 11.99-5.5 3.14a1 1 0 0 0 0 1.74l8.5 4.86a2 2 0 0 0 2 0l8.5-4.86a1 1 0 0 0 0-1.74L16 12" />
                <path d="m6.49 12.85 11.02 6.3" />
                <path d="M17.51 12.85 6.5 19.15" />
              </svg>
              350m²
            </span>
            <span className="ml-auto font-medium tabular-nums">$135,000</span>
          </CardFooter>
        </Card>
      </CodePreview>

      <h2
        id="example-with-avatar-group"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Card with avatar group in footer
      </h2>
      <CodePreview
        code={`<Card>
    <CardHeader>
        <CardTitle>Project Team</CardTitle>
        <CardDescription>Core contributors working on this project</CardDescription>
    </CardHeader>
    <CardContent>
        <p className="text-sm">Our team consists of experienced professionals dedicated to delivering quality results.</p>
    </CardContent>
    <CardFooter className="flex items-center justify-between">
        <AvatarGroup>
            <Avatar src="https://github.com/hunvreus.png" alt="@hunvreus" />
            <Avatar src="https://github.com/shadcn.png" alt="@shadcn" />
            <Avatar src="https://github.com/adamwathan.png" alt="@adamwathan" />
            <AvatarFallback className="text-xs">@team</AvatarFallback>
        </AvatarGroup>
        <Button variant="outline" className="text-xs">View All</Button>
    </CardFooter>
</Card>`}
        language="tsx"
      >
        <Card>
          <CardHeader>
            <CardTitle>Project Team</CardTitle>
            <CardDescription>
              Core contributors working on this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Our team consists of experienced professionals dedicated to
              delivering quality results.
            </p>
          </CardContent>
          <CardFooter className="flex items-center justify-between">
            <AvatarGroup>
              <Avatar src="https://github.com/hunvreus.png" alt="@hunvreus" />
              <Avatar src="https://github.com/shadcn.png" alt="@shadcn" />
              <Avatar
                src="https://github.com/adamwathan.png"
                alt="@adamwathan"
              />
              <AvatarFallback className="text-xs">@team</AvatarFallback>
            </AvatarGroup>
            <Button variant="outline" className="text-xs">
              View All
            </Button>
          </CardFooter>
        </Card>
      </CodePreview>

      <h2
        id="example-interactive-card"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Card as a link/interactive card
      </h2>
      <CodePreview
        code={`<a href="#" className="group block">
    <Card className="hover:border-primary hover:shadow transition-all duration-200">
        <CardHeader>
            <CardTitle className="group-hover:text-primary transition-colors">View Documentation</CardTitle>
            <CardDescription>Access comprehensive guides and API references</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm">Explore our extensive documentation to get started quickly with our platform.</p>
        </CardContent>
        <CardFooter>
            <Button variant="ghost" className="w-full">
                Read More
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7"/></svg>
            </Button>
        </CardFooter>
    </Card>
</a>`}
        language="tsx"
      >
        <a href="#" className="group block">
          <Card className="hover:border-primary hover:shadow transition-all duration-200 cursor-pointer">
            <CardHeader>
              <CardTitle className="group-hover:text-primary transition-colors">
                View Documentation
              </CardTitle>
              <CardDescription>
                Access comprehensive guides and API references
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Explore our extensive documentation to get started quickly with
                our platform.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" className="w-full">
                Read More
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
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Button>
            </CardFooter>
          </Card>
        </a>
      </CodePreview>

      <h2
        id="example-card-grid"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Card grid layout
      </h2>
      <CodePreview
        code={`<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    <Card>
        <CardHeader>
            <CardTitle>Analytics</CardTitle>
            <CardDescription>Track your performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm">Monitor your metrics with real-time analytics dashboard.</p>
        </CardContent>
    </Card>
    <Card>
        <CardHeader>
            <CardTitle>Reports</CardTitle>
            <CardDescription>Generate detailed reports</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm">Create comprehensive reports for your stakeholders.</p>
        </CardContent>
    </Card>
    <Card>
        <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Configure your preferences</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm">Customize your experience with flexible settings.</p>
        </CardContent>
    </Card>
</div>`}
        language="tsx"
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>Track your performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Monitor your metrics with real-time analytics dashboard.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Reports</CardTitle>
              <CardDescription>Generate detailed reports</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Create comprehensive reports for your stakeholders.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>Configure your preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Customize your experience with flexible settings.
              </p>
            </CardContent>
          </Card>
        </div>
      </CodePreview>

      <h2
        id="example-horizontal-card"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Horizontal card layout
      </h2>
      <CodePreview
        code={`<div className="flex gap-6 items-start">
    <Card className="flex-1">
        <CardHeader>
            <CardTitle>Horizontal Layout</CardTitle>
            <CardDescription>Wide card design for side-by-side content</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-start gap-6">
                <img
                    alt="Horizontal card example"
                    width="200"
                    height="150"
                    className="aspect-video w-48 shrink-0 object-cover rounded-lg"
                    src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&amp;dpr=2&amp;q=80&amp;w=1080&amp;q=75"
                />
                <div>
                    <h4 className="font-semibold">Project Overview</h4>
                    <p className="mt-2 text-sm text-muted-foreground">
                        This horizontal card layout displays content side-by-side, 
                        making it perfect for product cards, team profiles, and 
                        feature highlights.
                    </p>
                </div>
            </div>
        </CardContent>
        <CardFooter>
            <Button variant="outline" className="w-full">Learn More</Button>
        </CardFooter>
    </Card>
</div>`}
        language="tsx"
      >
        <div className="flex gap-6 items-start">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Horizontal Layout</CardTitle>
              <CardDescription>
                Wide card design for side-by-side content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                <img
                  alt="Horizontal card example"
                  width="200"
                  height="150"
                  className="aspect-video w-48 shrink-0 object-cover rounded-lg"
                  src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&amp;dpr=2&amp;q=80&amp;w=1080&amp;q=75"
                />
                <div>
                  <h4 className="font-semibold">Project Overview</h4>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This horizontal card layout displays content side-by-side,
                    making it perfect for product cards, team profiles, and
                    feature highlights.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                Learn More
              </Button>
            </CardFooter>
          </Card>
        </div>
      </CodePreview>

      <h2
        id="example-no-footer"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Card with only header and content (no footer)
      </h2>
      <CodePreview
        code={`<Card>
    <CardHeader>
        <CardTitle>Quick Summary</CardTitle>
        <CardDescription>Concise information without additional actions</CardDescription>
    </CardHeader>
    <CardContent>
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Revenue</span>
                <span className="font-semibold">$45,231.89</span>
            </div>
            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Users</span>
                <span className="font-semibold">2,350</span>
            </div>
            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Conversion Rate</span>
                <span className="font-semibold">12.5%</span>
            </div>
        </div>
    </CardContent>
</Card>`}
        language="tsx"
      >
        <Card>
          <CardHeader>
            <CardTitle>Quick Summary</CardTitle>
            <CardDescription>
              Concise information without additional actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Total Revenue
                </span>
                <span className="font-semibold">$45,231.89</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Active Users
                </span>
                <span className="font-semibold">2,350</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Conversion Rate
                </span>
                <span className="font-semibold">12.5%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </CodePreview>
    </div>
  );
};
