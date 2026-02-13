export const SESSION_COOKIE_NAME = "admin_session";
export const SESSION_COOKIE_VALUE = "authenticated";

export const DEMO_USER = {
  email: "jane.smith@acme.com",
  password: "Password123!",
};

export function isValidDemoLogin(email: string, password: string) {
  return email === DEMO_USER.email && password === DEMO_USER.password;
}
