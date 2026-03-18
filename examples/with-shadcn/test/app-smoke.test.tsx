import { afterEach, describe, expect, it } from "vitest";
import { render } from "defuss";
import { PreAuthLayout } from "../src/csr/layouts/pre-auth";
import { LoginScreen } from "../src/csr/screens/login";
import { cleanup, createContainer } from "./test-utils";

describe("with-shadcn admin smoke", () => {
  const containers: HTMLElement[] = [];

  afterEach(() => {
    while (containers.length > 0) {
      cleanup(containers.pop()!);
    }
  });

  it("renders login form inside pre-auth layout", async () => {
    const container = createContainer();
    containers.push(container);

    await render(
      <PreAuthLayout>
        <LoginScreen />
      </PreAuthLayout>,
      container,
    );

    const title = container.querySelector("h2");
    const email = container.querySelector("input[name='email']") as HTMLInputElement | null;
    const password = container.querySelector("input[name='password']") as HTMLInputElement | null;

    expect(title).toBeTruthy();
    expect(title!.textContent).toContain("Sign in");
    expect(email).toBeTruthy();
    expect(password).toBeTruthy();
  });
});
