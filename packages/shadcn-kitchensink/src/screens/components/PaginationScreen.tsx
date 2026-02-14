import type { FC } from "defuss";
import { CodePreview } from "../../components/CodePreview.js";

export const PaginationScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Pagination</h1>
            <p class="text-lg text-muted-foreground">Navigation for paged content.</p>

            <CodePreview code={`<nav role="navigation" aria-label="pagination" className="mx-auto flex w-full justify-center">
  <ul className="flex flex-row items-center gap-1">
    <li>
      <a href="#" className="btn-ghost">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        Previous
      </a>
    </li>
    <li><a href="#" className="btn-icon-ghost">1</a></li>
    <li><a href="#" className="btn-icon-outline">2</a></li>
    <li><a href="#" className="btn-icon-ghost">3</a></li>
    <li>
      <div className="size-9 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
      </div>
    </li>
    <li>
      <a href="#" className="btn-ghost">
        Next
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
      </a>
    </li>
  </ul>
</nav>`} language="tsx">
                <nav role="navigation" aria-label="pagination" class="mx-auto flex w-full justify-center">
                    <ul class="flex flex-row items-center gap-1">
                        <li>
                            <a href="#" class="btn-ghost">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                                Previous
                            </a>
                        </li>
                        <li><a href="#" class="btn-icon-ghost">1</a></li>
                        <li><a href="#" class="btn-icon-outline">2</a></li>
                        <li><a href="#" class="btn-icon-ghost">3</a></li>
                        <li>
                            <div class="size-9 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 shrink-0"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                            </div>
                        </li>
                        <li>
                            <a href="#" class="btn-ghost">
                                Next
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                            </a>
                        </li>
                    </ul>
                </nav>
            </CodePreview>
        </div>
    );
};
