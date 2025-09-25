import UIkit from "uikit";
import { createRef, $, Router } from "defuss";
import { Button, Label } from "defuss-ui";
import {
  rule,
  transval,
  Rules,
  access,
  type FieldValidationMessage,
} from "defuss-transval";
import { InputLabel, InputField, Input, createNotification } from "../../cl";

// target datatype (values will be transformed to this type)
type LoginForm = {
  email: string;
  password: string;
  remember: boolean; // from "0" or "1" of form
};

// Custom validators for this login form
class LoginValidators extends Rules {
  isEmailNotBlacklisted() {
    return (async (email: string) => {
      // async validator custom
      // For demo: simulate some emails as blacklisted
      const blacklistedEmails = ["admin@example.com", "test@test.com"];
      if (blacklistedEmails.includes(email)) {
        return "This email is not allowed. Please use a different email address.";
      }
      return true;
    }) as unknown as Rules & this;
  }

  // some custom password validation for strong passwords
  hasStrongPassword() {
    return ((password: string) => {
      if (password.length < 8) return "Password must be at least 8 characters";
      if (!/[A-Z]/.test(password))
        return "Password must contain at least one uppercase letter";
      if (!/[0-9]/.test(password))
        return "Password must contain at least one number";
      return true;
    }) as unknown as Rules & this;
  }
}

function renderErrorBox(messages: FieldValidationMessage[]) {
  return (
    <div class="uk-alert uk-alert-destructive">
      <h4 class="uk-h6 mb-2">Please fix the following errors:</h4>
      <ul class="list-disc pl-4 space-y-1">
        {messages.map((msg) => (
          <li>
            <strong>{msg.path}:</strong> {msg.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LoginScreen() {
  const signInBtnRef = createRef();
  const continueWithGoogleBtnRef = createRef();
  const formRef = createRef();
  const errorContainerRef = createRef();

  const form = access<LoginForm>();
  const formRule = rule.extend(LoginValidators);

  const { isValid, getMessages, getData } = transval(
    formRule(form.email).isString().isEmail().isEmailNotBlacklisted(),
    formRule(form.password).isString().hasStrongPassword(),
    formRule(form.remember).asBoolean(),
  );

  const clearErrorStyles = (formFields: Array<string>) => {
    // Clear general error container
    $(errorContainerRef).empty().addClass("hidden");

    for (const fieldName of formFields) {
      $(`[data-field-error="${fieldName}"]`).empty();
      $(`input[name="${fieldName}"]`).removeClass("uk-form-destructive");
      $(`label[for="${fieldName}"]`).removeClass("text-destructive");
    }
  };

  const renderFieldError = (fieldName: string, errorMessage?: string) => {
    if (errorMessage) {
      // Render error message
      $(`[data-field-error="${fieldName}"]`).update(
        <div class="uk-anmt-shake uk-form-help text-destructive">
          {errorMessage}
        </div>,
      );

      // Add destructive styling
      $(`input[name="${fieldName}"]`).addClass("uk-form-destructive");
      $(`label[for="${fieldName}"]`).addClass("text-destructive");
    } else {
      // Clear error styling when no errors
      $(`[data-field-error="${fieldName}"]`).empty();
      $(`input[name="${fieldName}"]`).removeClass("uk-form-destructive");
      $(`label[for="${fieldName}"]`).removeClass("text-destructive");
    }
  };

  const handleSignIn = async () => {
    const formValues = await $(formRef).form<LoginForm>();
    console.log("Form values read from DOM:", formValues);

    clearErrorStyles(["email", "password"]);

    // Validate the form data
    if (await isValid(formValues)) {
      // Toast notification for successful login
      createNotification("Login successful!", "success");

      Router.navigate("/dashboard");
    } else {
      const messages = getMessages();

      if (messages.length > 0) {
        $(errorContainerRef)
          .update(renderErrorBox(messages))
          .removeClass("hidden");
      }

      // additionally, render errors for each field too (first error only)
      const formFields = [...new Set(messages.map((msg) => msg.path))];

      for (const fieldName of formFields) {
        const fieldErrors = getMessages(fieldName);
        const errorMessage =
          fieldErrors.length > 0 ? fieldErrors[0].message : undefined;
        renderFieldError(fieldName, errorMessage);
      }

      // Toast notification for general errors
      createNotification("Please fix the errors and try again", "destructive");
    }

    const transformedData: LoginForm = getData();
    console.log("Transformed data:", transformedData);
  };

  // any input in the login form
  $(formRef)
    .query("input")
    .on("keydown", (e) => {
      if ((e as KeyboardEvent).key === "Enter") {
        e.preventDefault();
        handleSignIn();
      }
    });

  return (
    <div class="w-full max-w-sm">
      <div class="flex flex-col items-center gap-2 text-center">
        <h1 class="uk-h4">Sign in to your account</h1>
        <p class="text-muted-foreground">
          Enter your credentials below to login to your account.
        </p>
      </div>
      <form class="mt-6 space-y-6" action="#" ref={formRef} method="POST">
        <div ref={errorContainerRef} class="hidden">
          {/* Dynamic error messages will be rendered here */}
        </div>
        <div class="grid gap-y-1">
          <InputLabel for="email">Email</InputLabel>
          <Input
            id="email"
            name="email"
            value={window.$APP_PROPS?.user?.email ?? ""}
            type="text"
            placeholder="john@example.com"
          />

          <div data-field-error="email">
            {/* Email validation errors will be rendered here */}
          </div>
        </div>
        <div class="grid gap-y-1">
          <label class="uk-form-label" for="password">
            Password
          </label>
          <input
            class="uk-input"
            id="password"
            name="password"
            type="password"
            placeholder="Password"
          />
          <div data-field-error="password">
            {/* Password validation errors will be rendered here */}
          </div>
        </div>
        <div class="uk-text-small flex justify-between">
          <label for="remember">
            <input name="remember" type="hidden" value="0" />
            <input
              class="uk-checkbox mr-1"
              id="remember"
              name="remember"
              type="checkbox"
              value="1"
            />
            Remember me
          </label>
          <a class="uk-link" href="#">
            {" "}
            Can't login?{" "}
          </a>
        </div>

        <Button
          onClick={handleSignIn}
          fullWidth
          className="block"
          type="primary"
        >
          Sign in
        </Button>

        <div class="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
          <span class="text-muted-foreground relative z-10 bg-background px-2">
            Or
          </span>
        </div>
        <button
          ref={continueWithGoogleBtnRef}
          class="uk-btn uk-btn-default w-full"
          type="button"
        >
          Continue with Google
        </button>
      </form>
    </div>
  );
}
