import { $, createRef, Router } from "defuss";
import { access, rule, transval } from "defuss-transval";
import { setHeaders } from "defuss-rpc/client.js";
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	Card,
	Checkbox,
	Input,
	Label,
	toast,
} from "defuss-shadcn";
import { getRpcClient } from "../../lib/rpc-client";
import { t } from "../../i18n";
import { LoginValidators, type LoginForm } from "./validation";
import { CopyValueButton } from "./copy-value-button";
import { FormErrorAlert } from "./form-error-alert";

/**
 * Login screen with email/password form, demo credentials display,
 * client-side validation via defuss-transval, and RPC-based authentication.
 */
export function LoginScreen() {
	const formRef = createRef<HTMLFormElement>();
	const errorContainerRef = createRef<HTMLDivElement>();
	const successContainerRef = createRef<HTMLDivElement>();

	const refs = {
		email: {
			input: createRef<HTMLInputElement>(),
			label: createRef<HTMLLabelElement>(),
			error: createRef<HTMLDivElement>(),
		},
		password: {
			input: createRef<HTMLInputElement>(),
			label: createRef<HTMLLabelElement>(),
			error: createRef<HTMLDivElement>(),
		},
	};

	const form = access<LoginForm>();
	const formRule = rule.extend(LoginValidators);

	const { isValid, getMessages } = transval(
		formRule(form.email).isString().isEmail().isEmailNotBlacklisted(),
		formRule(form.password).isString().hasStrongPassword(),
		formRule(form.remember).asBoolean(),
	);

	const clearErrors = () => {
		$(errorContainerRef).empty().addClass("hidden");
		$(successContainerRef).empty().addClass("hidden");
		Object.values(refs).forEach(({ input, label, error }) => {
			$(error).empty();
			$(input).attr("aria-invalid", "false");
			$(label).removeClass("text-destructive");
		});
	};

	const showFieldError = (field: keyof typeof refs, message: string) => {
		const { input, label, error } = refs[field];
		$(error).update(<p class="text-sm text-destructive">{message}</p>);
		$(input).attr("aria-invalid", "true");
		$(label).addClass("text-destructive");
	};

	const handleSignIn = async () => {
		const formValues = await $(formRef).form<LoginForm>();
		clearErrors();

		if (!(await isValid(formValues))) {
			const messages = getMessages();
			if (messages.length > 0) {
				$(errorContainerRef).update(<FormErrorAlert messages={messages} />).removeClass("hidden");
			}

			const uniqueFields = [...new Set(messages.map((m) => m.path))] as (keyof typeof refs)[];
			uniqueFields.forEach((field) => {
				if (refs[field]) {
					const fieldMsgs = getMessages(field);
					if (fieldMsgs.length > 0) showFieldError(field, fieldMsgs[0].message);
				}
			});

			toast({ category: "error", title: t("login.validation_failed_title"), description: t("login.validation_failed_description") });
			return;
		}

		try {
			const rpc = await getRpcClient();
			const authApi = new rpc.AuthApi();
			const result = await authApi.login(formValues.email, formValues.password);

			if (result.success && result.token && result.user) {

				if (!window.$APP_PROPS) {
					window.$APP_PROPS = { user: null, tenant: null, token: null };
				}

				window.$APP_PROPS.user = result.user;
				window.$APP_PROPS.token = result.token;

				sessionStorage.setItem("auth_token", result.token);
				sessionStorage.setItem("auth_user", JSON.stringify(result.user));
				setHeaders({ Authorization: `Bearer ${result.token}` });

				$(successContainerRef)
					.update(
						<Alert>
							<AlertTitle>{t("login.sign_in_success_title")}</AlertTitle>
							<AlertDescription>{t("login.sign_in_success_description")}</AlertDescription>
						</Alert>,
					)
					.removeClass("hidden");

				setTimeout(() => {
					Router.navigate("/dashboard");
				}, 150);

			} else {
				$(errorContainerRef)
					.update(
						<Alert variant="destructive">
							<AlertTitle>{t("login.login_failed_title")}</AlertTitle>
							<AlertDescription>{result.error || t("login.login_failed_default")}</AlertDescription>
						</Alert>,
					)
					.removeClass("hidden");
				toast({ category: "error", title: t("login.login_failed_title"), description: result.error || t("login.login_failed_credentials") });
			}
		} catch (error) {
			console.error("Login error:", error);
			toast({ category: "error", title: t("common.unexpected_error"), description: t("common.please_try_again") });
		}
	};

	return (
		<Card className="w-full max-w-md mx-auto">
			<div className="flex flex-col gap-6  mx-5">
				<div className="flex flex-col items-center gap-2 text-center">
					<h1 className="text-2xl font-bold tracking-tight">{t("login.title")}</h1>
					<p className="text-sm text-muted-foreground text-balance">{t("login.description")}</p>
				</div>

				<div ref={successContainerRef} className="hidden" />
				<div ref={errorContainerRef} className="hidden" />

				<form
					ref={formRef}
					className="grid gap-4"
					onMount={() => {
						$(formRef).query("input").on("keydown", (e: Event) => {
							if ((e as KeyboardEvent).key === "Enter") {
								e.preventDefault();
								handleSignIn();
							}
						});
					}}
				>
					<div className="grid gap-2">
						<Label ref={refs.email.label} htmlFor="email">{t("login.email_label")}</Label>
						<Input
							ref={refs.email.input}
							id="email"
							name="email"
							type="email"
							autoComplete="email"
							placeholder={t("login.email_placeholder")}
						/>
						<div ref={refs.email.error} />
					</div>

					<div className="grid gap-2">
						<Label ref={refs.password.label} htmlFor="password">{t("login.password_label")}</Label>
						<Input ref={refs.password.input} id="password" name="password" type="password" placeholder={t("login.password_placeholder")} />
						<div ref={refs.password.error} />
					</div>

					<div className="flex items-center justify-between text-sm">
						<label className="flex items-center gap-2 cursor-pointer">
							<input name="remember" type="hidden" value="0" />
							<Checkbox id="remember" name="remember" value="1" />
							{t("login.remember_me")}
						</label>
					</div>

					<Button type="button" className="w-full font-bold" onClick={handleSignIn}>{t("login.sign_in_button")}</Button>
				</form>

				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<span className="w-full border-t" />
					</div>
					<div className="relative flex justify-center text-xs uppercase">
						<span className="bg-background px-2 text-muted-foreground">{t("login.demo_credentials_title")}</span>
					</div>
				</div>

				<div className="rounded-lg border bg-muted/50 p-4 text-sm">
					<div class="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2">
						<span class="text-muted-foreground">{t("login.demo_email_label")}:</span>
						<code class="font-mono font-medium text-foreground">admin@example.com</code>
						<CopyValueButton label={t("login.demo_email_label")} value="admin@example.com" />

						<span class="text-muted-foreground">{t("login.demo_password_label")}:</span>
						<code class="font-mono font-medium text-foreground">Admin123$</code>
						<CopyValueButton label={t("login.demo_password_label")} value="Admin123$" />
					</div>
				</div>
			</div>
		</Card>
	);
}
