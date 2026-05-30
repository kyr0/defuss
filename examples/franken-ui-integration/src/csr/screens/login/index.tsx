import UIkit from "uikit";
import { createRef, $, Router } from "defuss";
import {
    rule,
    transval,
    access,
    type FieldValidationMessage,
} from "defuss-transval";

import { Input, Checkbox } from "../../../cl/forms/basic";
import { InputLabel } from "../../../cl/forms/input-label";
import { Button } from "../../../cl/components/button";
import { LoginValidators, type LoginForm } from "./validation";
import { getRpcClient } from "defuss-rpc/client.js";
import type { RpcApi } from "../../../rpc";

function FormErrorAlert({ messages }: { messages: FieldValidationMessage[] }) {
    if (messages.length === 0) return null;
    return (
        <div className="uk-alert uk-alert-destructive">
            <h4 className="uk-h6 mb-2">Please fix the following errors:</h4>
            <ul className="list-disc pl-4 space-y-1">
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
    const formRef = createRef();
    const errorContainerRef = createRef();

    // Field refs for direct DOM manipulation (defuss style)
    const refs = {
        email: {
            input: createRef(),
            label: createRef(),
            error: createRef(),
        },
        password: {
            input: createRef(),
            label: createRef(),
            error: createRef(),
        },
    };

    const form = access<LoginForm>();
    const formRule = rule.extend(LoginValidators);

    const { isValid, getMessages, getData } = transval(
        formRule(form.email).isString().isEmail().isEmailNotBlacklisted(),
        formRule(form.password).isString().hasStrongPassword(),
        formRule(form.remember).asBoolean()
    );

    const clearErrors = () => {
        // Clear general error
        $(errorContainerRef).empty().addClass("hidden");

        // Clear field errors
        Object.values(refs).forEach(({ input, label, error }) => {
            $(error).empty();
            $(input).removeClass("uk-form-destructive");
            $(label).removeClass("text-destructive");
        });
    };

    const showFieldError = (field: keyof typeof refs, message: string) => {
        const { input, label, error } = refs[field];

        $(error).update(
            <div className="uk-anmt-shake uk-form-help text-destructive">
                {message}
            </div>
        );
        $(input).addClass("uk-form-destructive");
        $(label).addClass("text-destructive");
    };

    const handleSignIn = async () => {
        const formValues = await $(formRef).form<LoginForm>();
        console.log("Form values read from DOM:", formValues);

        clearErrors();

        // Validate local rules
        if (!(await isValid(formValues))) {
            const messages = getMessages();

            // Show general error box
            if (messages.length > 0) {
                $(errorContainerRef)
                    .update(<FormErrorAlert messages={messages} />)
                    .removeClass("hidden");
            }

            // Show specific field errors
            const uniqueFields = [...new Set(messages.map((m) => m.path))] as (keyof typeof refs)[];

            for (const field of uniqueFields) {
                if (refs[field]) {
                    const fieldMsgs = getMessages(field);
                    if (fieldMsgs.length > 0) {
                        showFieldError(field, fieldMsgs[0].message);
                    }
                }
            }

            UIkit.notification("Please fix the errors and try again", "destructive");
            return;
        }

        // Proceed to backend login
        try {
            // Show loading state
            $(signInBtnRef).attr("disabled", "true");
            const originalBtnText = $(signInBtnRef).text();
            $(signInBtnRef).html('<span class="uk-spinner"></span> Signing in...');

            const rpc = await getRpcClient<RpcApi>();
            const authApi = new rpc.AuthApi();

            const result = await authApi.login(formValues.email, formValues.password);

            if (result.success && result.token) {
                UIkit.notification("Login successful!", "success");

                // Set global app props for session
                if (!window.$APP_PROPS) window.$APP_PROPS = {} as any;
                window.$APP_PROPS.token = result.token;
                window.$APP_PROPS.user = result.user;

                Router.navigate("/dashboard");
            } else {
                // Handle backend error (e.g. invalid credentials)
                $(errorContainerRef)
                    .update(
                        <div className="uk-alert uk-alert-destructive">
                            <h4 className="uk-h6 mb-2">Login Failed</h4>
                            <p>{result.error || "Invalid email or password"}</p>
                        </div>
                    )
                    .removeClass("hidden");

                UIkit.notification(result.error || "Login failed", "destructive");
            }
        } catch (error) {
            console.error("Login error:", error);
            UIkit.notification("An unexpected error occurred", "destructive");
        } finally {
            // Reset button state
            const btn = signInBtnRef.current as HTMLButtonElement | undefined;
            if (btn) btn.disabled = false;

            $(signInBtnRef).text("Sign in"); // Reset to original text
        }
    };

    // Event binding moved to onMount lifecycle - see form element below

    return (
        <div className="w-full max-w-sm">
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="uk-h4">Sign in to your account</h1>
                <p className="text-muted-foreground">
                    Enter your credentials below to login to your account.
                </p>
            </div>

            <form
                className="mt-6 space-y-6"
                action="#"
                ref={formRef}
                method="POST"
                onMount={() => {
                    // Bind keydown to form inputs AFTER form is mounted to DOM
                    $(formRef).query("input").on("keydown", (e) => {
                        if ((e as KeyboardEvent).key === "Enter") {
                            e.preventDefault();
                            handleSignIn();
                        }
                    });
                }}
            >
                {/* General Errors */}
                <div ref={errorContainerRef} className="hidden"></div>

                {/* Email */}
                <div className="grid gap-y-1">
                    <InputLabel htmlFor="email" ref={refs.email.label}>Email</InputLabel>
                    <Input
                        id="email"
                        name="email"
                        type="text"
                        placeholder="john@example.com"
                        ref={refs.email.input}
                    />
                    <div ref={refs.email.error}></div>
                </div>

                {/* Password */}
                <div className="grid gap-y-1">
                    <InputLabel htmlFor="password" ref={refs.password.label}>Password</InputLabel>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Password"
                        ref={refs.password.input}
                    />
                    <div ref={refs.password.error}></div>
                </div>

                {/* Remember Me & Recovery */}
                <div className="uk-text-small flex justify-between items-center">
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input name="remember" type="hidden" value="0" />
                        <Checkbox
                            id="remember"
                            name="remember"
                            value="1"
                            className="mr-1"
                        />
                        Remember me
                    </label>
                    <a className="uk-link" href="#">Can't login?</a>
                </div>

                {/* Action Buttons */}
                <div className="space-y-4">
                    <Button
                        type="primary"
                        fullWidth
                        ref={signInBtnRef}
                        onClick={handleSignIn}
                    >
                        Sign in
                    </Button>

                    <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                        <span className="text-muted-foreground relative z-10 bg-background px-2">
                            Or
                        </span>
                    </div>

                    <Button type="default" fullWidth>
                        Continue with Google
                    </Button>

                    <div className="uk-card uk-card-default uk-card-body uk-text-small p-4 mt-6 bg-muted/50 border border-border">
                        <p className="uk-text-bold mb-2">Demo User:</p>
                        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="font-mono">jane.smith@acme.com</span>
                            <span className="text-muted-foreground">Password:</span>
                            <span className="font-mono">Password123!</span>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
