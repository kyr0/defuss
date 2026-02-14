import type { FC } from "defuss";
import { CodePreview } from "../../components/CodePreview.js";

export const InputScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Input</h1>
            <p class="text-lg text-muted-foreground">Displays a form input field.</p>
                        <CodePreview code={`<div className="grid gap-6 w-full max-w-md">
    <input className="input" type="email" placeholder="Email" aria-invalid="true" />
    <input className="input" type="email" placeholder="Email" disabled />

    <div className="grid gap-3">
        <label htmlFor="input-with-label" className="label">Label</label>
        <input className="input" id="input-with-label" type="email" placeholder="Email" />
    </div>

    <div className="grid gap-3">
        <label htmlFor="input-with-text" className="label">Label</label>
        <input className="input" id="input-with-text" type="email" placeholder="Email" />
        <p className="text-muted-foreground text-sm">Fill in your email address.</p>
    </div>

    <div className="flex items-center space-x-2">
        <input className="input" type="email" placeholder="Email" />
        <button type="submit" className="btn">Submit</button>
    </div>

    <form className="form space-y-6 w-full">
        <div className="grid gap-3">
            <label htmlFor="input-form" className="label">Username</label>
            <input className="input" id="input-form" type="text" placeholder="hunvreus" />
            <p className="text-muted-foreground text-sm">This is your public display name.</p>
        </div>
        <button type="submit" className="btn">Submit</button>
    </form>
</div>`} language="tsx">
                                <div class="grid gap-6 w-full max-w-md">
                                        <input class="input" type="email" placeholder="Email" aria-invalid="true" />
                                        <input class="input" type="email" placeholder="Email" disabled />

                                        <div class="grid gap-3">
                                                <label for="input-with-label" class="label">Label</label>
                                                <input class="input" id="input-with-label" type="email" placeholder="Email" />
                                        </div>

                                        <div class="grid gap-3">
                                                <label for="input-with-text" class="label">Label</label>
                                                <input class="input" id="input-with-text" type="email" placeholder="Email" />
                                                <p class="text-muted-foreground text-sm">Fill in your email address.</p>
                                        </div>

                                        <div class="flex items-center space-x-2">
                                                <input class="input" type="email" placeholder="Email" />
                                                <button type="submit" class="btn">Submit</button>
                                        </div>

                                        <form class="form space-y-6 w-full">
                                                <div class="grid gap-3">
                                                        <label for="input-form" class="label">Username</label>
                                                        <input class="input" id="input-form" type="text" placeholder="hunvreus" />
                                                        <p class="text-muted-foreground text-sm">This is your public display name.</p>
                                                </div>
                                                <button type="submit" class="btn">Submit</button>
                                        </form>
                                </div>
            </CodePreview>
        </div>
    );
};
