import type { FC } from "defuss";
import { $, createRef } from "defuss";
import { Input, Label, Select, Textarea } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";
import { rule, transval, access, Rules, type FieldValidationMessage } from "defuss-transval";
import { debounce } from "defuss-runtime"

class ValidationDemoValidators extends Rules {
	matchesPassword(password: string) {
		return ((confirmPassword: string) => {
			if (confirmPassword !== password) {
				return "Passwords do not match";
			}
			return true;
		}) as unknown as Rules & this;
	}
}

export const FormScreen: FC = () => {

	const validationFormRef = createRef<HTMLFormElement>();

	// Validation demo setup with defuss-transval
	type ValidationDemoForm = {
		username: string;
		email: string;
		password: string;
		confirmPassword: string;
	};

	const valForm = access<ValidationDemoForm>();
	const formRule = rule.extend(ValidationDemoValidators);

	const valRefs = {
		username: { input: createRef<HTMLInputElement>(), msg: createRef<HTMLDivElement>() },
		email: { input: createRef<HTMLInputElement>(), msg: createRef<HTMLDivElement>() },
		password: { input: createRef<HTMLInputElement>(), msg: createRef<HTMLDivElement>() },
		confirmPassword: { input: createRef<HTMLInputElement>(), msg: createRef<HTMLDivElement>() },
	};
	const valResultRef = createRef<HTMLDivElement>();

	const updateFieldUI = (key: string, fieldMsgs: FieldValidationMessage[]) => {
		const refs = valRefs[key as keyof typeof valRefs];
		if (!refs) return;
		if (fieldMsgs.length > 0) {
			$(refs.input).attr("aria-invalid", "true");
			$(refs.msg).update(
				<p role="alert" class="text-destructive text-sm">{fieldMsgs[0].message}</p>
			);
		} else {
			$(refs.input).attr("aria-invalid", "false");
			$(refs.msg).update(
				<p class="text-muted-foreground text-sm">Looks good!</p>
			);
		}
	};

	const validateField = async (fieldName: string) => {
		const formValues = $(validationFormRef).form<ValidationDemoForm>();

		// Rebuild transval each call so matchesPassword gets the current password value
		const { isValid, getMessages, getData } = transval(
			formRule(valForm.username).isString().isRequired().isLongerThan(3, true).asString(),
			formRule(valForm.email).isString().isRequired().isEmail().asString(),
			formRule(valForm.password).isString().isRequired().isLongerThan(8, true).asString(),
			formRule(valForm.confirmPassword).isString().isRequired().matchesPassword(formValues.password).asString(),
		);

		await isValid(formValues);

		// Update only the active field
		updateFieldUI(fieldName, getMessages(fieldName));

		// If password changed, also re-validate confirmPassword
		if (fieldName === "password" && formValues.confirmPassword) {
			updateFieldUI("confirmPassword", getMessages("confirmPassword"));
		}
	};

	const runValidation = async () => {
		const formValues = $(validationFormRef).form<ValidationDemoForm>();

		const { isValid, getMessages, getData } = transval(
			formRule(valForm.username).isString().isRequired().isLongerThan(3, true).asString(),
			formRule(valForm.email).isString().isRequired().isEmail().asString(),
			formRule(valForm.password).isString().isRequired().isLongerThan(8, true).asString(),
			formRule(valForm.confirmPassword).isString().isRequired().matchesPassword(formValues.password).asString(),
		);

		if (await isValid(formValues)) {
			const data = getData();
			for (const key of Object.keys(valRefs)) {
				updateFieldUI(key, []);
			}
			$(valResultRef).update(
				<div class="rounded-lg border p-4 bg-muted/50">
					<p class="text-sm font-medium mb-1">Transformed data (via getData()):</p>
					<pre class="text-xs">{JSON.stringify(data, null, 2)}</pre>
				</div>
			);
		} else {
			$(valResultRef).empty();
			for (const key of Object.keys(valRefs)) {
				updateFieldUI(key, getMessages(key));
			}
		}
	};

	const debouncedValidateField = debounce((fieldName: string) => validateField(fieldName), 300);

	const handleInput = (e: Event) => {
		const target = e.target as HTMLInputElement | HTMLTextAreaElement;
		if (target?.name) {
			debouncedValidateField(target.name);
		}
	};

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
              rows={3}
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
              <input
                type="checkbox"
                id="demo-form-switch"
                role="switch"
                aria-checked="false"
              />
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
                aria-checked="false"
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
    <fieldset className="field">
        <Label htmlFor="form-field-username">Username</Label>
        <Input id="form-field-username" type="text" placeholder="evilrabbit" />
        <p id="form-field-username-desc" className="text-muted-foreground text-sm">Choose a unique username for your account.</p>
    </fieldset>

    <fieldset className="field">
        <Label htmlFor="form-field-email">Email</Label>
        <Input id="form-field-email" type="email" placeholder="name@example.com" />
        <p id="form-field-email-desc" className="text-muted-foreground text-sm">We'll never share your email.</p>
    </fieldset>

    <fieldset className="field">
        <Label htmlFor="form-field-bio">Bio</Label>
        <Textarea id="form-field-bio" placeholder="Tell us about yourself..." rows={3} />
        <p id="form-field-bio-desc" className="text-muted-foreground text-sm">Share your story briefly.</p>
    </fieldset>

    <fieldset className="field">
        <Label htmlFor="form-field-country">Country</Label>
        <Select id="form-field-country">
            <option value="">Select a country</option>
            <option value="us">United States</option>
            <option value="uk">United Kingdom</option>
            <option value="ca">Canada</option>
            <option value="au">Australia</option>
        </Select>
    </fieldset>

    <button type="submit" className="btn">Submit</button>
</form>`}
        language="tsx"
      >
        <form class="form grid gap-6">
          <fieldset class="field">
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
          </fieldset>

          <fieldset class="field">
            <Label htmlFor="form-field-email">Email</Label>
            <Input
              id="form-field-email"
              type="email"
              placeholder="name@example.com"
            />
            <p id="form-field-email-desc" class="text-muted-foreground text-sm">
              We'll never share your email.
            </p>
          </fieldset>

          <fieldset class="field">
            <Label htmlFor="form-field-bio">Bio</Label>
            <Textarea
              id="form-field-bio"
              placeholder="Tell us about yourself..."
              rows={3}
            />
            <p id="form-field-bio-desc" class="text-muted-foreground text-sm">
              Share your story briefly.
            </p>
          </fieldset>

          <fieldset class="field">
            <Label htmlFor="form-field-country">Country</Label>
            <Select id="form-field-country">
              <option value="">Select a country</option>
              <option value="us">United States</option>
              <option value="uk">United Kingdom</option>
              <option value="ca">Canada</option>
              <option value="au">Australia</option>
            </Select>
          </fieldset>

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
    <fieldset className="field" data-orientation="horizontal">
        <Label htmlFor="horizontal-username">Username</Label>
        <div>
            <Input id="horizontal-username" type="text" placeholder="evilrabbit" />
            <p className="text-muted-foreground text-sm">Choose a unique username.</p>
        </div>
    </fieldset>

    <fieldset className="field mt-2" data-orientation="horizontal">
        <Label htmlFor="horizontal-email">Email</Label>
        <div>
            <Input id="horizontal-email" type="email" placeholder="name@example.com" />
            <p className="text-muted-foreground text-sm">We'll never share your email.</p>
        </div>
    </fieldset>

    <fieldset className="field mt-2" data-orientation="horizontal">
        <Label htmlFor="horizontal-bio">Bio</Label>
        <div>
            <Textarea id="horizontal-bio" placeholder="Tell us about yourself..." rows={3} />
            <p className="text-muted-foreground text-sm">Share your story briefly.</p>
        </div>
    </fieldset>

    <fieldset className="field mt-2" data-orientation="horizontal">
        <Label htmlFor="horizontal-country">Country</Label>
        <div>
            <Select id="horizontal-country">
                <option value="">Select a country</option>
                <option value="us">United States</option>
                <option value="uk">United Kingdom</option>
            </Select>
        </div>
    </fieldset>

    <button type="submit" className="btn">Submit</button>
</form>`}
        language="tsx"
        className="w-full"
      >
        <form class="form" data-orientation="horizontal">
          <fieldset class="field" data-orientation="horizontal">
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
          </fieldset>

          <fieldset class="field mt-2" data-orientation="horizontal">
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
          </fieldset>

          <fieldset class="field mt-2" data-orientation="horizontal">
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
          </fieldset>

          <fieldset class="field mt-2" data-orientation="horizontal">
            <Label htmlFor="horizontal-country">Country</Label>
            <div>
              <Select id="horizontal-country">
                <option value="">Select a country</option>
                <option value="us">United States</option>
                <option value="uk">United Kingdom</option>
              </Select>
            </div>
          </fieldset>

          <button type="submit" class="btn">
            Submit
          </button>
        </form>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8">
        Form with fieldset and legend
      </h2>
      <CodePreview
        code={`<form className="form grid gap-2">
    <fieldset className="fieldset">
        <legend>Account Information</legend>
        <p>Please fill in your account details below.</p>
        
        <fieldset className="field">
            <Label htmlFor="fieldset-username">Username</Label>
            <Input id="fieldset-username" type="text" placeholder="evilrabbit" />
        </fieldset>
        
        <fieldset className="field">
            <Label htmlFor="fieldset-email">Email</Label>
            <Input id="fieldset-email" type="email" placeholder="name@example.com" />
        </fieldset>
        
        <fieldset className="field">
            <Label htmlFor="fieldset-password">Password</Label>
            <Input id="fieldset-password" type="password" placeholder="••••••••" />
        </fieldset>
    </fieldset>
    
    <fieldset className="fieldset">
        <legend>Profile Details</legend>
        <p>Keep your profile up to date.</p>
        
        <fieldset className="field">
            <Label htmlFor="fieldset-fullname">Full Name</Label>
            <Input id="fieldset-fullname" type="text" placeholder="John Doe" />
        </fieldset>
        
        <fieldset className="field">
            <Label htmlFor="fieldset-location">Location</Label>
            <Input id="fieldset-location" type="text" placeholder="New York, USA" />
        </fieldset>
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

            <fieldset class="field">
              <Label htmlFor="fieldset-username">Username</Label>
              <Input
                id="fieldset-username"
                type="text"
                placeholder="evilrabbit"
              />
            </fieldset>

            <fieldset class="field">
              <Label htmlFor="fieldset-email">Email</Label>
              <Input
                id="fieldset-email"
                type="email"
                placeholder="name@example.com"
              />
            </fieldset>

            <fieldset class="field">
              <Label htmlFor="fieldset-password">Password</Label>
              <Input
                id="fieldset-password"
                type="password"
                placeholder="••••••••"
              />
            </fieldset>
          </fieldset>

          <fieldset class="fieldset">
            <legend>Profile Details</legend>
            <p class="text-muted-foreground">Keep your profile up to date.</p>

            <fieldset class="field">
              <Label htmlFor="fieldset-fullname">Full Name</Label>
              <Input
                id="fieldset-fullname"
                type="text"
                placeholder="John Doe"
              />
            </fieldset>

            <fieldset class="field">
              <Label htmlFor="fieldset-location">Location</Label>
              <Input
                id="fieldset-location"
                type="text"
                placeholder="New York, USA"
              />
            </fieldset>
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
        code={`import { $, createRef } from "defuss";
import { rule, transval, access, Rules } from "defuss-transval";
import { debounce } from "defuss-runtime";

// Custom validator for password confirmation
class FormValidators extends Rules {
    matchesPassword(password: string) {
        return ((confirmPassword: string) => {
            if (confirmPassword !== password) {
                return "Passwords do not match";
            }
            return true;
        }) as unknown as Rules & this;
    }
}

type FormData = {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
};

const formRef = createRef<HTMLFormElement>();
const form = access<FormData>();
const formRule = rule.extend(FormValidators);

const fieldRefs = {
    username: { input: createRef(), msg: createRef() },
    email: { input: createRef(), msg: createRef() },
    password: { input: createRef(), msg: createRef() },
    confirmPassword: { input: createRef(), msg: createRef() },
};

// Helper to update a single field's UI
const updateFieldUI = (key, fieldMsgs) => {
    const refs = fieldRefs[key];
    if (!refs) return;
    if (fieldMsgs.length > 0) {
        $(refs.input).attr("aria-invalid", "true");
        $(refs.msg).update(
            <p role="alert" className="text-destructive text-sm">{fieldMsgs[0].message}</p>
        );
    } else {
        $(refs.input).attr("aria-invalid", "false");
        $(refs.msg).update(
            <p className="text-muted-foreground text-sm">Looks good!</p>
        );
    }
};

// Validate a single field (+ confirmPassword when password changes)
const validateField = async (fieldName) => {
    const values = $(formRef).form<FormData>();

    const { isValid, getMessages } = transval(
        formRule(form.username).isString().isRequired().isLongerThan(3, true).asString(),
        formRule(form.email).isString().isRequired().isEmail().asString(),
        formRule(form.password).isString().isRequired().isLongerThan(8, true).asString(),
        formRule(form.confirmPassword).isString().isRequired()
            .matchesPassword(values.password).asString(),
    );

    await isValid(values);
    updateFieldUI(fieldName, getMessages(fieldName));

    // If password changed, also re-validate confirmPassword
    if (fieldName === "password" && values.confirmPassword) {
        updateFieldUI("confirmPassword", getMessages("confirmPassword"));
    }
};

// Debounce per-field validation at 300ms
const debouncedValidateField = debounce((name) => validateField(name), 300);

const handleInput = (e) => {
    const target = e.target;
    if (target?.name) debouncedValidateField(target.name);
};

// Full validation on submit
const runValidation = async () => {
    const values = $(formRef).form<FormData>();
    const { isValid, getMessages, getData } = transval(
        formRule(form.username).isString().isRequired().isLongerThan(3, true).asString(),
        formRule(form.email).isString().isRequired().isEmail().asString(),
        formRule(form.password).isString().isRequired().isLongerThan(8, true).asString(),
        formRule(form.confirmPassword).isString().isRequired()
            .matchesPassword(values.password).asString(),
    );
    if (await isValid(values)) {
        for (const key of Object.keys(fieldRefs)) updateFieldUI(key, []);
    } else {
        for (const key of Object.keys(fieldRefs)) updateFieldUI(key, getMessages(key));
    }
};

<form className="form grid gap-6" ref={formRef} onInput={handleInput}>
    <fieldset className="field">
        <Label htmlFor="val-username">Username</Label>
        <Input name="username" id="val-username" type="text"
            placeholder="evilrabbit" ref={fieldRefs.username.input} />
        <div ref={fieldRefs.username.msg}>
            <p className="text-muted-foreground text-sm">At least 3 characters.</p>
        </div>
    </fieldset>

    <fieldset className="field">
        <Label htmlFor="val-email">Email</Label>
        <Input name="email" id="val-email" type="email"
            placeholder="name@example.com" ref={fieldRefs.email.input} />
        <div ref={fieldRefs.email.msg}>
            <p className="text-muted-foreground text-sm">Valid email required.</p>
        </div>
    </fieldset>

    <fieldset className="field">
        <Label htmlFor="val-password">Password</Label>
        <Input name="password" id="val-password" type="password"
            placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" ref={fieldRefs.password.input} />
        <div ref={fieldRefs.password.msg}>
            <p className="text-muted-foreground text-sm">At least 8 characters.</p>
        </div>
    </fieldset>

    <fieldset className="field">
        <Label htmlFor="val-confirm-password">Confirm Password</Label>
        <Input name="confirmPassword" id="val-confirm-password" type="password"
            placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" ref={fieldRefs.confirmPassword.input} />
        <div ref={fieldRefs.confirmPassword.msg}>
            <p className="text-muted-foreground text-sm">Must match password.</p>
        </div>
    </fieldset>

    <button type="button" className="btn" onClick={runValidation}>Submit</button>
</form>`}
        language="tsx"
      >
        <form class="form grid gap-6" ref={validationFormRef} onInput={handleInput}>
          <fieldset class="field">
            <Label htmlFor="val-username">Username</Label>
            <Input
              name="username"
              id="val-username"
              type="text"
              placeholder="evilrabbit"
              ref={valRefs.username.input}
              aria-describedby="val-username-msg"
            />
            <div id="val-username-msg" ref={valRefs.username.msg}>
              <p class="text-muted-foreground text-sm">At least 3 characters.</p>
            </div>
          </fieldset>

          <fieldset class="field">
            <Label htmlFor="val-email">Email</Label>
            <Input
              name="email"
              id="val-email"
              type="email"
              placeholder="name@example.com"
              ref={valRefs.email.input}
              aria-describedby="val-email-msg"
            />
            <div id="val-email-msg" ref={valRefs.email.msg}>
              <p class="text-muted-foreground text-sm">Valid email required.</p>
            </div>
          </fieldset>

          <fieldset class="field">
            <Label htmlFor="val-password">Password</Label>
            <Input
              name="password"
              id="val-password"
              type="password"
              placeholder="••••••••"
              ref={valRefs.password.input}
              aria-describedby="val-password-msg"
            />
            <div id="val-password-msg" ref={valRefs.password.msg}>
              <p class="text-muted-foreground text-sm">At least 8 characters.</p>
            </div>
          </fieldset>

          <fieldset class="field">
            <Label htmlFor="val-confirm-password">Confirm Password</Label>
            <Input
              name="confirmPassword"
              id="val-confirm-password"
              type="password"
              placeholder="••••••••"
              ref={valRefs.confirmPassword.input}
              aria-describedby="val-confirm-password-msg"
            />
            <div id="val-confirm-password-msg" ref={valRefs.confirmPassword.msg}>
              <p class="text-muted-foreground text-sm">Must match password.</p>
            </div>
          </fieldset>

          <div ref={valResultRef}></div>

          <button type="button" class="btn" onClick={runValidation}>
            Submit
          </button>
        </form>
      </CodePreview>

      <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8">
        Form with disabled fields
      </h2>
      <CodePreview
        code={`<form className="form grid gap-6">
    <fieldset className="field">
        <Label htmlFor="disabled-username">Username</Label>
        <Input id="disabled-username" type="text" placeholder="evilrabbit" disabled />
        <p className="text-muted-foreground text-sm">Username cannot be changed.</p>
    </fieldset>

    <fieldset className="field">
        <Label htmlFor="disabled-email">Email</Label>
        <Input id="disabled-email" type="email" placeholder="name@example.com" disabled />
        <p className="text-muted-foreground text-sm">Email is locked.</p>
    </fieldset>

    <fieldset className="field">
        <Label htmlFor="disabled-bio">Bio</Label>
        <Textarea id="disabled-bio" placeholder="Tell us about yourself..." rows={3} disabled />
        <p className="text-muted-foreground text-sm">Bio is read-only.</p>
    </fieldset>

    <fieldset className="field">
        <Label htmlFor="disabled-country">Country</Label>
        <Select id="disabled-country" disabled>
            <option value="">Select a country</option>
            <option value="us">United States</option>
            <option value="uk">United Kingdom</option>
        </Select>
    </fieldset>

    <button type="submit" className="btn">Submit</button>
</form>`}
        language="tsx"
      >
        <form class="form grid gap-6">
          <fieldset class="field">
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
          </fieldset>

          <fieldset class="field">
            <Label htmlFor="disabled-email">Email</Label>
            <Input
              id="disabled-email"
              type="email"
              placeholder="name@example.com"
              disabled
            />
            <p class="text-muted-foreground text-sm">Email is locked.</p>
          </fieldset>

          <fieldset class="field">
            <Label htmlFor="disabled-bio">Bio</Label>
            <Textarea
              id="disabled-bio"
              placeholder="Tell us about yourself..."
              rows={3}
              disabled
            />
            <p class="text-muted-foreground text-sm">Bio is read-only.</p>
          </fieldset>

          <fieldset class="field">
            <Label htmlFor="disabled-country">Country</Label>
            <Select id="disabled-country" disabled>
              <option value="">Select a country</option>
              <option value="us">United States</option>
              <option value="uk">United Kingdom</option>
            </Select>
          </fieldset>

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
    <fieldset className="field flex items-center gap-4" data-orientation="horizontal">
        <Label htmlFor="inline-username">Username</Label>
        <Input id="inline-username" type="text" placeholder="evilrabbit" />
    </fieldset>

    <fieldset className="field flex items-center gap-4" data-orientation="horizontal">
        <Label htmlFor="inline-email">Email</Label>
        <Input id="inline-email" type="email" placeholder="name@example.com" />
    </fieldset>

    <fieldset className="field flex items-center gap-4" data-orientation="horizontal">
        <Label htmlFor="inline-password">Password</Label>
        <Input id="inline-password" type="password" placeholder="••••••••" />
    </fieldset>

    <fieldset className="field flex items-center gap-4" data-orientation="horizontal">
        <Label htmlFor="inline-confirm">Confirm Password</Label>
        <Input id="inline-confirm" type="password" placeholder="••••••••" />
    </fieldset>

    <button type="submit" className="btn">Submit</button>
</form>`}
        language="tsx"
      >
        <form class="form grid gap-6">
          <fieldset
            class="field flex items-center gap-4"
            data-orientation="horizontal"
          >
            <Label htmlFor="inline-username">Username</Label>
            <Input id="inline-username" type="text" placeholder="evilrabbit" />
          </fieldset>

          <fieldset
            class="field flex items-center gap-4"
            data-orientation="horizontal"
          >
            <Label htmlFor="inline-email">Email</Label>
            <Input
              id="inline-email"
              type="email"
              placeholder="name@example.com"
            />
          </fieldset>

          <fieldset
            class="field flex items-center gap-4"
            data-orientation="horizontal"
          >
            <Label htmlFor="inline-password">Password</Label>
            <Input
              id="inline-password"
              type="password"
              placeholder="••••••••"
            />
          </fieldset>

          <fieldset
            class="field flex items-center gap-4"
            data-orientation="horizontal"
          >
            <Label htmlFor="inline-confirm">Confirm Password</Label>
            <Input id="inline-confirm" type="password" placeholder="••••••••" />
          </fieldset>

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
    <fieldset className="field">
        <Label htmlFor="error-username">Username</Label>
        <Input id="error-username" type="text" placeholder="evilrabbit" aria-invalid={true} aria-describedby="error-username-msg" />
        <p id="error-username-msg" role="alert" className="text-destructive text-sm">Username is already taken. Please choose another.</p>
    </fieldset>

    <fieldset className="field">
        <Label htmlFor="error-email">Email</Label>
        <Input id="error-email" type="email" placeholder="name@example.com" aria-invalid={true} aria-describedby="error-email-msg" />
        <p id="error-email-msg" role="alert" className="text-destructive text-sm">This email address is already registered.</p>
    </fieldset>

    <fieldset className="field">
        <Label htmlFor="error-password">Password</Label>
        <Input id="error-password" type="password" placeholder="••••••••" aria-describedby="error-password-msg" />
        <p id="error-password-msg" className="text-muted-foreground text-sm">Must be at least 8 characters with one uppercase letter.</p>
    </fieldset>

    <fieldset className="field">
        <Label htmlFor="error-bio">Bio</Label>
        <Textarea id="error-bio" placeholder="Tell us about yourself..." rows={3} aria-invalid={true} aria-describedby="error-bio-msg" />
        <p id="error-bio-msg" role="alert" className="text-destructive text-sm">Bio is too short. Minimum 10 characters required.</p>
    </fieldset>

    <button type="submit" className="btn">Submit</button>
</form>`}
        language="tsx"
      >
        <form class="form grid gap-6">
          <fieldset class="field">
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
          </fieldset>

          <fieldset class="field">
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
          </fieldset>

          <fieldset class="field">
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
          </fieldset>

          <fieldset class="field">
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
          </fieldset>

          <button type="submit" class="btn">
            Submit
          </button>
        </form>
      </CodePreview>
    </div>
  );
};
