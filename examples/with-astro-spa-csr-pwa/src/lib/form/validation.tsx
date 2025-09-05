import type { ErrorContainerRef } from "../../components/error-container";
import { $ } from "defuss";
import { Rules } from "defuss-transval";
import type { FieldValidationMessage } from "defuss-transval";

/**
 * Form Validation Utilities
 *
 * Shared utility functions for form validation and error handling across different screens.
 * These functions provide consistent error styling and clearing behavior for forms.
 */

/**
 * Clear error styles from specified form fields and optionally from success containers
 * @param formFields Array of field names to clear errors from
 * @param errorContainerRef Reference to the error container component
 * @param successContainerRef Optional reference to success container to clear
 */
export const clearErrorStyles = (
  formFields: Array<string>,
  errorContainerRef: ErrorContainerRef,
  successContainerRef?: { current: HTMLElement | null },
) => {
  // Clear error container using its API
  errorContainerRef.clear();

  // Clear success container if provided
  if (successContainerRef?.current) {
    $(successContainerRef.current).empty().addClass("hidden");
  }

  // Clear field-specific error styles
  for (const fieldName of formFields) {
    $(`[data-field-error="${fieldName}"]`).empty();
    $(`input[name="${fieldName}"]`).removeClass("error");
    $(`label[for="${fieldName}"]`).removeClass("error");
  }
};

/**
 * Render error message for a specific field and apply error styling
 * @param fieldName Name of the field to render error for
 * @param errorMessage Optional error message to display
 */
export const renderFieldError = (fieldName: string, errorMessage?: string) => {
  if (errorMessage) {
    // Render error message
    $(`[data-field-error="${fieldName}"]`).update(
      <div class="field-error">{errorMessage}</div>,
    );

    // Add error styling
    $(`input[name="${fieldName}"]`).addClass("error");
    $(`label[for="${fieldName}"]`).addClass("error");
  } else {
    // Clear error styling when no errors
    $(`[data-field-error="${fieldName}"]`).empty();
    $(`input[name="${fieldName}"]`).removeClass("error");
    $(`label[for="${fieldName}"]`).removeClass("error");
  }
};

/**
 * Handle validation errors by updating error container and rendering field-specific errors
 * This function unifies the common error handling pattern across all form screens
 * @param getMessages Function to get validation messages (from transval)
 * @param errorContainerRef Reference to the error container component
 */
export const handleValidationErrors = (
  getMessages: (fieldName?: string) => FieldValidationMessage[],
  errorContainerRef: ErrorContainerRef,
) => {
  const messages = getMessages();

  if (messages.length > 0) {
    errorContainerRef.updateMessages(messages);
  } else {
    errorContainerRef.clear();
  }

  // additionally, render errors for each field too (first error only)
  const formFields = [...new Set(messages.map((msg) => msg.path))];

  for (const fieldName of formFields) {
    const fieldErrors = getMessages(fieldName);
    const errorMessage =
      fieldErrors.length > 0 ? fieldErrors[0].message : undefined;
    renderFieldError(fieldName, errorMessage);
  }
};

/**
 * Validation Classes
 *
 * Shared validation classes that extend Rules for form validation across different screens.
 * These classes contain custom validation logic for common fields and business rules.
 */

/**
 * Login form validation rules
 */
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

/**
 * Signup form validation rules
 */
export class SignupValidators extends Rules {
  isValidFullName() {
    return ((fullName: string) => {
      if (fullName.trim().length < 2) {
        return "Full name must be at least 2 characters";
      }
      if (!/^[a-zA-ZäöüÄÖÜß\s-']+$/.test(fullName)) {
        return "Full name contains invalid characters";
      }
      const nameParts = fullName.trim().split(/\s+/);
      if (nameParts.length < 2) return "Please enter both first and last name";
      return true;
    }) as unknown as Rules & this;
  }

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

  isEmailNotRegistered() {
    return (async (email: string) => {
      // async validator custom
      // For demo: simulate some emails as already registered
      const registeredEmails = ["existing@example.com", "user@test.com"];
      if (registeredEmails.includes(email)) {
        return "This email is already registered. Please use a different email address.";
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
      if (!/[a-z]/.test(password))
        return "Password must contain at least one lowercase letter";
      if (!/[0-9]/.test(password))
        return "Password must contain at least one number";
      return true;
    }) as unknown as Rules & this;
  }

  passwordsMatch(confirmPassword: string) {
    return ((password: string) => {
      if (password !== confirmPassword) {
        return "Passwords do not match";
      }
      return true;
    }) as unknown as Rules & this;
  }

  matchesPassword(password: string) {
    return (async (confirmPassword: string) => {
      if (confirmPassword !== password) {
        return "Passwords do not match";
      }
      return true;
    }) as unknown as Rules & this;
  }
}

/**
 * Forgot Password form validation rules
 */
export class ForgotPasswordValidators extends Rules {
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

  isRegisteredEmail() {
    return (async (email: string) => {
      // async validator to check if email is registered
      // For demo: simulate checking if email exists in system
      const registeredEmails = [
        "user@example.com",
        "demo@test.com",
        "hello@world.com",
      ];
      if (!registeredEmails.includes(email)) {
        return "This email address is not registered in our system.";
      }
      return true;
    }) as unknown as Rules & this;
  }
}
