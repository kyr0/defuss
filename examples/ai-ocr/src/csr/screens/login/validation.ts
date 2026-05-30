import { Rules } from "defuss-transval";
import { t } from "../../i18n";

export interface LoginForm {
  email: string;
  password: string;
  remember: boolean;
}

export class LoginValidators extends Rules {
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

  hasStrongPassword() {
    return ((password: string) => {
      if (password.length < 8) return t("validation.password_min_length");
      if (!/[A-Z]/.test(password)) return t("validation.password_uppercase");
      if (!/[0-9]/.test(password)) return t("validation.password_number");
      return true;
    }) as unknown as Rules & this;
  }
}
