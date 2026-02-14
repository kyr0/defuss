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
	SignupValidators,
} from "../lib/form/validation";

// target datatype (values will be transformed to this type)
type SignupForm = {
	fullName: string;
	email: string;
	password: string;
	confirmPassword: string;
	agreeToTerms: boolean;
};

// Custom validators for this signup form
export interface SignupScreenProps extends Props {}

export function SignupScreen(_props: SignupScreenProps) {
	const formRef = createRef<HTMLFormElement>();
	const errorContainerRef = createRef() as ErrorContainerRef;
	const successContainerRef = createRef<HTMLDivElement>();

	const form = access<SignupForm>();
	const formRule = rule.extend(SignupValidators);

	const { isValid, getMessages, getData } = transval(
		formRule(form.fullName).isString().isValidFullName(),
		formRule(form.email)
			.isString()
			.isEmail()
			.isEmailNotBlacklisted()
			.isEmailNotRegistered(),
		formRule(form.password).isString().hasStrongPassword(),
		formRule(form.confirmPassword).isString().matchesPassword(form.password),
		formRule(form.agreeToTerms)
			.asBoolean()
			.isTrue("You must agree to the terms"),
	);

	const renderSuccessBox = () => {
		return (
			<div class="success-box">
				<div class="success-message">
					Account created successfully! Redirecting to login...
				</div>
			</div>
		);
	};

	const handleSignup = async () => {
		if (!formRef.current) return;

		const formData = await $(formRef).form<SignupForm>();

		console.log("Form values read from DOM:", formData);

		clearErrorStyles(
			["fullName", "email", "password", "confirmPassword", "agreeToTerms"],
			errorContainerRef,
			successContainerRef,
		);

		// Validate the form data
		if (await isValid(formData)) {
			$(successContainerRef).update(renderSuccessBox()).removeClass("hidden");

			console.log("Account created successfully!");

			// Optionally redirect to login after a delay
			setTimeout(() => {
				Router.navigate("/login");
			}, 3000);
		} else {
			handleValidationErrors(getMessages, errorContainerRef);
			console.log("Please fix the errors and try again");
		}

		const transformedData: SignupForm = getData();
		console.log("Transformed data:", transformedData);
	};

	function handleSubmit(evt: Event) {
		evt.preventDefault();
		handleSignup();
	}

	function handleKeyDown(evt: KeyboardEvent) {
		if (evt.key === "Enter") {
			evt.preventDefault();
			handleSignup();
		}
	}

	function goBack() {
		window.history.back();
	}

	function goToLogin() {
		Router.navigate("/login");
	}

	return (
		<div>
			<div class="container-main signup-container">
				{/* Back button positioned in bottle neck */}
				<button type="button" class="bottle-neck-button" onClick={goBack}>
					<span class="material-icons">arrow_back</span>
					<T key="common.back" />
				</button>

				<div class="signup-header">
					<span class="material-icons app-icon">person_add</span>
					<h1 class="app-title">
						<T key="signup.title" />
					</h1>
					<p class="welcome-text">
						<T key="signup.subtitle" />
					</p>
				</div>

				<div class="login-link">
					<span class="login-text">
						<T key="signup.already_have_account" />
					</span>{" "}
					<button type="button" class="text-link" onClick={goToLogin}>
						<T key="signup.sign_in_link" />
					</button>
				</div>

				<ErrorContainer ref={errorContainerRef} messages={[]} hidden={true} />
				<div ref={successContainerRef} class="success-container hidden" />

				<form ref={formRef} class="signup-form" onSubmit={handleSubmit}>
					<InputField
						id="fullName"
						name="fullName"
						type="text"
						placeholder="Your Name"
						icon="person"
						labelKey="signup.full_name_label"
						required={true}
						onKeyDown={handleKeyDown}
					/>

					<InputField
						id="email"
						name="email"
						type="email"
						placeholder="you@example.com"
						icon="email"
						labelKey="signup.email_label"
						required={true}
						onKeyDown={handleKeyDown}
					/>

					<InputField
						id="password"
						name="password"
						type="password"
						placeholder="••••••••"
						icon="lock"
						labelKey="signup.password_label"
						required={true}
						onKeyDown={handleKeyDown}
					/>

					<InputField
						id="confirmPassword"
						name="confirmPassword"
						type="password"
						placeholder="••••••••"
						icon="lock_check"
						labelKey="signup.confirm_password_label"
						required={true}
						onKeyDown={handleKeyDown}
					/>

					<div class="form-group">
						<CheckboxField
							id="agreeToTerms"
							name="agreeToTerms"
							labelKey="signup.agree_to_terms"
							containerClass="terms-agreement"
							linkHref="/tos"
							linkKey="signup.terms_link"
							required={false}
							onKeyDown={handleKeyDown}
						/>
						<div data-field-error="agreeToTerms" />
					</div>

					<div class="form-group">
						<button class="signup-button" type="submit">
							<T key="signup.sign_up_button" />
						</button>
					</div>
				</form>
			</div>

			<Footer />
		</div>
	);
}
