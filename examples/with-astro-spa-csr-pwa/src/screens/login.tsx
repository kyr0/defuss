import { createRef, type Props, T, $, Router } from "defuss";
import { rule, transval, access } from "defuss-transval";
import { Footer } from "../components/footer";
import { InputField } from "../components/input-field";
import { CheckboxField } from "../components/checkbox-field";
import {
	ErrorContainer,
	type ErrorContainerRef,
} from "../components/error-container";
import {
	clearErrorStyles,
	handleValidationErrors,
	LoginValidators,
} from "../lib/form/validation";

// target datatype (values will be transformed to this type)
type LoginForm = {
	email: string;
	password: string;
	remember: boolean; // from "0" or "1" of form
};

// Custom validators for this login form
export interface LoginScreenProps extends Props {}

export function LoginScreen(_props: LoginScreenProps) {
	const formRef = createRef<HTMLFormElement>();
	const errorContainerRef = createRef() as ErrorContainerRef;

	const form = access<LoginForm>();
	const formRule = rule.extend(LoginValidators);

	const { isValid, getMessages, getData } = transval(
		formRule(form.email).isString().isEmail().isEmailNotBlacklisted(),
		formRule(form.password).isString().hasStrongPassword(),
		formRule(form.remember).asBoolean(),
	);

	const handleSignIn = async () => {
		if (!formRef.current) return;

		const formData = await $(formRef).form<LoginForm>();

		console.log("Form values read from DOM:", formData);

		clearErrorStyles(["email", "password"], errorContainerRef);

		// Validate the form data
		if (await isValid(formData)) {
			// Toast notification for successful login
			console.log("Login successful!");
			alert("Login successful!");
		} else {
			handleValidationErrors(getMessages, errorContainerRef);
			// Toast notification for general errors
			console.log("Please fix the errors and try again");
		}

		const transformedData: LoginForm = getData();
		console.log("Transformed data:", transformedData);
	};

	function handleSubmit(evt: Event) {
		evt.preventDefault();
		handleSignIn();
	}

	function handleKeyDown(evt: KeyboardEvent) {
		if (evt.key === "Enter") {
			evt.preventDefault();
			handleSignIn();
		}
	}

	function handleSocialLogin(provider: string) {
		console.log("Social login with:", provider);
		// TODO: Implement social login
		alert(`${provider} login not yet implemented`);
	}

	function goToSignup() {
		Router.navigate("/signup");
	}

	function goToForgotPassword() {
		Router.navigate("/forgot-password");
	}

	function goBack() {
		Router.navigate("/");
	}

	return (
		<div>
			<div class="container-main login-container">
				{/* Back button positioned in bottle neck */}
				<button type="button" class="bottle-neck-button" onClick={goBack}>
					<span class="material-icons">arrow_back</span>
					<T key="common.back" />
				</button>

				<div class="login-header">
					`<span class="material-icons app-icon">lightbulb</span>
					<h1 class="app-title">
						<T key="login.app_name" />
					</h1>
					<T tag="p" class="welcome-text" key="login.welcome_message" />
				</div>

				<div class="signup-link">
					<p class="signup-text">
						<T key="login.no_account" />{" "}
						<button type="button" class="text-link" onClick={goToSignup}>
							<T key="login.sign_up_link" />
						</button>
					</p>
				</div>

				<ErrorContainer ref={errorContainerRef} messages={[]} hidden={true} />

				<form ref={formRef} class="login-form" onSubmit={handleSubmit}>
					<InputField
						id="email"
						name="email"
						type="email"
						placeholder="you@example.com"
						icon="email"
						labelKey="login.email_label"
						required={true}
						onKeyDown={handleKeyDown}
					/>

					<InputField
						id="password"
						name="password"
						type="password"
						placeholder="••••••••"
						icon="lock"
						labelKey="login.password_label"
						required={true}
						onKeyDown={handleKeyDown}
					/>

					<div class="form-options">
						<CheckboxField
							id="remember-me"
							name="remember-me"
							labelKey="login.remember_me"
							containerClass="remember-me"
							onKeyDown={handleKeyDown}
						/>
					</div>

					<div class="form-group">
						<button class="login-button" type="submit">
							<T key="login.sign_in_button" />
						</button>
						<div class="forgot-password">
							{" "}
							<button
								type="button"
								class="text-link"
								onClick={goToForgotPassword}
							>
								<T key="login.forgot_password" />
							</button>
						</div>
					</div>
				</form>

				<div class="divider">
					<div class="divider-line" />
					<div class="divider-content">
						<span class="divider-text">
							<T key="login.or_continue_with" />
						</span>
					</div>
				</div>

				<div class="social-login">
					<div class="social-buttons">
						<button
							type="button"
							class="social-button"
							onClick={() => handleSocialLogin("Google")}
						>
							<img
								alt="Google sign-in"
								class="social-icon"
								src="https://lh3.googleusercontent.com/aida-public/AB6AXuBdF46WBg3tR4bcAUTagcXZo_XeiKVbOOWXnK3JlcpkrzbD7wEwUnvL55CJ3DHY_bxtyWqv7Dq2thXmBDt5oCEHT8Bzu7uBYIsl6h69bmmlNKQsH9U7ofqey-zyiQcAXtUV4CsHqYD_YYMII6_qpkoaeRd1--rkDgyuDPFy4G6I_TCuW2kBLj6bz8e1eryUFLoxL1DT77rD_bH80pi-mrzu2b50V3epOQH8cFGdnsoJYBJqj3L_vHfrmp2cj5rFl2wuSnPUGbzg3hnG"
							/>
							Google
						</button>

						<button
							type="button"
							class="social-button"
							onClick={() => handleSocialLogin("Apple")}
						>
							<img
								alt="Apple sign-in"
								class="social-icon"
								src="https://lh3.googleusercontent.com/aida-public/AB6AXuCcUATqj4LHb6rmMJrtfdyhvLDJ40d-OHes-_pIK_r1FAtMihc3GLXYAdUbOU-ZwMxX84-obAZrD4oc9pAcUjur1l8zf4nrhOnS5d_pLQ0E0ArBLRBQm7K9LuI2bJR6AxKoUaA99OuSLjtzkW3MTGyc6ZepGf3ZEWbYx4k9Nns3xuXsz_psmyxItNrdbwYy2eZCn9gf0Oa1b2ZkYUp2iGn2OtU2zHhUj5Ho4gaBJuBPJwaiub09zblpwEQqa6_9maTEb9KGsAGBbF_z"
							/>
							Apple
						</button>
					</div>
				</div>
			</div>

			<Footer />
		</div>
	);
}
