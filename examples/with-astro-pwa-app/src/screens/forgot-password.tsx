import { createRef, type Props, T, $, Router } from "defuss";
import { rule, transval, access } from "defuss-transval";
import { Footer } from "../components/footer";
import { InputField } from "../components/input-field";
import {
	ErrorContainer,
	type ErrorContainerRef,
} from "../components/error-container";
import {
	clearErrorStyles,
	handleValidationErrors,
	ForgotPasswordValidators,
} from "../lib/form/validation";

// target datatype (values will be transformed to this type)
type ForgotPasswordForm = {
	email: string;
};

// Custom validators for this forgot password form
export interface ForgotPasswordScreenProps extends Props {}

export function ForgotPasswordScreen(_props: ForgotPasswordScreenProps) {
	const formRef = createRef<HTMLFormElement>();
	const errorContainerRef = createRef() as ErrorContainerRef;
	const successContainerRef = createRef<HTMLDivElement>();

	const form = access<ForgotPasswordForm>();
	const formRule = rule.extend(ForgotPasswordValidators);

	const { isValid, getMessages, getData } = transval(
		formRule(form.email)
			.isString()
			.isEmail()
			.isEmailNotBlacklisted()
			.isRegisteredEmail(),
	);

	const renderSuccessBox = () => {
		return (
			<div class="success-box">
				<div class="success-message">
					<span class="material-icons success-icon">check_circle</span>
					<div>
						<h3 class="success-title">Reset link sent!</h3>
						<p class="success-description">
							We've sent a password reset link to your email address. Please
							check your inbox and follow the instructions.
						</p>
					</div>
				</div>
			</div>
		);
	};

	const handleResetPassword = async () => {
		if (!formRef.current) return;

		const formData = await $(formRef).form<ForgotPasswordForm>();

		console.log("Form values read from DOM:", formData);

		clearErrorStyles(["email"], errorContainerRef, successContainerRef);

		// Validate the form data
		if (await isValid(formData)) {
			$(successContainerRef).update(renderSuccessBox()).removeClass("hidden");

			console.log("Password reset link sent successfully!");
		} else {
			handleValidationErrors(getMessages, errorContainerRef);
			console.log("Please fix the errors and try again");
		}

		const transformedData: ForgotPasswordForm = getData();
		console.log("Transformed data:", transformedData);
	};

	function handleSubmit(evt: Event) {
		evt.preventDefault();
		handleResetPassword();
	}

	function handleKeyDown(evt: KeyboardEvent) {
		if (evt.key === "Enter") {
			evt.preventDefault();
			handleResetPassword();
		}
	}

	function goToLogin() {
		Router.navigate("/login");
	}

	return (
		<div>
			<div class="container-main forgot-password-container">
				{/* Back button positioned in bottle neck */}
				<button type="button" class="bottle-neck-button" onClick={goToLogin}>
					<span class="material-icons">arrow_back</span>
					<T key="forgot_password.back_to_login" />
				</button>

				<div class="forgot-password-header">
					<span class="material-icons app-icon">lock_reset</span>
					<h1 class="app-title">
						<T key="forgot_password.title" />
					</h1>
					<p class="welcome-text">
						<T key="forgot_password.subtitle" />
					</p>
				</div>

				<ErrorContainer ref={errorContainerRef} messages={[]} hidden={true} />
				<div ref={successContainerRef} class="success-container hidden" />

				<form
					ref={formRef}
					class="forgot-password-form"
					onSubmit={handleSubmit}
				>
					<InputField
						id="email"
						name="email"
						type="email"
						placeholder="you@example.com"
						icon="email"
						labelKey="forgot_password.email_label"
						required={true}
						onKeyDown={handleKeyDown}
					/>

					<div class="form-group">
						<button class="reset-button" type="submit">
							<T key="forgot_password.send_reset_button" />
						</button>
					</div>
				</form>
			</div>

			<Footer />
		</div>
	);
}
