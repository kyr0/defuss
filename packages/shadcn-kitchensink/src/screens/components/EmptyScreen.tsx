import type { FC } from "defuss";
import { Button } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const EmptyScreen: FC = () => {
  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold tracking-tight">Empty</h1>
      <p class="text-lg text-muted-foreground">
        A presentational empty state for first-time and no-data views.
      </p>

      <CodePreview
        className="w-full"
        previewClassName="items-start justify-start"
        code={`<div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border border-dashed p-6 text-center text-balance md:p-12 text-neutral-800 dark:text-neutral-300">
  <header className="flex max-w-sm flex-col items-center gap-2 text-center">
    <div className="mb-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-6">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 10.5 8 13l2 2.5" /><path d="m14 10.5 2 2.5-2 2.5" /><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" /></svg>
    </div>
    <h3 className="text-lg font-medium tracking-tight">No Projects Yet</h3>
    <p className="text-muted-foreground [&>a:hover]:text-primary text-sm/relaxed [&>a]:underline [&>a]:underline-offset-4">
      You haven't created any projects yet. Get started by creating your first project.
    </p>
  </header>
  <section className="flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance">
    <div className="flex gap-2">
      <Button>Create Project</Button>
      <Button variant="outline">Import Project</Button>
    </div>
  </section>
  <a href="#" className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] underline-offset-4 hover:underline h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 text-muted-foreground">
    Learn More
  </a>
</div>`}
        language="tsx"
      >
        <div class="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border border-dashed p-6 text-center text-balance md:p-12 text-neutral-800 dark:text-neutral-300">
          <header class="flex max-w-sm flex-col items-center gap-2 text-center">
            <div class="mb-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-6">
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
                <path d="M10 10.5 8 13l2 2.5" />
                <path d="m14 10.5 2 2.5-2 2.5" />
                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
              </svg>
            </div>
            <h3 class="text-lg font-medium tracking-tight">No Projects Yet</h3>
            <p class="text-muted-foreground [&>a:hover]:text-primary text-sm/relaxed [&>a]:underline [&>a]:underline-offset-4">
              You haven&apos;t created any projects yet. Get started by creating
              your first project.
            </p>
          </header>
          <section class="flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance">
            <div class="flex gap-2">
              <Button>Create Project</Button>
              <Button variant="outline">Import Project</Button>
            </div>
          </section>
          <a
            href="#"
            class="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] underline-offset-4 hover:underline h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 text-muted-foreground"
          >
            Learn More
          </a>
        </div>
      </CodePreview>

      <CodePreview
        className="w-full"
        previewClassName="items-start justify-start"
        code={`<div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border border-dashed p-6 text-center text-balance md:p-12 text-neutral-800 dark:text-neutral-300">
  <header className="flex max-w-sm flex-col items-center gap-3 text-center">
    <div className="mb-2 bg-muted text-foreground flex size-12 shrink-0 items-center justify-center rounded-lg [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" /></svg>
    </div>
    <h3 className="text-lg font-semibold tracking-tight">Welcome to Your Dashboard</h3>
    <p className="text-muted-foreground text-sm/relaxed">
      This is your personal workspace. Get started by creating your first item or importing existing data.
    </p>
  </header>
  <section className="flex w-full max-w-sm min-w-0 flex-col items-center gap-3">
    <div className="flex gap-2">
      <Button>Get Started</Button>
      <Button variant="outline">View Tutorial</Button>
    </div>
  </section>
  <div className="text-muted-foreground text-xs">
    New here? Check out our quick start guide.
  </div>
</div>`}
        language="tsx"
      >
        <div class="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border border-dashed p-6 text-center text-balance md:p-12 text-neutral-800 dark:text-neutral-300">
          <header class="flex max-w-sm flex-col items-center gap-3 text-center">
            <div class="mb-2 bg-muted text-foreground flex size-12 shrink-0 items-center justify-center rounded-lg [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6">
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
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold tracking-tight">
              Welcome to Your Dashboard
            </h3>
            <p class="text-muted-foreground text-sm/relaxed">
              This is your personal workspace. Get started by creating your
              first item or importing existing data.
            </p>
          </header>
          <section class="flex w-full max-w-sm min-w-0 flex-col items-center gap-3">
            <div class="flex gap-2">
              <Button>Get Started</Button>
              <Button variant="outline">View Tutorial</Button>
            </div>
          </section>
          <div class="text-muted-foreground text-xs">
            New here? Check out our quick start guide.
          </div>
        </div>
      </CodePreview>

      <CodePreview
        className="w-full"
        previewClassName="items-start justify-start"
        code={`<div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border border-dashed p-6 text-center text-balance md:p-12 text-neutral-800 dark:text-neutral-300">
  <header className="flex max-w-sm flex-col items-center gap-3 text-center">
    <div className="mb-2 text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-lg [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
    </div>
    <h3 className="text-lg font-semibold tracking-tight">No Results Found</h3>
    <p className="text-muted-foreground text-sm/relaxed">
      We couldn't find any items matching your search. Try adjusting your filters or search terms.
    </p>
  </header>
  <section className="flex w-full max-w-sm min-w-0 flex-col items-center gap-3">
    <div className="flex gap-2">
      <Button>Clear Filters</Button>
      <Button variant="outline">View All Items</Button>
    </div>
  </section>
</div>`}
        language="tsx"
      >
        <div class="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border border-dashed p-6 text-center text-balance md:p-12 text-neutral-800 dark:text-neutral-300">
          <header class="flex max-w-sm flex-col items-center gap-3 text-center">
            <div class="mb-2 text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-lg [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6">
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
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold tracking-tight">
              No Results Found
            </h3>
            <p class="text-muted-foreground text-sm/relaxed">
              We couldn't find any items matching your search. Try adjusting
              your filters or search terms.
            </p>
          </header>
          <section class="flex w-full max-w-sm min-w-0 flex-col items-center gap-3">
            <div class="flex gap-2">
              <Button>Clear Filters</Button>
              <Button variant="outline">View All Items</Button>
            </div>
          </section>
        </div>
      </CodePreview>

      <CodePreview
        className="w-full"
        previewClassName="items-start justify-start"
        code={`<div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border border-dashed p-6 text-center text-balance md:p-12 text-neutral-800 dark:text-neutral-300">
  <header className="flex max-w-md flex-col items-center justify-center gap-3 text-center">
    <div className="mb-2 text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-lg [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
    </div>
    <h3 className="text-lg font-semibold tracking-tight">No Data Available</h3>
    <p className="text-muted-foreground text-sm/relaxed">
      Your table is currently empty. Add a new record to get started with your data entry.
    </p>
  </header>
  <section className="flex w-full max-w-sm min-w-0 flex-col items-center gap-3">
    <Button>Add New Record</Button>
  </section>
</div>`}
        language="tsx"
      >
        <div class="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border border-dashed p-6 text-center text-balance md:p-12 text-neutral-800 dark:text-neutral-300">
          <header class="flex max-w-md flex-col items-center justify-center gap-3 text-center">
            <div class="mb-2 text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-lg [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6">
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
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold tracking-tight">
              No Data Available
            </h3>
            <p class="text-muted-foreground text-sm/relaxed">
              Your table is currently empty. Add a new record to get started
              with your data entry.
            </p>
          </header>
          <section class="flex w-full max-w-sm min-w-0 flex-col items-center gap-3">
            <Button>Add New Record</Button>
          </section>
        </div>
      </CodePreview>

      <CodePreview
        className="w-full"
        previewClassName="items-start justify-start"
        code={`<div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border border-dashed p-6 text-center text-balance md:p-12 text-neutral-800 dark:text-neutral-300">
  <header className="flex max-w-md flex-col items-center justify-center gap-3 text-center">
    <div className="mb-2 text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-lg [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    </div>
    <h3 className="text-lg font-semibold tracking-tight">No Team Members</h3>
    <p className="text-muted-foreground text-sm/relaxed">
      Your list is currently empty. Invite team members to collaborate on this project.
    </p>
  </header>
  <section className="flex w-full max-w-sm min-w-0 flex-col items-center gap-3">
    <Button>Add Member</Button>
  </section>
</div>`}
        language="tsx"
      >
        <div class="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border border-dashed p-6 text-center text-balance md:p-12 text-neutral-800 dark:text-neutral-300">
          <header class="flex max-w-md flex-col items-center justify-center gap-3 text-center">
            <div class="mb-2 text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-lg [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6">
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
            </div>
            <h3 class="text-lg font-semibold tracking-tight">
              No Team Members
            </h3>
            <p class="text-muted-foreground text-sm/relaxed">
              Your list is currently empty. Invite team members to collaborate
              on this project.
            </p>
          </header>
          <section class="flex w-full max-w-sm min-w-0 flex-col items-center gap-3">
            <Button>Add Member</Button>
          </section>
        </div>
      </CodePreview>

      <CodePreview
        className="w-full"
        previewClassName="items-start justify-start"
        code={`<div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border border-dashed p-6 text-center text-balance md:p-12 text-neutral-800 dark:text-neutral-300">
  <header className="flex max-w-md flex-col items-center justify-center gap-3 text-center">
    <div className="mb-2 text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-lg [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M8 7h8" /><path d="M8 11h8" /><path d="M8 15h5" /></svg>
    </div>
    <h3 className="text-lg font-semibold tracking-tight">No Cards Created</h3>
    <p className="text-muted-foreground text-sm/relaxed">
      Your card collection is empty. Add a new card to organize your content.
    </p>
  </header>
  <section className="flex w-full max-w-sm min-w-0 flex-col items-center gap-3">
    <Button>Add Card</Button>
  </section>
</div>`}
        language="tsx"
      >
        <div class="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border border-dashed p-6 text-center text-balance md:p-12 text-neutral-800 dark:text-neutral-300">
          <header class="flex max-w-md flex-col items-center justify-center gap-3 text-center">
            <div class="mb-2 text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-lg [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6">
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
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M8 7h8" />
                <path d="M8 11h8" />
                <path d="M8 15h5" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold tracking-tight">
              No Cards Created
            </h3>
            <p class="text-muted-foreground text-sm/relaxed">
              Your card collection is empty. Add a new card to organize your
              content.
            </p>
          </header>
          <section class="flex w-full max-w-sm min-w-0 flex-col items-center gap-3">
            <Button>Add Card</Button>
          </section>
        </div>
      </CodePreview>

      <CodePreview
        className="w-full"
        previewClassName="items-start justify-start"
        code={`<div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border border-dashed p-6 text-center text-balance md:p-12 text-neutral-800 dark:text-neutral-300">
  <header className="flex max-w-md flex-col items-center justify-center gap-3 text-center">
    <div className="mb-2 text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-lg [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 7.375-7.375z" /></svg>
    </div>
    <h3 className="text-lg font-semibold tracking-tight">Feature Disabled</h3>
    <p className="text-muted-foreground text-sm/relaxed">
      This feature is currently unavailable. Please contact support for assistance.
    </p>
  </header>
  <section className="flex w-full max-w-sm min-w-0 flex-col items-center gap-3">
    <Button disabled>Request Access</Button>
  </section>
</div>`}
        language="tsx"
      >
        <div class="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border border-dashed p-6 text-center text-balance md:p-12 text-neutral-800 dark:text-neutral-300">
          <header class="flex max-w-md flex-col items-center justify-center gap-3 text-center">
            <div class="mb-2 text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-lg [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6">
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
                <path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 7.375-7.375z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold tracking-tight">
              Feature Disabled
            </h3>
            <p class="text-muted-foreground text-sm/relaxed">
              This feature is currently unavailable. Please contact support for
              assistance.
            </p>
          </header>
          <section class="flex w-full max-w-sm min-w-0 flex-col items-center gap-3">
            <Button disabled>Request Access</Button>
          </section>
        </div>
      </CodePreview>
    </div>
  );
};
