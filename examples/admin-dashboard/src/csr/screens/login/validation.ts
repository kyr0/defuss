import { Rules } from "defuss-transval";
import { t } from "../../i18n";

/** Shape of the login form data collected from the sign-in form. */
export interface LoginForm {
  /** User email address. */
  email: string;
  /** User password. */
  password: string;
  /** Whether to persist the session. */
  remember: boolean;
}

/**
 * Custom validation rules for the login form.
 * Extends the base `Rules` from defuss-transval with email-blacklist
 * and strong-password checks.
 */
export class LoginValidators extends Rules {
  /** Rejects emails that appear on a server-side blacklist. */
  isEmailNotBlacklisted() {
    return (async (email: string) => {
      const blacklistedEmails = ["test@test.com"];
      const normalizedEmail = email.trim().toLowerCase();
      if (blacklistedEmails.includes(normalizedEmail)) {
        return t("validation.email_blacklisted");
      }
      return true;
    }) as unknown as Rules & this;
  }

  /** Requires at least 8 characters, one uppercase letter, and one digit. */
  hasStrongPassword() {
    return ((password: string) => {
      if (password.length < 8) return t("validation.password_min_length");
      if (!/[A-Z]/.test(password)) return t("validation.password_uppercase");
      if (!/[0-9]/.test(password)) return t("validation.password_number");
      return true;
    }) as unknown as Rules & this;
  }
}
