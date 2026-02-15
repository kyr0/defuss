import type { FC } from "defuss";
import { Form, FormField, Input, Label, Select, Textarea } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const FieldScreen: FC = () => {
  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold tracking-tight">Field</h1>
      <p class="text-lg text-muted-foreground">
        Combine labels, controls, and help text to compose accessible form
        fields.
      </p>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">
        Basic Input
      </h2>
      <CodePreview
        code={`<div class="grid gap-6 w-full max-w-md">
    <div class="grid gap-3">
        <label for="username">Username</label>
        <input id="username" type="text" placeholder="evilrabbit" aria-describedby="username-desc" />
        <p id="username-desc">Choose a unique username for your account.</p>
    </div>

    <div class="grid gap-3">
        <label for="password">Password</label>
        <p id="password-desc">Must be at least 8 characters long.</p>
        <input id="password" type="password" placeholder="••••••••" aria-describedby="password-desc" />
    </div>
</div>`}
        language="tsx"
      >
        <div class="grid gap-6 w-full max-w-md">
          <div class="grid gap-3">
            <Label for="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="evilrabbit"
              aria-describedby="username-desc"
            />
            <p id="username-desc" class="text-muted-foreground text-sm">
              Choose a unique username for your account.
            </p>
          </div>

          <div class="grid gap-3">
            <Label for="password">Password</Label>
            <p id="password-desc" class="text-muted-foreground text-sm">
              Must be at least 8 characters long.
            </p>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              aria-describedby="password-desc"
            />
          </div>
        </div>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8">
        Textarea
      </h2>
      <CodePreview
        code={`<div class="grid gap-6 w-full max-w-md">
    <div class="grid gap-3">
        <label for="feedback">Feedback</label>
        <textarea id="feedback" rows={4} placeholder="Your feedback helps us improve..." aria-describedby="feedback-desc"></textarea>
        <p id="feedback-desc">Share your thoughts about our service.</p>
    </div>
</div>`}
        language="tsx"
      >
        <div class="grid gap-6 w-full max-w-md">
          <div class="grid gap-3">
            <Label for="feedback">Feedback</Label>
            <Textarea
              id="feedback"
              rows={4}
              placeholder="Your feedback helps us improve..."
              aria-describedby="feedback-desc"
            />
            <p id="feedback-desc" class="text-muted-foreground text-sm">
              Share your thoughts about our service.
            </p>
          </div>
        </div>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8">
        Select
      </h2>
      <CodePreview
        code={`<div class="grid gap-6 w-full max-w-md">
    <div class="grid gap-3">
        <label for="department">Department</label>
        <select id="department" class="select w-full" aria-describedby="department-desc">
            <option value="">Choose department</option>
            <option value="engineering">Engineering</option>
            <option value="design">Design</option>
            <option value="marketing">Marketing</option>
            <option value="sales">Sales</option>
            <option value="support">Customer Support</option>
            <option value="hr">Human Resources</option>
            <option value="finance">Finance</option>
            <option value="operations">Operations</option>
        </select>
        <p id="department-desc">Select your department or area of work.</p>
    </div>
</div>`}
        language="tsx"
      >
        <div class="grid gap-6 w-full max-w-md">
          <div class="grid gap-3">
            <Label for="department">Department</Label>
            <Select id="department" aria-describedby="department-desc">
              <option value="">Choose department</option>
              <option value="engineering">Engineering</option>
              <option value="design">Design</option>
              <option value="marketing">Marketing</option>
              <option value="sales">Sales</option>
              <option value="support">Customer Support</option>
              <option value="hr">Human Resources</option>
              <option value="finance">Finance</option>
              <option value="operations">Operations</option>
            </Select>
            <p id="department-desc" class="text-muted-foreground text-sm">
              Select your department or area of work.
            </p>
          </div>
        </div>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8">
        Fieldset with Legend
      </h2>
      <CodePreview
        code={`<form class="w-full max-w-md space-y-6">
    <fieldset class="fieldset">
        <legend>Payment Method</legend>
        <p>All transactions are secure and encrypted</p>
        
        <div role="group" class="field">
            <label for="card-name">Name on Card</label>
            <input id="card-name" type="text" placeholder="Evil Rabbit" required />
        </div>
        
        <div role="group" class="field">
            <label for="card-number">Card Number</label>
            <input id="card-number" type="text" placeholder="1234 5678 9012 3456" aria-describedby="card-number-desc" required />
            <p id="card-number-desc">Enter your 16-digit card number</p>
        </div>
        
        <div class="grid grid-cols-3 gap-4">
            <div role="group" class="field">
                <label for="exp-month">Month</label>
                <select id="exp-month" class="select w-full">
                    <option value="">MM</option>
                    <option value="01">01</option>
                    <option value="02">02</option>
                    <option value="03">03</option>
                    <option value="04">04</option>
                    <option value="05">05</option>
                    <option value="06">06</option>
                    <option value="07">07</option>
                    <option value="08">08</option>
                    <option value="09">09</option>
                    <option value="10">10</option>
                    <option value="11">11</option>
                    <option value="12">12</option>
                </select>
            </div>
            <div role="group" class="field">
                <label for="exp-year">Year</label>
                <select id="exp-year" class="select w-full">
                    <option value="">YYYY</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                    <option value="2028">2028</option>
                    <option value="2029">2029</option>
                </select>
            </div>
            <div role="group" class="field">
                <label for="cvv">CVV</label>
                <input id="cvv" type="text" placeholder="123" required />
            </div>
        </div>
    </fieldset>

    <hr role="separator" class="my-6 border-border" />
    
    <fieldset class="fieldset">
        <legend>Billing Address</legend>
        <p>The billing address associated with your payment method</p>
        
        <div role="group" class="field">
            <label for="same-as-shipping" class="gap-3">
                 <input type="checkbox" id="same-as-shipping" checked={true} />
                Same as shipping address
            </label>
        </div>
    </fieldset>
    
    <fieldset class="fieldset">
        <div role="group" class="field">
            <label for="comments">Comments</label>
            <textarea id="comments" placeholder="Add any additional comments" rows={3}></textarea>
        </div>
    </fieldset>
    
    <div class="flex gap-3">
        <button type="submit" class="btn">Submit</button>
        <button type="button" class="btn-outline">Cancel</button>
    </div>
</form>`}
        language="tsx"
      >
        <form class="w-full max-w-md space-y-6">
          <fieldset class="fieldset">
            <legend>Payment Method</legend>
            <p class="text-muted-foreground">
              All transactions are secure and encrypted
            </p>

            <div role="group" class="field">
              <Label for="card-name">Name on Card</Label>
              <Input
                id="card-name"
                type="text"
                placeholder="Evil Rabbit"
                required
              />
            </div>

            <div role="group" class="field">
              <Label for="card-number">Card Number</Label>
              <Input
                id="card-number"
                type="text"
                placeholder="1234 5678 9012 3456"
                aria-describedby="card-number-desc"
                required
              />
              <p id="card-number-desc" class="text-muted-foreground text-sm">
                Enter your 16-digit card number
              </p>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div role="group" class="field">
                <Label for="exp-month">Month</Label>
                <Select id="exp-month" class="w-full">
                  <option value="">MM</option>
                  <option value="01">01</option>
                  <option value="02">02</option>
                  <option value="03">03</option>
                  <option value="04">04</option>
                  <option value="05">05</option>
                  <option value="06">06</option>
                  <option value="07">07</option>
                  <option value="08">08</option>
                  <option value="09">09</option>
                  <option value="10">10</option>
                  <option value="11">11</option>
                  <option value="12">12</option>
                </Select>
              </div>
              <div role="group" class="field">
                <Label for="exp-year">Year</Label>
                <Select id="exp-year" class="w-full">
                  <option value="">YYYY</option>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                  <option value="2029">2029</option>
                </Select>
              </div>
              <div role="group" class="field">
                <Label for="cvv">CVV</Label>
                <Input id="cvv" type="text" placeholder="123" required />
              </div>
            </div>
          </fieldset>

          <hr role="separator" class="my-6 border-border" />

          <fieldset class="fieldset">
            <legend>Billing Address</legend>
            <p class="text-muted-foreground">
              The billing address associated with your payment method
            </p>

            <div role="group" class="field">
              <Label for="same-as-shipping" class="gap-3">
                <input type="checkbox" id="same-as-shipping" checked={true} />
                Same as shipping address
              </Label>
            </div>
          </fieldset>

          <fieldset class="fieldset">
            <div role="group" class="field">
              <Label for="comments">Comments</Label>
              <Textarea
                id="comments"
                placeholder="Add any additional comments"
                rows={3}
              ></Textarea>
            </div>
          </fieldset>

          <div class="flex gap-3">
            <button type="submit" class="btn">
              Submit
            </button>
            <button type="button" class="btn-outline">
              Cancel
            </button>
          </div>
        </form>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8">
        Horizontal Orientation
      </h2>
      <CodePreview
        code={`<div role="group" class="field" data-orientation="horizontal">
    <section>
        <label for="multi-factor-authentication">Multi-factor authentication</label>
        <p>Enable multi-factor authentication. If you do not have a two-factor device, you can use a one-time code sent to your email.</p>
    </section>
    <input id="multi-factor-authentication" type="checkbox" role="switch" />
</div>`}
        language="tsx"
      >
        <div role="group" class="field" data-orientation="horizontal">
          <section>
            <Label for="multi-factor-authentication">
              Multi-factor authentication
            </Label>
            <p class="text-muted-foreground text-sm">
              Enable multi-factor authentication. If you do not have a
              two-factor device, you can use a one-time code sent to your email.
            </p>
          </section>
          <input
            id="multi-factor-authentication"
            type="checkbox"
            role="switch"
          />
        </div>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8">
        Error State
      </h2>
      <CodePreview
        code={`<div class="grid gap-6 w-full max-w-md">
    <div class="grid gap-3">
        <label for="username-error">Username</label>
         <input id="username-error" type="text" placeholder="evilrabbit" aria-invalid={true} aria-describedby="username-error-msg" />
        <p id="username-error-msg" role="alert">Username is already taken</p>
    </div>
</div>`}
        language="tsx"
      >
        <div class="grid gap-6 w-full max-w-md">
          <div class="grid gap-3">
            <Label for="username-error">Username</Label>
            <Input
              id="username-error"
              type="text"
              placeholder="evilrabbit"
              aria-invalid={true}
              aria-describedby="username-error-msg"
            />
            <p
              id="username-error-msg"
              role="alert"
              class="text-destructive text-sm"
            >
              Username is already taken
            </p>
          </div>
        </div>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8">
        Disabled State
      </h2>
      <CodePreview
        code={`<div class="grid gap-6 w-full max-w-md">
    <div class="grid gap-3">
        <label for="email-disabled">Email</label>
        <input id="email-disabled" type="email" placeholder="name@example.com" disabled />
    </div>

    <div class="grid gap-3">
        <label for="textarea-disabled">Bio</label>
        <textarea id="textarea-disabled" placeholder="Your bio..." rows={3} disabled></textarea>
    </div>
</div>`}
        language="tsx"
      >
        <div class="grid gap-6 w-full max-w-md">
          <div class="grid gap-3">
            <Label for="email-disabled">Email</Label>
            <Input
              id="email-disabled"
              type="email"
              placeholder="name@example.com"
              disabled
            />
          </div>

          <div class="grid gap-3">
            <Label for="textarea-disabled">Bio</Label>
            <Textarea
              id="textarea-disabled"
              placeholder="Your bio..."
              rows={3}
              disabled
            />
          </div>
        </div>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8">
        Responsive Layout
      </h2>
      <CodePreview
        code={`<fieldset class="fieldset">
    <legend>Profile</legend>
    <p>Keep your profile details up to date.</p>

    <hr role="separator" />  

    <div class="flex flex-col gap-7">
        <div role="group" class="field flex-col md:flex-row md:items-center">
            <section class="md:flex-auto">
                <label for="profile-name">Name</label>
                <p id="profile-name-desc">Provide your full name for identification.</p>
            </section>
            <input id="profile-name" type="text" placeholder="Evil Rabbit" aria-describedby="profile-name-desc" class="md:w-auto md:min-w-80" />
        </div>

        <hr role="separator" />

        <div role="group" class="field flex-col md:flex-row md:items-start">
            <section class="md:flex-auto">
                <label for="profile-bio">Message</label>
                <p id="profile-bio-desc">You can write your message here. Keep it short, preferably under 100 characters.</p>
            </section>
            <textarea id="profile-bio" rows={3} placeholder="Hello, world!" aria-describedby="profile-bio-desc" class="md:w-auto md:min-w-80"></textarea>
        </div>

        <hr role="separator" />

        <div role="group" class="field flex-col md:flex-row md:items-center">
            <button type="submit" class="btn md:w-auto">Submit</button>
            <button type="button" class="btn-outline md:w-auto">Cancel</button>
        </div>
    </div>
</fieldset>`}
        language="tsx"
      >
        <fieldset class="fieldset">
          <legend>Profile</legend>
          <p class="text-muted-foreground">
            Keep your profile details up to date.
          </p>

          <hr role="separator" class="my-6 border-border" />

          <div class="flex flex-col gap-7">
            <div
              role="group"
              class="field flex-col md:flex-row md:items-center"
            >
              <section class="md:flex-auto">
                <Label for="profile-name">Name</Label>
                <p id="profile-name-desc" class="text-muted-foreground text-sm">
                  Provide your full name for identification.
                </p>
              </section>
              <Input
                id="profile-name"
                type="text"
                placeholder="Evil Rabbit"
                aria-describedby="profile-name-desc"
                class="md:w-auto md:min-w-80"
              />
            </div>

            <hr role="separator" class="my-6 border-border" />

            <div role="group" class="field flex-col md:flex-row md:items-start">
              <section class="md:flex-auto">
                <Label for="profile-bio">Message</Label>
                <p id="profile-bio-desc" class="text-muted-foreground text-sm">
                  You can write your message here. Keep it short, preferably
                  under 100 characters.
                </p>
              </section>
              <Textarea
                id="profile-bio"
                rows={3}
                placeholder="Hello, world!"
                aria-describedby="profile-bio-desc"
                class="md:w-auto md:min-w-80"
              ></Textarea>
            </div>

            <hr role="separator" class="my-6 border-border" />

            <div
              role="group"
              class="field flex-col md:flex-row md:items-center"
            >
              <button type="submit" class="btn md:w-auto">
                Submit
              </button>
              <button type="button" class="btn-outline md:w-auto">
                Cancel
              </button>
            </div>
          </div>
        </fieldset>
      </CodePreview>
    </div>
  );
};
