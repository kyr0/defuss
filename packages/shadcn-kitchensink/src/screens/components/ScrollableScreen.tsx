import type { FC } from "defuss";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const ScrollableScreen: FC = () => {
  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold tracking-tight">Scrollable Containers</h1>
      <p class="text-lg text-muted-foreground">
        Demonstrations of scrollable content containers using overflow classes.
      </p>

      <h2
        id="list-scroll"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        List scroll
      </h2>
      <CodePreview
        previewClassName="h-64"
        code={`<div className="max-h-64 overflow-y-auto border rounded-md p-4 space-y-3 scrollbar">
  <h3 className="font-semibold text-sm">Team Members</h3>
  <div className="space-y-2">
    <div className="flex items-center gap-3 p-2 rounded hover:bg-accent/50">
      <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">JD</div>
      <div>
        <p className="text-sm font-medium">John Doe</p>
        <p className="text-xs text-muted-foreground">john@example.com</p>
      </div>
    </div>
    <div className="flex items-center gap-3 p-2 rounded hover:bg-accent/50">
      <div className="h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs">JS</div>
      <div>
        <p className="text-sm font-medium">Jane Smith</p>
        <p className="text-xs text-muted-foreground">jane@example.com</p>
      </div>
    </div>
    <div className="flex items-center gap-3 p-2 rounded hover:bg-accent/50">
      <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">AB</div>
      <div>
        <p className="text-sm font-medium">Alice Brown</p>
        <p className="text-xs text-muted-foreground">alice@example.com</p>
      </div>
    </div>
    <div className="flex items-center gap-3 p-2 rounded hover:bg-accent/50">
      <div className="h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs">CD</div>
      <div>
        <p className="text-sm font-medium">Charlie Davis</p>
        <p className="text-xs text-muted-foreground">charlie@example.com</p>
      </div>
    </div>
    <div className="flex items-center gap-3 p-2 rounded hover:bg-accent/50">
      <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">EF</div>
      <div>
        <p className="text-sm font-medium">Emma Foster</p>
        <p className="text-xs text-muted-foreground">emma@example.com</p>
      </div>
    </div>
    <div className="flex items-center gap-3 p-2 rounded hover:bg-accent/50">
      <div className="h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs">GH</div>
      <div>
        <p className="text-sm font-medium">George Harris</p>
        <p className="text-xs text-muted-foreground">george@example.com</p>
      </div>
    </div>
  </div>
</div>`}
        language="tsx"
      >
        <div class="h-64 overflow-y-auto border rounded-md p-4 space-y-3 scrollbar overscroll-contain">
          <h3 class="font-semibold text-sm">Team Members</h3>
          <div class="space-y-2">
            <div class="flex items-center gap-3 p-2 rounded hover:bg-accent/50">
              <div class="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                JD
              </div>
              <div>
                <p class="text-sm font-medium">John Doe</p>
                <p class="text-xs text-muted-foreground">
                  john@example.com
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3 p-2 rounded hover:bg-accent/50">
              <div class="h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs">
                JS
              </div>
              <div>
                <p class="text-sm font-medium">Jane Smith</p>
                <p class="text-xs text-muted-foreground">
                  jane@example.com
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3 p-2 rounded hover:bg-accent/50">
              <div class="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                AB
              </div>
              <div>
                <p class="text-sm font-medium">Alice Brown</p>
                <p class="text-xs text-muted-foreground">
                  alice@example.com
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3 p-2 rounded hover:bg-accent/50">
              <div class="h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs">
                CD
              </div>
              <div>
                <p class="text-sm font-medium">Charlie Davis</p>
                <p class="text-xs text-muted-foreground">
                  charlie@example.com
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3 p-2 rounded hover:bg-accent/50">
              <div class="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                EF
              </div>
              <div>
                <p class="text-sm font-medium">Emma Foster</p>
                <p class="text-xs text-muted-foreground">
                  emma@example.com
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3 p-2 rounded hover:bg-accent/50">
              <div class="h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs">
                GH
              </div>
              <div>
                <p class="text-sm font-medium">George Harris</p>
                <p class="text-xs text-muted-foreground">
                  george@example.com
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3 p-2 rounded hover:bg-accent/50">
              <div class="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                IK
              </div>
              <div>
                <p class="text-sm font-medium">Ivy Kim</p>
                <p class="text-xs text-muted-foreground">
                  ivy@example.com
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3 p-2 rounded hover:bg-accent/50">
              <div class="h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs">
                JL
              </div>
              <div>
                <p class="text-sm font-medium">Jack Lee</p>
                <p class="text-xs text-muted-foreground">
                  jack@example.com
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3 p-2 rounded hover:bg-accent/50">
              <div class="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                MN
              </div>
              <div>
                <p class="text-sm font-medium">Mia Nguyen</p>
                <p class="text-xs text-muted-foreground">
                  mia@example.com
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3 p-2 rounded hover:bg-accent/50">
              <div class="h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs">
                OP
              </div>
              <div>
                <p class="text-sm font-medium">Owen Park</p>
                <p class="text-xs text-muted-foreground">
                  owen@example.com
                </p>
              </div>
            </div>
          </div>
        </div>
      </CodePreview>

      <h2
        id="grid-scroll"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Grid scroll
      </h2>
      <CodePreview
        previewClassName="h-64"
        code={`<div className="w-full max-w-full overflow-x-auto scrollbar">
  <div className="flex gap-4 min-w-max">
    <div className="flex-shrink-0 w-64 p-4 border rounded-lg">
      <div className="h-32 bg-muted rounded mb-3"></div>
      <div className="font-medium">Card Item 1</div>
      <div className="text-sm text-muted-foreground">Description goes here</div>
    </div>
    <div className="flex-shrink-0 w-64 p-4 border rounded-lg">
      <div className="h-32 bg-muted rounded mb-3"></div>
      <div className="font-medium">Card Item 2</div>
      <div className="text-sm text-muted-foreground">Description goes here</div>
    </div>
    <div className="flex-shrink-0 w-64 p-4 border rounded-lg">
      <div className="h-32 bg-muted rounded mb-3"></div>
      <div className="font-medium">Card Item 3</div>
      <div className="text-sm text-muted-foreground">Description goes here</div>
    </div>
    <div className="flex-shrink-0 w-64 p-4 border rounded-lg">
      <div className="h-32 bg-muted rounded mb-3"></div>
      <div className="font-medium">Card Item 4</div>
      <div className="text-sm text-muted-foreground">Description goes here</div>
    </div>
    <div className="flex-shrink-0 w-64 p-4 border rounded-lg">
      <div className="h-32 bg-muted rounded mb-3"></div>
      <div className="font-medium">Card Item 5</div>
      <div className="text-sm text-muted-foreground">Description goes here</div>
    </div>
    <div className="flex-shrink-0 w-64 p-4 border rounded-lg">
      <div className="h-32 bg-muted rounded mb-3"></div>
      <div className="font-medium">Card Item 6</div>
      <div className="text-sm text-muted-foreground">Description goes here</div>
    </div>
  </div>
</div>`}
        language="tsx"
      >
        <div class="w-full max-w-sm overflow-x-auto scrollbar">
          <div class="flex gap-4 min-w-max">
            <div class="flex-shrink-0 w-64 p-4 border rounded-lg">
              <div class="h-32 bg-muted rounded mb-3"></div>
              <div class="font-medium">Card Item 1</div>
              <div class="text-sm text-muted-foreground">
                Description goes here
              </div>
            </div>
            <div class="flex-shrink-0 w-64 p-4 border rounded-lg">
              <div class="h-32 bg-muted rounded mb-3"></div>
              <div class="font-medium">Card Item 2</div>
              <div class="text-sm text-muted-foreground">
                Description goes here
              </div>
            </div>
            <div class="flex-shrink-0 w-64 p-4 border rounded-lg">
              <div class="h-32 bg-muted rounded mb-3"></div>
              <div class="font-medium">Card Item 3</div>
              <div class="text-sm text-muted-foreground">
                Description goes here
              </div>
            </div>
            <div class="flex-shrink-0 w-64 p-4 border rounded-lg">
              <div class="h-32 bg-muted rounded mb-3"></div>
              <div class="font-medium">Card Item 4</div>
              <div class="text-sm text-muted-foreground">
                Description goes here
              </div>
            </div>
            <div class="flex-shrink-0 w-64 p-4 border rounded-lg">
              <div class="h-32 bg-muted rounded mb-3"></div>
              <div class="font-medium">Card Item 5</div>
              <div class="text-sm text-muted-foreground">
                Description goes here
              </div>
            </div>
            <div class="flex-shrink-0 w-64 p-4 border rounded-lg">
              <div class="h-32 bg-muted rounded mb-3"></div>
              <div class="font-medium">Card Item 6</div>
              <div class="text-sm text-muted-foreground">
                Description goes here
              </div>
            </div>
          </div>
        </div>
      </CodePreview>

      <h2
        id="table-scroll"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Table scroll
      </h2>
      <CodePreview
        previewClassName="h-64"
        code={`<div className="max-h-64 overflow-x-auto scrollbar">
  <table className="table">
    <thead>
      <tr>
        <th>ID</th>
        <th>Name</th>
        <th>Email</th>
        <th>Role</th>
        <th>Permissions</th>
        <th>Created</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="font-medium">001</td>
        <td>John Doe</td>
        <td>john@example.com</td>
        <td>Admin</td>
        <td>Full Access</td>
        <td>2024-01-15</td>
        <td><span className="badge bg-green-500/10 text-green-500">Active</span></td>
      </tr>
      <tr>
        <td class="font-medium">002</td>
        <td>Jane Smith</td>
        <td>jane@example.com</td>
        <td>Editor</td>
        <td>Content Only</td>
        <td>2024-02-20</td>
        <td><span className="badge bg-green-500/10 text-green-500">Active</span></td>
      </tr>
      <tr>
        <td class="font-medium">003</td>
        <td>Alice Brown</td>
        <td>alice@example.com</td>
        <td>Viewer</td>
        <td>Read Only</td>
        <td>2024-03-10</td>
        <td><span className="badge bg-yellow-500/10 text-yellow-500">Pending</span></td>
      </tr>
      <tr>
        <td class="font-medium">004</td>
        <td>Bob Wilson</td>
        <td>bob@example.com</td>
        <td>Editor</td>
        <td>Content Only</td>
        <td>2024-04-05</td>
        <td><span className="badge bg-green-500/10 text-green-500">Active</span></td>
      </tr>
      <tr>
        <td class="font-medium">005</td>
        <td>Carol Taylor</td>
        <td>carol@example.com</td>
        <td>Admin</td>
        <td>Full Access</td>
        <td>2024-05-12</td>
        <td><span className="badge bg-green-500/10 text-green-500">Active</span></td>
      </tr>
    </tbody>
  </table>
</div>`}
        language="tsx"
      >
        <div class="h-64 overflow-auto scrollbar">
          <table class="table min-w-[600px]">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Permissions</th>
                <th>Created</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="font-medium">001</td>
                <td>John Doe</td>
                <td>john@example.com</td>
                <td>Admin</td>
                <td>Full Access</td>
                <td>2024-01-15</td>
                <td>
                  <span class="badge bg-green-500/10 text-green-500">
                    Active
                  </span>
                </td>
              </tr>
              <tr>
                <td class="font-medium">002</td>
                <td>Jane Smith</td>
                <td>jane@example.com</td>
                <td>Editor</td>
                <td>Content Only</td>
                <td>2024-02-20</td>
                <td>
                  <span class="badge bg-green-500/10 text-green-500">
                    Active
                  </span>
                </td>
              </tr>
              <tr>
                <td class="font-medium">003</td>
                <td>Alice Brown</td>
                <td>alice@example.com</td>
                <td>Viewer</td>
                <td>Read Only</td>
                <td>2024-03-10</td>
                <td>
                  <span class="badge bg-yellow-500/10 text-yellow-500">
                    Pending
                  </span>
                </td>
              </tr>
              <tr>
                <td class="font-medium">004</td>
                <td>Bob Wilson</td>
                <td>bob@example.com</td>
                <td>Editor</td>
                <td>Content Only</td>
                <td>2024-04-05</td>
                <td>
                  <span class="badge bg-green-500/10 text-green-500">
                    Active
                  </span>
                </td>
              </tr>
              <tr>
                <td class="font-medium">005</td>
                <td>Carol Taylor</td>
                <td>carol@example.com</td>
                <td>Admin</td>
                <td>Full Access</td>
                <td>2024-05-12</td>
                <td>
                  <span class="badge bg-green-500/10 text-green-500">
                    Active
                  </span>
                </td>
              </tr>
              <tr>
                <td class="font-medium">006</td>
                <td>Daniel Green</td>
                <td>daniel@example.com</td>
                <td>Viewer</td>
                <td>Read Only</td>
                <td>2024-06-01</td>
                <td>
                  <span class="badge bg-yellow-500/10 text-yellow-500">
                    Pending
                  </span>
                </td>
              </tr>
              <tr>
                <td class="font-medium">007</td>
                <td>Ella White</td>
                <td>ella@example.com</td>
                <td>Editor</td>
                <td>Content Only</td>
                <td>2024-06-18</td>
                <td>
                  <span class="badge bg-green-500/10 text-green-500">
                    Active
                  </span>
                </td>
              </tr>
              <tr>
                <td class="font-medium">008</td>
                <td>Finn Carter</td>
                <td>finn@example.com</td>
                <td>Admin</td>
                <td>Full Access</td>
                <td>2024-07-02</td>
                <td>
                  <span class="badge bg-red-500/10 text-red-500">
                    Suspended
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CodePreview>

      <h2
        id="text-scroll"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Text scroll
      </h2>
      <CodePreview
        previewClassName="h-64 items-start justify-start"
        code={`<div className="max-h-64 overflow-y-auto border rounded-lg p-6 scrollbar prose dark:prose-invert max-w-none">
  <h3 className="text-lg font-semibold">Long Content Area</h3>
  <p className="text-sm text-muted-foreground mb-4">
    This is a scrollable text content area with a maximum height.
  </p>
  <p className="text-sm">
    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
    tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
    veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
    commodo consequat.
  </p>
  <p className="text-sm">
    Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
    dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
    proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
  </p>
  <p className="text-sm">
    Sed ut perspiciatis unde omnis iste natus error sit voluptatem
    accusantium doloremque laudantium, totam rem aperiam.
  </p>
  <p className="text-sm">
    Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut
    fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem
    sequi nesciunt.
  </p>
  <p className="text-sm">
    Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet,
    consectetur, adipisci velit.
  </p>
</div>`}
        language="tsx"
      >
        <div class="h-64 overflow-y-auto border rounded-lg p-6">
          <h3 class="text-lg font-semibold">Long Content Area</h3>
          <p class="text-sm text-muted-foreground mb-4">
            This is a scrollable text content area with a maximum height.
          </p>
          <p class="text-sm">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
            enim ad minim veniam, quis nostrud exercitation ullamco laboris
            nisi ut aliquip ex ea commodo consequat.
          </p>
          <p class="text-sm">
            Duis aute irure dolor in reprehenderit in voluptate velit esse
            cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
            cupidatat non proident, sunt in culpa qui officia deserunt mollit
            anim id est laborum.
          </p>
          <p class="text-sm">
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem
            accusantium doloremque laudantium, totam rem aperiam.
          </p>
          <p class="text-sm">
            Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit
            aut fugit, sed quia consequuntur magni dolores eos qui ratione
            voluptatem sequi nesciunt.
          </p>
          <p class="text-sm">
            Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet,
            consectetur, adipisci velit.
          </p>
          <p class="text-sm">
            Integer nec odio. Praesent libero. Sed cursus ante dapibus diam.
            Sed nisi. Nulla quis sem at nibh elementum imperdiet.
          </p>
          <p class="text-sm">
            Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue
            semper porta. Mauris massa.
          </p>
        </div>
      </CodePreview>

      <h2
        id="card-scroll"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Card scroll
      </h2>
      <CodePreview
        previewClassName="h-64 items-start justify-start"
        code={`<div className="w-full max-w-full overflow-x-auto scrollbar">
  <div className="flex gap-4 min-w-max">
    <Card className="min-w-[280px] w-[280px]">
      <CardHeader>
        <CardTitle className="text-base">Credit Card</CardTitle>
        <CardDescription className="text-xs">•••• •••• •••• 4242</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="py-2">
          <div className="text-xs text-muted-foreground">Cardholder</div>
          <div className="font-medium">John Doe</div>
        </div>
        <div className="py-2">
          <div className="text-xs text-muted-foreground">Expires</div>
          <div className="font-medium">12/28</div>
        </div>
      </CardContent>
    </Card>
    <Card className="min-w-[280px] w-[280px]">
      <CardHeader>
        <CardTitle className="text-base">Debit Card</CardTitle>
        <CardDescription className="text-xs">•••• •••• •••• 8899</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="py-2">
          <div className="text-xs text-muted-foreground">Cardholder</div>
          <div className="font-medium">Jane Smith</div>
        </div>
        <div className="py-2">
          <div className="text-xs text-muted-foreground">Expires</div>
          <div className="font-medium">06/27</div>
        </div>
      </CardContent>
    </Card>
    <Card className="min-w-[280px] w-[280px]">
      <CardHeader>
        <CardTitle className="text-base">Business Card</CardTitle>
        <CardDescription className="text-xs">•••• •••• •••• 1234</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="py-2">
          <div className="text-xs text-muted-foreground">Cardholder</div>
          <div className="font-medium">Tech Corp</div>
        </div>
        <div className="py-2">
          <div className="text-xs text-muted-foreground">Expires</div>
          <div className="font-medium">03/29</div>
        </div>
      </CardContent>
    </Card>
  </div>
</div>`}
        language="tsx"
      >
        <div class="w-full max-w-sm overflow-x-auto scrollbar">
          <div class="flex gap-4 min-w-max">
            <Card class="min-w-[280px] w-[280px]">
              <CardHeader>
                <CardTitle class="text-base">Credit Card</CardTitle>
                <CardDescription class="text-xs">
                  •••• •••• •••• 4242
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div class="py-2">
                  <div class="text-xs text-muted-foreground">
                    Cardholder
                  </div>
                  <div class="font-medium">John Doe</div>
                </div>
                <div class="py-2">
                  <div class="text-xs text-muted-foreground">
                    Expires
                  </div>
                  <div class="font-medium">12/28</div>
                </div>
              </CardContent>
            </Card>
            <Card class="min-w-[280px] w-[280px]">
              <CardHeader>
                <CardTitle class="text-base">Debit Card</CardTitle>
                <CardDescription class="text-xs">
                  •••• •••• •••• 8899
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div class="py-2">
                  <div class="text-xs text-muted-foreground">
                    Cardholder
                  </div>
                  <div class="font-medium">Jane Smith</div>
                </div>
                <div class="py-2">
                  <div class="text-xs text-muted-foreground">
                    Expires
                  </div>
                  <div class="font-medium">06/27</div>
                </div>
              </CardContent>
            </Card>
            <Card class="min-w-[280px] w-[280px]">
              <CardHeader>
                <CardTitle class="text-base">Business Card</CardTitle>
                <CardDescription class="text-xs">
                  •••• •••• •••• 1234
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div class="py-2">
                  <div class="text-xs text-muted-foreground">
                    Cardholder
                  </div>
                  <div class="font-medium">Tech Corp</div>
                </div>
                <div class="py-2">
                  <div class="text-xs text-muted-foreground">
                    Expires
                  </div>
                  <div class="font-medium">03/29</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CodePreview>

      <h2
        id="modal-dialog-scroll"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Modal dialog scroll
      </h2>
      <CodePreview
        previewClassName="h-64 items-start justify-start"
        code={`<>
  <DialogTrigger dialogId="demo-scrollable-dialog" className="btn-outline">
    Open Dialog
  </DialogTrigger>
  <Dialog id="demo-scrollable-dialog" className="w-full max-w-2xl" aria-labelledby="demo-scrollable-dialog-title" aria-describedby="demo-scrollable-dialog-description">
    <DialogHeader>
      <DialogTitle id="demo-scrollable-dialog-title">Long Content Dialog</DialogTitle>
      <DialogDescription id="demo-scrollable-dialog-description">
        This dialog can handle scrollable content when the content exceeds
        the viewport height.
      </DialogDescription>
    </DialogHeader>
    <DialogContent class="max-h-[70vh] overflow-hidden">
      <div className="max-h-[45vh] overflow-y-auto pr-2 scrollbar">
        <div className="space-y-4 text-sm">
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
          <p>
            Ut enim ad minim veniam, quis nostrud exercitation ullamco
            laboris nisi ut aliquip ex ea commodo consequat.
          </p>
          <p>
            Duis aute irure dolor in reprehenderit in voluptate velit esse
            cillum dolore eu fugiat nulla pariatur.
          </p>
          <p>
            Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
            officia deserunt mollit anim id est laborum.
          </p>
          <p>
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem
            accusantium doloremque laudantium, totam rem aperiam.
          </p>
          <p>
            Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit
            aut fugit, sed quia consequuntur magni dolores eos qui ratione
            voluptatem sequi nesciunt.
          </p>
          <p>
            Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet,
            consectetur, adipisci velit, sed quia non numquam eius modi
            tempora incidunt ut labore et dolore magnam aliquam quaerat.
          </p>
          <p>
            Ut enim ad minima veniam, quis nostrum exercitationem ullam
            corporis suscipit laboriosam, nisi ut aliquid ex ea commodi
            consequatur.
          </p>
          <p>
            Quis autem vel eum iure reprehenderit qui in ea voluptate velit
            esse quam nihil molestiae consequatur, vel illum qui dolorem eum
            fugiat quo voluptas nulla pariatur?
          </p>
        </div>
      </div>
    </DialogContent>
    <DialogFooter>
      <DialogClose className="btn-outline">Close</DialogClose>
      <Button>Save Changes</Button>
    </DialogFooter>
  </Dialog>
</>`}
        language="tsx"
      >
        <div class="space-y-4">
          <DialogTrigger dialogId="demo-scrollable-dialog" class="btn-outline">
            Open Dialog
          </DialogTrigger>
          <Dialog
            id="demo-scrollable-dialog"
            class="w-full max-w-2xl"
            aria-labelledby="demo-scrollable-dialog-title"
            aria-describedby="demo-scrollable-dialog-description"
          >
            <DialogHeader>
              <DialogTitle id="demo-scrollable-dialog-title">
                Long Content Dialog
              </DialogTitle>
              <DialogDescription id="demo-scrollable-dialog-description">
                This dialog can handle scrollable content when the content
                exceeds the viewport height.
              </DialogDescription>
            </DialogHeader>
            <DialogContent class="max-h-[70vh] overflow-hidden">
              <div class="max-h-[45vh] overflow-y-auto pr-2 scrollbar">
                <div class="space-y-4 text-sm">
                  <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                    Sed do eiusmod tempor incididunt ut labore et dolore magna
                    aliqua.
                  </p>
                  <p>
                    Ut enim ad minim veniam, quis nostrud exercitation ullamco
                    laboris nisi ut aliquip ex ea commodo consequat.
                  </p>
                  <p>
                    Duis aute irure dolor in reprehenderit in voluptate velit
                    esse cillum dolore eu fugiat nulla pariatur.
                  </p>
                  <p>
                    Excepteur sint occaecat cupidatat non proident, sunt in
                    culpa qui officia deserunt mollit anim id est laborum.
                  </p>
                  <p>
                    Sed ut perspiciatis unde omnis iste natus error sit
                    voluptatem accusantium doloremque laudantium, totam rem
                    aperiam.
                  </p>
                  <p>
                    Nemo enim ipsam voluptatem quia voluptas sit aspernatur
                    aut odit aut fugit, sed quia consequuntur magni dolores
                    eos qui ratione voluptatem sequi nesciunt.
                  </p>
                  <p>
                    Neque porro quisquam est, qui dolorem ipsum quia dolor sit
                    amet, consectetur, adipisci velit, sed quia non numquam
                    eius modi tempora incidunt ut labore et dolore magnam
                    aliquam quaerat.
                  </p>
                  <p>
                    Ut enim ad minima veniam, quis nostrum exercitationem ullam
                    corporis suscipit laboriosam, nisi ut aliquid ex ea
                    commodi consequatur.
                  </p>
                  <p>
                    Quis autem vel eum iure reprehenderit qui in ea voluptate
                    velit esse quam nihil molestiae consequatur, vel illum qui
                    dolorem eum fugiat quo voluptas nulla pariatur?
                  </p>
                </div>
              </div>
            </DialogContent>
            <DialogFooter>
              <DialogClose class="btn-outline">Close</DialogClose>
              <Button>Save Changes</Button>
            </DialogFooter>
          </Dialog>
        </div>
      </CodePreview>

      <h2
        id="sidebar-scroll"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Sidebar scroll
      </h2>
      <CodePreview
        previewClassName="h-64 items-start justify-start"
        code={`<>
  <div className="relative h-full w-80 overflow-hidden rounded-lg border">
    <Sidebar id="demo-sidebar-scroll" className="absolute inset-y-0 left-0 w-64 overflow-y-auto [&>nav]:!absolute [&>nav]:!inset-y-0 [&>nav]:!left-0 [&>nav]:!h-full [&>nav]:!w-64 scrollbar-thin" initialOpen>
      <SidebarHeader className="p-4 border-b sticky top-0 bg-card">
        <h2 className="font-semibold">Sidebar Navigation</h2>
      </SidebarHeader>
      <SidebarContent className="p-3 space-y-6">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs font-medium">Main</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem><SidebarMenuButton href="#">Dashboard</SidebarMenuButton></SidebarMenuItem>
            <SidebarMenuItem><SidebarMenuButton href="#">Projects</SidebarMenuButton></SidebarMenuItem>
            <SidebarMenuItem><SidebarMenuButton href="#">Tasks</SidebarMenuButton></SidebarMenuItem>
            <SidebarMenuItem><SidebarMenuButton href="#">Calendar</SidebarMenuButton></SidebarMenuItem>
            <SidebarMenuItem><SidebarMenuButton href="#">Messages</SidebarMenuButton></SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs font-medium">Team</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem><SidebarMenuButton href="#">Team Members</SidebarMenuButton></SidebarMenuItem>
            <SidebarMenuItem><SidebarMenuButton href="#">Groups</SidebarMenuButton></SidebarMenuItem>
            <SidebarMenuItem><SidebarMenuButton href="#">Permissions</SidebarMenuButton></SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t text-xs text-muted-foreground sticky bottom-0 bg-card">
        v1.0.0
      </SidebarFooter>
    </Sidebar>
    <main className="pl-64 h-full bg-muted/20 p-4">
      <h3 className="font-semibold mb-4">Main Content</h3>
      <p className="text-sm">The sidebar contains long navigation content that scrolls independently.</p>
    </main>
  </div>
  <SidebarTrigger sidebarId="demo-sidebar-scroll" className="btn-outline mt-3">Toggle sidebar</SidebarTrigger>
</>`}
        language="tsx"
      >
        <div class="relative h-64 w-full max-w-sm overflow-hidden rounded-lg border">
          <Sidebar
            id="demo-sidebar-scroll"
            class="absolute inset-y-0 left-0 w-64 overflow-y-auto [&>nav]:!absolute [&>nav]:!inset-y-0 [&>nav]:!left-0 [&>nav]:!h-full [&>nav]:!w-64"
            initialOpen
          >
            <SidebarHeader class="p-4 border-b">
              <h2 class="font-semibold">Sidebar Navigation</h2>
            </SidebarHeader>
            <SidebarContent class="p-3 space-y-6 overflow-y-auto scrollbar">
              <SidebarGroup>
                <SidebarGroupLabel class="px-2 text-xs font-medium">
                  Main
                </SidebarGroupLabel>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton href="#">Dashboard</SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton href="#">Projects</SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton href="#">Tasks</SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton href="#">Calendar</SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton href="#">Messages</SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel class="px-2 text-xs font-medium">
                  Team
                </SidebarGroupLabel>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton href="#">Team Members</SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton href="#">Groups</SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton href="#">Permissions</SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton href="#">Invitations</SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton href="#">Activity Log</SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel class="px-2 text-xs font-medium">
                  Resources
                </SidebarGroupLabel>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton href="#">Documentation</SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton href="#">API Reference</SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton href="#">Changelog</SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton href="#">Roadmap</SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton href="#">Support</SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter class="p-3 border-t text-xs text-muted-foreground">
              v1.0.0
            </SidebarFooter>
          </Sidebar>
          <main class="pl-64 h-full bg-muted/20 p-4">
            <h3 class="font-semibold mb-4">Main Content</h3>
            <p class="text-sm">
              The sidebar contains long navigation content that scrolls
              independently.
            </p>
          </main>
        </div>
      </CodePreview>
    </div>
  );
};
