import { isDefined, isEmail, isEqual } from "./index.js";
import {
  validate,
  type Validator,
  type IntermediateValidationState,
} from "../index.js";

const isValidEmail: Validator = async ({ value }: { value: unknown }) =>
  isEmail(value) ? true : "Not a valid email";

const isValidDefined: Validator = async ({ value }: { value: unknown }) =>
  isDefined(value) ? true : "Value is undefined or null";

const arePasswordsEqual: Validator = async ({
  value,
  formState,
}: IntermediateValidationState) =>
  isEqual(value, formState.password) ? true : "Passwords do not match";

describe("validate", () => {
  it("returns a valid result when all validators pass", async () => {
    const formData = {
      email: "test@example.com",
      password: "password",
      passwordAgain: "password",
    };

    const validationResult = await validate(formData, {
      email: [isValidEmail, isValidDefined],
      password: [isValidDefined],
      passwordAgain: [isValidDefined, arePasswordsEqual],
    });

    expect(validationResult).toEqual({
      email: {
        isValid: true,
        states: [{ isValid: true }, { isValid: true }], // isValidEmail, isValidDefined
      },
      password: {
        isValid: true,
        states: [{ isValid: true }], // isValidDefined
      },
      passwordAgain: {
        isValid: true,
        states: [{ isValid: true }, { isValid: true }], // isValidDefined, arePasswordsEqual
      },
      isValid: true,
    });
  });

  it("returns an invalid result when one validator fails and stopOnInvalid = true", async () => {
    const formData = {
      email: "not an email",
      password: "password",
      passwordAgain: "password1",
    };

    const validationResult = await validate(
      formData,
      {
        email: [isValidEmail, isValidDefined],
        password: [isValidDefined],
        passwordAgain: [isValidDefined, arePasswordsEqual],
      },
      true, // default value
    );

    expect(validationResult).toEqual({
      email: {
        isValid: false,
        message: "Not a valid email",
        states: [{ isValid: false, message: "Not a valid email" }],
      },
      isValid: false,
    });
  });

  it("returns all results when one or many validators fails and stopOnInvalid = false", async () => {
    const formData = {
      email: "not an email",
      password: "password",
      passwordAgain: "password1",
    };

    const validationResult = await validate(
      formData,
      {
        email: [isValidEmail, isValidDefined],
        password: [isValidDefined],
        passwordAgain: [isValidDefined, arePasswordsEqual],
      },
      false,
    );

    expect(validationResult).toEqual({
      email: {
        isValid: false,
        message: "Not a valid email",
        states: [
          { isValid: false, message: "Not a valid email" },
          { isValid: true },
        ], // isValidEmail, isValidDefined
      },
      password: {
        isValid: true,
        states: [{ isValid: true }], // isValidDefined
      },
      passwordAgain: {
        isValid: false,
        message: "Passwords do not match",
        states: [
          { isValid: true },
          { isValid: false, message: "Passwords do not match" },
        ], // isValidDefined, arePasswordsEqual
      },
      isValid: false,
    });
  });
});
