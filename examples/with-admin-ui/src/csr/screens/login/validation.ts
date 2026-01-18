import {
    Rules,
} from "defuss-transval";

// target datatype (values will be transformed to this type)
export type LoginForm = {
    email: string;
    password: string;
    remember: boolean; // from "0" or "1" of form
};

// Custom validators for this login form
export class LoginValidators extends Rules {
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
