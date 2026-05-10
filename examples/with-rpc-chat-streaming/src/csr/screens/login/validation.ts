import { Rules } from "defuss-transval";

export interface LoginForm {
	email: string;
	password: string;
	remember: boolean;
}

export class LoginValidators extends Rules {
	hasStrongPassword() {
		return ((password: string) => {
			if (password.length < 8) return "Password must be at least 8 characters";
			if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
			if (!/[0-9]/.test(password)) return "Password must contain a number";
			return true;
		}) as unknown as Rules & this;
	}
}
