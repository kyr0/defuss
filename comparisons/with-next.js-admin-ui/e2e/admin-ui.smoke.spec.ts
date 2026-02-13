import { expect, test } from "@playwright/test";

test("redirects unauthenticated users away from /dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "Sign in to your account" })
  ).toBeVisible();
});

test("shows admin data only when authenticated and supports logout", async ({
  context,
  page,
}) => {
  await context.addCookies([
    {
      name: "admin_session",
      value: "authenticated",
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Jane Smith logged in from Berlin")).toBeVisible();

  await page.getByRole("link", { name: "Users" }).first().click();
  await expect(page).toHaveURL(/\/users$/);
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  await expect(page.getByText("jane.smith@acme.com")).toBeVisible();

  await page.getByRole("button", { name: "Open user menu" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "Sign in to your account" })
  ).toBeVisible();

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/$/);
});
