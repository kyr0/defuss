import type { FC } from "defuss";
import { CodePreview } from "../../components/CodePreview.js";

export const InputScreen: FC = () => {
  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold tracking-tight">Input</h1>
      <p class="text-lg text-muted-foreground">Displays a form input field.</p>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">
        Basic input with label
      </h2>
      <CodePreview
        code={`<div className="grid gap-3 max-w-md">
  <label htmlFor="basic-input" className="label">Email</label>
  <input className="input" id="basic-input" type="email" placeholder="Enter your email" />
</div>`}
        language="tsx"
      >
        <div class="grid gap-3 max-w-md">
          <label for="basic-input" class="label">
            Email
          </label>
          <input
            class="input"
            id="basic-input"
            type="email"
            placeholder="Enter your email"
          />
        </div>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">
        Input with different types
      </h2>
      <CodePreview
        code={`<div className="grid gap-4 max-w-md">
  <div className="grid gap-3">
    <label htmlFor="input-email" className="label">Email</label>
    <input className="input" id="input-email" type="email" placeholder="Enter your email" />
  </div>

  <div className="grid gap-3">
    <label htmlFor="input-password" className="label">Password</label>
    <input className="input" id="input-password" type="password" placeholder="Enter your password" />
  </div>

  <div className="grid gap-3">
    <label htmlFor="input-number" className="label">Number</label>
    <input className="input" id="input-number" type="number" placeholder="Enter a number" />
  </div>

  <div className="grid gap-3">
    <label htmlFor="input-tel" className="label">Phone</label>
    <input className="input" id="input-tel" type="tel" placeholder="Enter your phone number" />
  </div>

  <div className="grid gap-3">
    <label htmlFor="input-url" className="label">Website</label>
    <input className="input" id="input-url" type="url" placeholder="Enter your website" />
  </div>
</div>`}
        language="tsx"
      >
        <div class="grid gap-4 max-w-md">
          <div class="grid gap-3">
            <label for="input-email" class="label">
              Email
            </label>
            <input
              class="input"
              id="input-email"
              type="email"
              placeholder="Enter your email"
            />
          </div>

          <div class="grid gap-3">
            <label for="input-password" class="label">
              Password
            </label>
            <input
              class="input"
              id="input-password"
              type="password"
              placeholder="Enter your password"
            />
          </div>

          <div class="grid gap-3">
            <label for="input-number" class="label">
              Number
            </label>
            <input
              class="input"
              id="input-number"
              type="number"
              placeholder="Enter a number"
            />
          </div>

          <div class="grid gap-3">
            <label for="input-tel" class="label">
              Phone
            </label>
            <input
              class="input"
              id="input-tel"
              type="tel"
              placeholder="Enter your phone number"
            />
          </div>

          <div class="grid gap-3">
            <label for="input-url" class="label">
              Website
            </label>
            <input
              class="input"
              id="input-url"
              type="url"
              placeholder="Enter your website"
            />
          </div>
        </div>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">
        Input with button
      </h2>
      <CodePreview
        code={`<div className="flex items-center gap-2 max-w-md">
  <input className="input flex-1" type="email" placeholder="Enter your email" />
  <button type="submit" className="btn">Subscribe</button>
</div>

<div className="flex items-center gap-2 max-w-md">
  <input className="input flex-1" type="text" placeholder="Search..." />
  <button type="submit" className="btn-icon">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
  </button>
</div>`}
        language="tsx"
      >
        <div class="flex items-center gap-2 max-w-md">
          <input
            class="input flex-1"
            type="email"
            placeholder="Enter your email"
          />
          <button type="submit" class="btn">
            Subscribe
          </button>
        </div>

        <div class="flex items-center gap-2 max-w-md">
          <input class="input flex-1" type="text" placeholder="Search..." />
          <button type="submit" class="btn-icon">
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
          </button>
        </div>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">
        Input with clear button
      </h2>
      <CodePreview
        code={`<div className="relative max-w-md" data-cleared="false">
  <input
    type="text"
    className="input pr-9"
    placeholder="Type something..."
    data-cleared="false"
    onInput={(e) => {
      const input = e.currentTarget as HTMLInputElement;
      const container = input.parentElement;
      const button = container?.querySelector<HTMLButtonElement>('button');
      if (button) {
        button.style.visibility = input.value ? 'visible' : 'hidden';
      }
    }}
  />
  <button
    type="button"
    className="absolute right-3 top-1/2 -translate-y-1/2 btn-icon-ghost text-muted-foreground hover:text-accent-foreground size-6 visibility-hidden"
    onClick={(e) => {
      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
      const container = input.parentElement;
      input.value = '';
      input.focus();
      e.currentTarget.style.visibility = 'hidden';
      container?.setAttribute('data-cleared', 'true');
      setTimeout(() => container?.setAttribute('data-cleared', 'false'), 2000);
    }}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hidden data-[cleared=true]:block"><path d="M20 6 9 17l-5-5" /></svg>
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="data-[cleared=true]:hidden"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
  </button>
</div>`}
        language="tsx"
      >
        <div class="relative max-w-md">
          <input
            type="text"
            class="input pr-9"
            placeholder="Type something..."
            data-cleared="false"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 btn-icon-ghost text-muted-foreground hover:text-accent-foreground size-6 visibility-hidden"
          >
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
              class="hidden"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
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
              class="hidden"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">
        Input with password toggle
      </h2>
      <CodePreview
        code={`<div className="relative max-w-md">
  <input
    type="password"
    className="input pr-9"
    placeholder="Enter your password"
  />
  <button
    type="button"
    className="absolute right-3 top-1/2 -translate-y-1/2 btn-icon-ghost text-muted-foreground hover:text-accent-foreground size-6"
    onClick={(e) => {
      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
      input.type = input.type === 'password' ? 'text' : 'password';
    }}
  >
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
      class="toggle-password-eye"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  </button>
</div>`}
        language="tsx"
      >
        <div class="relative max-w-md">
          <input
            type="password"
            class="input pr-9"
            placeholder="Enter your password"
          />
          <button
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 btn-icon-ghost text-muted-foreground hover:text-accent-foreground size-6"
          >
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
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">
        Input with prefix/suffix
      </h2>
      <CodePreview
        code={`<div className="grid gap-4 max-w-md">
  <div className="relative">
    <input className="input pl-12" type="text" placeholder="example.com" />
    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-sm">https://</div>
  </div>

  <div className="relative">
    <input className="input pl-6" type="text" placeholder="Username" />
    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-sm">@</div>
  </div>

  <div className="relative">
    <input className="input pr-14" type="text" placeholder="0.00" />
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-sm">USD</div>
  </div>
</div>`}
        language="tsx"
      >
        <div class="grid gap-4 max-w-md">
          <div class="relative">
            <input class="input pl-12" type="text" placeholder="example.com" />
            <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-sm">
              https://
            </div>
          </div>

          <div class="relative">
            <input class="input pl-6" type="text" placeholder="Username" />
            <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-sm">
              @
            </div>
          </div>

          <div class="relative">
            <input class="input pr-14" type="text" placeholder="0.00" />
            <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-sm">
              USD
            </div>
          </div>
        </div>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">
        Input with character counter
      </h2>
      <CodePreview
        code={`<div className="grid gap-4 max-w-md">
  <div className="relative">
    <textarea className="textarea pr-20 min-h-24" placeholder="Enter your message" onInput={(e) => {
      const textarea = e.currentTarget as HTMLTextAreaElement;
      const counter = textarea.nextElementSibling as HTMLElement;
      const charsLeft = 200 - textarea.value.length;
      counter.textContent = charsLeft + ' characters left';
      counter.className = 'text-sm mt-1 ' + (charsLeft < 0 ? 'text-destructive' : 'text-muted-foreground');
    }}></textarea>
    <div className="absolute right-3 bottom-3 text-sm text-muted-foreground">
      <span className="text-muted-foreground">0</span> / 200
    </div>
  </div>
</div>`}
        language="tsx"
      >
        <div class="grid gap-4 max-w-md">
          <div class="relative">
            <textarea
              class="textarea pr-20 min-h-24"
              placeholder="Enter your message"
            ></textarea>
            <div class="absolute right-3 bottom-3 text-sm text-muted-foreground">
              <span class="text-muted-foreground">0</span> / 200
            </div>
          </div>
        </div>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">
        Disabled input
      </h2>
      <CodePreview
        code={`<div className="grid gap-4 max-w-md">
  <div className="grid gap-3">
    <label htmlFor="disabled-input" className="label">Email</label>
    <input className="input" id="disabled-input" type="email" placeholder="you@example.com" disabled />
  </div>

  <div className="grid gap-3">
    <label htmlFor="disabled-input-value" className="label">Username</label>
    <input className="input" id="disabled-input-value" type="text" value="john_doe" disabled />
  </div>
</div>`}
        language="tsx"
      >
        <div class="grid gap-4 max-w-md">
          <div class="grid gap-3">
            <label for="disabled-input" class="label">
              Email
            </label>
            <input
              class="input"
              id="disabled-input"
              type="email"
              placeholder="you@example.com"
              disabled
            />
          </div>

          <div class="grid gap-3">
            <label for="disabled-input-value" class="label">
              Username
            </label>
            <input
              class="input"
              id="disabled-input-value"
              type="text"
              value="john_doe"
              disabled
            />
          </div>
        </div>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">
        Invalid input with error state
      </h2>
      <CodePreview
        code={`<div className="grid gap-4 max-w-md">
  <div className="grid gap-3">
    <label htmlFor="invalid-input" className="label">Email</label>
    <input className="input" id="invalid-input" type="email" placeholder="Enter your email" aria-invalid="true" />
    <p className="text-destructive text-sm">Please enter a valid email address.</p>
  </div>

  <div className="grid gap-3">
    <label htmlFor="invalid-input-with-icon" className="label">Password</label>
    <input className="input" id="invalid-input-with-icon" type="password" placeholder="Enter your password" aria-invalid="true" />
    <p className="text-destructive text-sm">Password must be at least 8 characters.</p>
  </div>
</div>`}
        language="tsx"
      >
        <div class="grid gap-4 max-w-md">
          <div class="grid gap-3">
            <label for="invalid-input" class="label">
              Email
            </label>
            <input
              class="input"
              id="invalid-input"
              type="email"
              placeholder="Enter your email"
              aria-invalid="true"
            />
            <p class="text-destructive text-sm">
              Please enter a valid email address.
            </p>
          </div>

          <div class="grid gap-3">
            <label for="invalid-input-with-icon" class="label">
              Password
            </label>
            <input
              class="input"
              id="invalid-input-with-icon"
              type="password"
              placeholder="Enter your password"
              aria-invalid="true"
            />
            <p class="text-destructive text-sm">
              Password must be at least 8 characters.
            </p>
          </div>
        </div>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">
        Read-only input
      </h2>
      <CodePreview
        code={`<div className="grid gap-4 max-w-md">
  <div className="grid gap-3">
    <label htmlFor="readonly-input" className="label">Username</label>
    <input className="input" id="readonly-input" type="text" value="john_doe" readOnly />
  </div>

  <div className="grid gap-3">
    <label htmlFor="readonly-link" className="label">Profile URL</label>
    <input className="input" id="readonly-link" type="url" value="https://example.com/users/john_doe" readOnly />
  </div>
</div>`}
        language="tsx"
      >
        <div class="grid gap-4 max-w-md">
          <div class="grid gap-3">
            <label for="readonly-input" class="label">
              Username
            </label>
            <input
              class="input"
              id="readonly-input"
              type="text"
              value="john_doe"
              readOnly
            />
          </div>

          <div class="grid gap-3">
            <label for="readonly-link" class="label">
              Profile URL
            </label>
            <input
              class="input"
              id="readonly-link"
              type="url"
              value="https://example.com/users/john_doe"
              readOnly
            />
          </div>
        </div>
      </CodePreview>
    </div>
  );
};
