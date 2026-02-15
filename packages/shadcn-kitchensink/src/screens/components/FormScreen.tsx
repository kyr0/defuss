import type { FC } from "defuss";
import { Form, FormField, Input, Label, Select, Textarea } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const FormScreen: FC = () => {
  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold tracking-tight">Form</h1>
      <p class="text-lg text-muted-foreground">
        Build forms with Basecoat-compatible styles and structure.
      </p>
      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">
        Complete form
      </h2>
      <CodePreview
        code={`<form className="form grid gap-6">
    <div className="grid gap-2">
        <label htmlFor="demo-form-text">Username</label>
        <input type="text" id="demo-form-text" placeholder="hunvreus" />
        <p className="text-muted-foreground text-sm">This is your public display name.</p>
    </div>

    <div className="grid gap-2">
        <label htmlFor="demo-form-select">Email</label>
        <select id="demo-form-select">
            <option value="bob@example.com">m@example.com</option>
            <option value="alice@example.com">m@google.com</option>
            <option value="john@example.com">m@support.com</option>
        </select>
        <p className="text-muted-foreground text-sm">You can manage email addresses in your email settings.</p>
    </div>

    <div className="grid gap-2">
        <label htmlFor="demo-form-textarea">Bio</label>
        <textarea id="demo-form-textarea" placeholder="I like to..." rows={3}></textarea>
        <p className="text-muted-foreground text-sm">You can @mention other users and organizations.</p>
    </div>

    <div className="grid gap-2">
        <label htmlFor="demo-form-date">Date of birth</label>
        <input type="date" id="demo-form-date" />
        <p className="text-muted-foreground text-sm">Your date of birth is used to calculate your age.</p>
    </div>

    <div className="flex flex-col gap-3">
        <label htmlFor="demo-form-radio">Notify me about...</label>
        <fieldset id="demo-form-radio" className="grid gap-3">
            <label className="font-normal"><input type="radio" name="demo-form-radio" value="1" checked />All new messages</label>
            <label className="font-normal"><input type="radio" name="demo-form-radio" value="2" />Direct messages and mentions</label>
            <label className="font-normal"><input type="radio" name="demo-form-radio" value="3" />Nothing</label>
        </fieldset>
    </div>

    <section className="grid gap-4">
        <h3 className="text-lg font-medium">Email Notifications</h3>
        <div className="gap-2 flex flex-row items-start justify-between rounded-lg border p-4 shadow-xs">
            <div className="flex flex-col gap-0.5">
                <label htmlFor="demo-form-switch" className="leading-normal">Marketing emails</label>
                <p className="text-muted-foreground text-sm">Receive emails about new products, features, and more.</p>
            </div>
            <input type="checkbox" id="demo-form-switch" role="switch" />
        </div>
        <div className="gap-2 flex flex-row items-start justify-between rounded-lg border p-4 shadow-xs">
            <div className="flex flex-col gap-0.5 opacity-60">
                <label htmlFor="demo-form-switch-disabled" className="leading-normal">Security emails</label>
                <p className="text-muted-foreground text-sm">Receive emails about your account security.</p>
            </div>
            <input type="checkbox" id="demo-form-switch-disabled" role="switch" disabled />
        </div>
    </section>

    <button type="submit" className="btn">Submit</button>
</form>`}
        language="tsx"
      >
        <form class="form grid gap-6">
          <div class="grid gap-2">
            <label for="demo-form-text">Username</label>
            <input type="text" id="demo-form-text" placeholder="hunvreus" />
            <p class="text-muted-foreground text-sm">
              This is your public display name.
            </p>
          </div>

          <div class="grid gap-2">
            <label for="demo-form-select">Email</label>
            <select id="demo-form-select">
              <option value="bob@example.com">m@example.com</option>
              <option value="alice@example.com">m@google.com</option>
              <option value="john@example.com">m@support.com</option>
            </select>
            <p class="text-muted-foreground text-sm">
              You can manage email addresses in your email settings.
            </p>
          </div>

          <div class="grid gap-2">
            <label for="demo-form-textarea">Bio</label>
            <textarea
              id="demo-form-textarea"
              placeholder="I like to..."
              rows="3"
            ></textarea>
            <p class="text-muted-foreground text-sm">
              You can @mention other users and organizations.
            </p>
          </div>

          <div class="grid gap-2">
            <label for="demo-form-date">Date of birth</label>
            <input type="date" id="demo-form-date" />
            <p class="text-muted-foreground text-sm">
              Your date of birth is used to calculate your age.
            </p>
          </div>

          <div class="flex flex-col gap-3">
            <label for="demo-form-radio">Notify me about...</label>
            <fieldset id="demo-form-radio" class="grid gap-3">
              <label class="font-normal">
                <input type="radio" name="demo-form-radio" value="1" checked />
                All new messages
              </label>
              <label class="font-normal">
                <input type="radio" name="demo-form-radio" value="2" />
                Direct messages and mentions
              </label>
              <label class="font-normal">
                <input type="radio" name="demo-form-radio" value="3" />
                Nothing
              </label>
            </fieldset>
          </div>

          <section class="grid gap-4">
            <h3 class="text-lg font-medium">Email Notifications</h3>
            <div class="gap-2 flex flex-row items-start justify-between rounded-lg border p-4 shadow-xs">
              <div class="flex flex-col gap-0.5">
                <label for="demo-form-switch" class="leading-normal">
                  Marketing emails
                </label>
                <p class="text-muted-foreground text-sm">
                  Receive emails about new products, features, and more.
                </p>
              </div>
              <input type="checkbox" id="demo-form-switch" role="switch" />
            </div>
            <div class="gap-2 flex flex-row items-start justify-between rounded-lg border p-4 shadow-xs">
              <div class="flex flex-col gap-0.5 opacity-60">
                <label for="demo-form-switch-disabled" class="leading-normal">
                  Security emails
                </label>
                <p class="text-muted-foreground text-sm">
                  Receive emails about your account security.
                </p>
              </div>
              <input
                type="checkbox"
                id="demo-form-switch-disabled"
                role="switch"
                disabled
              />
            </div>
          </section>

          <button type="submit" class="btn">
            Submit
          </button>
        </form>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8">
        Form with Field component
      </h2>
      <CodePreview
        code={`<form className="form grid gap-6">
    <div role="group" className="field">
        <Label htmlFor="form-field-username">Username</Label>
        <Input id="form-field-username" type="text" placeholder="evilrabbit" />
        <p id="form-field-username-desc" className="text-muted-foreground text-sm">Choose a unique username for your account.</p>
    </div>

    <div role="group" className="field">
        <Label htmlFor="form-field-email">Email</Label>
        <Input id="form-field-email" type="email" placeholder="name@example.com" />
        <p id="form-field-email-desc" className="text-muted-foreground text-sm">We'll never share your email.</p>
    </div>

    <div role="group" className="field">
        <Label htmlFor="form-field-bio">Bio</Label>
        <Textarea id="form-field-bio" placeholder="Tell us about yourself..." rows={3} />
        <p id="form-field-bio-desc" className="text-muted-foreground text-sm">Share your story briefly.</p>
    </div>

    <div role="group" className="field">
        <Label htmlFor="form-field-country">Country</Label>
        <Select id="form-field-country">
            <option value="">Select a country</option>
            <option value="us">United States</option>
            <option value="uk">United Kingdom</option>
            <option value="ca">Canada</option>
            <option value="au">Australia</option>
        </Select>
    </div>

    <button type="submit" className="btn">Submit</button>
</form>`}
        language="tsx"
      >
        <form class="form grid gap-6">
          <div role="group" class="field">
            <Label htmlFor="form-field-username">Username</Label>
            <Input
              id="form-field-username"
              type="text"
              placeholder="evilrabbit"
            />
            <p
              id="form-field-username-desc"
              class="text-muted-foreground text-sm"
            >
              Choose a unique username for your account.
            </p>
          </div>

          <div role="group" class="field">
            <Label htmlFor="form-field-email">Email</Label>
            <Input
              id="form-field-email"
              type="email"
              placeholder="name@example.com"
            />
            <p id="form-field-email-desc" class="text-muted-foreground text-sm">
              We'll never share your email.
            </p>
          </div>

          <div role="group" class="field">
            <Label htmlFor="form-field-bio">Bio</Label>
            <Textarea
              id="form-field-bio"
              placeholder="Tell us about yourself..."
              rows={3}
            />
            <p id="form-field-bio-desc" class="text-muted-foreground text-sm">
              Share your story briefly.
            </p>
          </div>

          <div role="group" class="field">
            <Label htmlFor="form-field-country">Country</Label>
            <Select id="form-field-country">
              <option value="">Select a country</option>
              <option value="us">United States</option>
              <option value="uk">United Kingdom</option>
              <option value="ca">Canada</option>
              <option value="au">Australia</option>
            </Select>
          </div>

          <button type="submit" class="btn">
            Submit
          </button>
        </form>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8">
        Horizontal form layout
      </h2>
      <CodePreview
        code={`<form className="form" data-orientation="horizontal">
    <div role="group" className="field" data-orientation="horizontal">
        <Label htmlFor="horizontal-username">Username</Label>
        <div>
            <Input id="horizontal-username" type="text" placeholder="evilrabbit" />
            <p className="text-muted-foreground text-sm">Choose a unique username.</p>
        </div>
    </div>

    <div role="group" className="field" data-orientation="horizontal">
        <Label htmlFor="horizontal-email">Email</Label>
        <div>
            <Input id="horizontal-email" type="email" placeholder="name@example.com" />
            <p className="text-muted-foreground text-sm">We'll never share your email.</p>
        </div>
    </div>

    <div role="group" className="field" data-orientation="horizontal">
        <Label htmlFor="horizontal-bio">Bio</Label>
        <div>
            <Textarea id="horizontal-bio" placeholder="Tell us about yourself..." rows={3} />
            <p className="text-muted-foreground text-sm">Share your story briefly.</p>
        </div>
    </div>

    <div role="group" className="field" data-orientation="horizontal">
        <Label htmlFor="horizontal-country">Country</Label>
        <div>
            <Select id="horizontal-country">
                <option value="">Select a country</option>
                <option value="us">United States</option>
                <option value="uk">United Kingdom</option>
            </Select>
        </div>
    </div>

    <button type="submit" className="btn">Submit</button>
</form>`}
        language="tsx"
      >
        <form class="form" data-orientation="horizontal">
          <div role="group" class="field" data-orientation="horizontal">
            <Label htmlFor="horizontal-username">Username</Label>
            <div>
              <Input
                id="horizontal-username"
                type="text"
                placeholder="evilrabbit"
              />
              <p class="text-muted-foreground text-sm">
                Choose a unique username.
              </p>
            </div>
          </div>

          <div role="group" class="field" data-orientation="horizontal">
            <Label htmlFor="horizontal-email">Email</Label>
            <div>
              <Input
                id="horizontal-email"
                type="email"
                placeholder="name@example.com"
              />
              <p class="text-muted-foreground text-sm">
                We'll never share your email.
              </p>
            </div>
          </div>

          <div role="group" class="field" data-orientation="horizontal">
            <Label htmlFor="horizontal-bio">Bio</Label>
            <div>
              <Textarea
                id="horizontal-bio"
                placeholder="Tell us about yourself..."
                rows={3}
              />
              <p class="text-muted-foreground text-sm">
                Share your story briefly.
              </p>
            </div>
          </div>

          <div role="group" class="field" data-orientation="horizontal">
            <Label htmlFor="horizontal-country">Country</Label>
            <div>
              <Select id="horizontal-country">
                <option value="">Select a country</option>
                <option value="us">United States</option>
                <option value="uk">United Kingdom</option>
              </Select>
            </div>
          </div>

          <button type="submit" class="btn">
            Submit
          </button>
        </form>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8">
        Form with fieldset and legend
      </h2>
      <CodePreview
        code={`<form className="form grid gap-6">
    <fieldset className="fieldset">
        <legend>Account Information</legend>
        <p>Please fill in your account details below.</p>
        
        <div role="group" className="field">
            <Label htmlFor="fieldset-username">Username</Label>
            <Input id="fieldset-username" type="text" placeholder="evilrabbit" />
        </div>
        
        <div role="group" className="field">
            <Label htmlFor="fieldset-email">Email</Label>
            <Input id="fieldset-email" type="email" placeholder="name@example.com" />
        </div>
        
        <div role="group" className="field">
            <Label htmlFor="fieldset-password">Password</Label>
            <Input id="fieldset-password" type="password" placeholder="••••••••" />
        </div>
    </fieldset>
    
    <fieldset className="fieldset">
        <legend>Profile Details</legend>
        <p>Keep your profile up to date.</p>
        
        <div role="group" className="field">
            <Label htmlFor="fieldset-fullname">Full Name</Label>
            <Input id="fieldset-fullname" type="text" placeholder="John Doe" />
        </div>
        
        <div role="group" className="field">
            <Label htmlFor="fieldset-location">Location</Label>
            <Input id="fieldset-location" type="text" placeholder="New York, USA" />
        </div>
    </fieldset>
    
    <button type="submit" className="btn">Submit</button>
</form>`}
        language="tsx"
      >
        <form class="form grid gap-6">
          <fieldset class="fieldset">
            <legend>Account Information</legend>
            <p class="text-muted-foreground">
              Please fill in your account details below.
            </p>

            <div role="group" class="field">
              <Label htmlFor="fieldset-username">Username</Label>
              <Input
                id="fieldset-username"
                type="text"
                placeholder="evilrabbit"
              />
            </div>

            <div role="group" class="field">
              <Label htmlFor="fieldset-email">Email</Label>
              <Input
                id="fieldset-email"
                type="email"
                placeholder="name@example.com"
              />
            </div>

            <div role="group" class="field">
              <Label htmlFor="fieldset-password">Password</Label>
              <Input
                id="fieldset-password"
                type="password"
                placeholder="••••••••"
              />
            </div>
          </fieldset>

          <fieldset class="fieldset">
            <legend>Profile Details</legend>
            <p class="text-muted-foreground">Keep your profile up to date.</p>

            <div role="group" class="field">
              <Label htmlFor="fieldset-fullname">Full Name</Label>
              <Input
                id="fieldset-fullname"
                type="text"
                placeholder="John Doe"
              />
            </div>

            <div role="group" class="field">
              <Label htmlFor="fieldset-location">Location</Label>
              <Input
                id="fieldset-location"
                type="text"
                placeholder="New York, USA"
              />
            </div>
          </fieldset>

          <button type="submit" class="btn">
            Submit
          </button>
        </form>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8">
        Form with validation states
      </h2>
      <CodePreview
        code={`<form className="form grid gap-6">
    <div role="group" className="field">
        <Label htmlFor="valid-username">Username</Label>
        <Input id="valid-username" type="text" placeholder="validuser" aria-invalid={false} aria-describedby="valid-username-desc" />
        <p id="valid-username-desc" className="text-muted-foreground text-sm">Username is available.</p>
    </div>

    <div role="group" className="field">
        <Label htmlFor="invalid-username">Email</Label>
        <Input id="invalid-username" type="text" placeholder="invalid" aria-invalid={true} aria-describedby="invalid-username-desc" />
        <p id="invalid-username-desc" role="alert" className="text-destructive text-sm">Email is already taken.</p>
    </div>

    <div role="group" className="field">
        <Label htmlFor="valid-password">Password</Label>
        <Input id="valid-password" type="password" placeholder="••••••••" aria-invalid={false} aria-describedby="valid-password-desc" />
        <p id="valid-password-desc" className="text-muted-foreground text-sm">Password meets requirements.</p>
    </div>

    <div role="group" className="field">
        <Label htmlFor="invalid-bio">Bio</Label>
        <Textarea id="invalid-bio" placeholder="Bio..." rows={3} aria-invalid={true} aria-describedby="invalid-bio-desc" />
        <p id="invalid-bio-desc" role="alert" className="text-destructive text-sm">Bio must be at least 10 characters.</p>
    </div>

    <button type="submit" className="btn">Submit</button>
</form>`}
        language="tsx"
      >
        <form class="form grid gap-6">
          <div role="group" class="field">
            <Label htmlFor="valid-username">Username</Label>
            <Input
              id="valid-username"
              type="text"
              placeholder="validuser"
              aria-invalid={false}
              aria-describedby="valid-username-desc"
            />
            <p id="valid-username-desc" class="text-muted-foreground text-sm">
              Username is available.
            </p>
          </div>

          <div role="group" class="field">
            <Label htmlFor="invalid-username">Email</Label>
            <Input
              id="invalid-username"
              type="text"
              placeholder="invalid"
              aria-invalid={true}
              aria-describedby="invalid-username-desc"
            />
            <p
              id="invalid-username-desc"
              role="alert"
              class="text-destructive text-sm"
            >
              Email is already taken.
            </p>
          </div>

          <div role="group" class="field">
            <Label htmlFor="valid-password">Password</Label>
            <Input
              id="valid-password"
              type="password"
              placeholder="••••••••"
              aria-invalid={false}
              aria-describedby="valid-password-desc"
            />
            <p id="valid-password-desc" class="text-muted-foreground text-sm">
              Password meets requirements.
            </p>
          </div>

          <div role="group" class="field">
            <Label htmlFor="invalid-bio">Bio</Label>
            <Textarea
              id="invalid-bio"
              placeholder="Bio..."
              rows={3}
              aria-invalid={true}
              aria-describedby="invalid-bio-desc"
            />
            <p
              id="invalid-bio-desc"
              role="alert"
              class="text-destructive text-sm"
            >
              Bio must be at least 10 characters.
            </p>
          </div>

          <button type="submit" class="btn">
            Submit
          </button>
        </form>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8">
        Form with disabled fields
      </h2>
      <CodePreview
        code={`<form className="form grid gap-6">
    <div role="group" className="field">
        <Label htmlFor="disabled-username">Username</Label>
        <Input id="disabled-username" type="text" placeholder="evilrabbit" disabled />
        <p className="text-muted-foreground text-sm">Username cannot be changed.</p>
    </div>

    <div role="group" className="field">
        <Label htmlFor="disabled-email">Email</Label>
        <Input id="disabled-email" type="email" placeholder="name@example.com" disabled />
        <p className="text-muted-foreground text-sm">Email is locked.</p>
    </div>

    <div role="group" className="field">
        <Label htmlFor="disabled-bio">Bio</Label>
        <Textarea id="disabled-bio" placeholder="Tell us about yourself..." rows={3} disabled />
        <p className="text-muted-foreground text-sm">Bio is read-only.</p>
    </div>

    <div role="group" className="field">
        <Label htmlFor="disabled-country">Country</Label>
        <Select id="disabled-country" disabled>
            <option value="">Select a country</option>
            <option value="us">United States</option>
            <option value="uk">United Kingdom</option>
        </Select>
    </div>

    <button type="submit" className="btn">Submit</button>
</form>`}
        language="tsx"
      >
        <form class="form grid gap-6">
          <div role="group" class="field">
            <Label htmlFor="disabled-username">Username</Label>
            <Input
              id="disabled-username"
              type="text"
              placeholder="evilrabbit"
              disabled
            />
            <p class="text-muted-foreground text-sm">
              Username cannot be changed.
            </p>
          </div>

          <div role="group" class="field">
            <Label htmlFor="disabled-email">Email</Label>
            <Input
              id="disabled-email"
              type="email"
              placeholder="name@example.com"
              disabled
            />
            <p class="text-muted-foreground text-sm">Email is locked.</p>
          </div>

          <div role="group" class="field">
            <Label htmlFor="disabled-bio">Bio</Label>
            <Textarea
              id="disabled-bio"
              placeholder="Tell us about yourself..."
              rows={3}
              disabled
            />
            <p class="text-muted-foreground text-sm">Bio is read-only.</p>
          </div>

          <div role="group" class="field">
            <Label htmlFor="disabled-country">Country</Label>
            <Select id="disabled-country" disabled>
              <option value="">Select a country</option>
              <option value="us">United States</option>
              <option value="uk">United Kingdom</option>
            </Select>
          </div>

          <button type="submit" class="btn">
            Submit
          </button>
        </form>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8">
        Form with inline labels
      </h2>
      <CodePreview
        code={`<form className="form grid gap-6">
    <div role="group" className="field flex items-center gap-4" data-orientation="horizontal">
        <Label htmlFor="inline-username">Username</Label>
        <Input id="inline-username" type="text" placeholder="evilrabbit" />
    </div>

    <div role="group" className="field flex items-center gap-4" data-orientation="horizontal">
        <Label htmlFor="inline-email">Email</Label>
        <Input id="inline-email" type="email" placeholder="name@example.com" />
    </div>

    <div role="group" className="field flex items-center gap-4" data-orientation="horizontal">
        <Label htmlFor="inline-password">Password</Label>
        <Input id="inline-password" type="password" placeholder="••••••••" />
    </div>

    <div role="group" className="field flex items-center gap-4" data-orientation="horizontal">
        <Label htmlFor="inline-confirm">Confirm Password</Label>
        <Input id="inline-confirm" type="password" placeholder="••••••••" />
    </div>

    <button type="submit" className="btn">Submit</button>
</form>`}
        language="tsx"
      >
        <form class="form grid gap-6">
          <div
            role="group"
            class="field flex items-center gap-4"
            data-orientation="horizontal"
          >
            <Label htmlFor="inline-username">Username</Label>
            <Input id="inline-username" type="text" placeholder="evilrabbit" />
          </div>

          <div
            role="group"
            class="field flex items-center gap-4"
            data-orientation="horizontal"
          >
            <Label htmlFor="inline-email">Email</Label>
            <Input
              id="inline-email"
              type="email"
              placeholder="name@example.com"
            />
          </div>

          <div
            role="group"
            class="field flex items-center gap-4"
            data-orientation="horizontal"
          >
            <Label htmlFor="inline-password">Password</Label>
            <Input
              id="inline-password"
              type="password"
              placeholder="••••••••"
            />
          </div>

          <div
            role="group"
            class="field flex items-center gap-4"
            data-orientation="horizontal"
          >
            <Label htmlFor="inline-confirm">Confirm Password</Label>
            <Input id="inline-confirm" type="password" placeholder="••••••••" />
          </div>

          <button type="submit" class="btn">
            Submit
          </button>
        </form>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8">
        Form with error messages for specific fields
      </h2>
      <CodePreview
        code={`<form className="form grid gap-6">
    <div role="group" className="field">
        <Label htmlFor="error-username">Username</Label>
        <Input id="error-username" type="text" placeholder="evilrabbit" aria-invalid={true} aria-describedby="error-username-msg" />
        <p id="error-username-msg" role="alert" className="text-destructive text-sm">Username is already taken. Please choose another.</p>
    </div>

    <div role="group" className="field">
        <Label htmlFor="error-email">Email</Label>
        <Input id="error-email" type="email" placeholder="name@example.com" aria-invalid={true} aria-describedby="error-email-msg" />
        <p id="error-email-msg" role="alert" className="text-destructive text-sm">This email address is already registered.</p>
    </div>

    <div role="group" className="field">
        <Label htmlFor="error-password">Password</Label>
        <Input id="error-password" type="password" placeholder="••••••••" aria-describedby="error-password-msg" />
        <p id="error-password-msg" className="text-muted-foreground text-sm">Must be at least 8 characters with one uppercase letter.</p>
    </div>

    <div role="group" className="field">
        <Label htmlFor="error-bio">Bio</Label>
        <Textarea id="error-bio" placeholder="Tell us about yourself..." rows={3} aria-invalid={true} aria-describedby="error-bio-msg" />
        <p id="error-bio-msg" role="alert" className="text-destructive text-sm">Bio is too short. Minimum 10 characters required.</p>
    </div>

    <button type="submit" className="btn">Submit</button>
</form>`}
        language="tsx"
      >
        <form class="form grid gap-6">
          <div role="group" class="field">
            <Label htmlFor="error-username">Username</Label>
            <Input
              id="error-username"
              type="text"
              placeholder="evilrabbit"
              aria-invalid={true}
              aria-describedby="error-username-msg"
            />
            <p
              id="error-username-msg"
              role="alert"
              class="text-destructive text-sm"
            >
              Username is already taken. Please choose another.
            </p>
          </div>

          <div role="group" class="field">
            <Label htmlFor="error-email">Email</Label>
            <Input
              id="error-email"
              type="email"
              placeholder="name@example.com"
              aria-invalid={true}
              aria-describedby="error-email-msg"
            />
            <p
              id="error-email-msg"
              role="alert"
              class="text-destructive text-sm"
            >
              This email address is already registered.
            </p>
          </div>

          <div role="group" class="field">
            <Label htmlFor="error-password">Password</Label>
            <Input
              id="error-password"
              type="password"
              placeholder="••••••••"
              aria-describedby="error-password-msg"
            />
            <p id="error-password-msg" class="text-muted-foreground text-sm">
              Must be at least 8 characters with one uppercase letter.
            </p>
          </div>

          <div role="group" class="field">
            <Label htmlFor="error-bio">Bio</Label>
            <Textarea
              id="error-bio"
              placeholder="Tell us about yourself..."
              rows={3}
              aria-invalid={true}
              aria-describedby="error-bio-msg"
            />
            <p id="error-bio-msg" role="alert" class="text-destructive text-sm">
              Bio is too short. Minimum 10 characters required.
            </p>
          </div>

          <button type="submit" class="btn">
            Submit
          </button>
        </form>
      </CodePreview>
    </div>
  );
};
