import { mockStore } from "../lib/mock-store.js";
import type { User } from "../models/user.js";

export class AuthApi {
  public async login(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
    const result = await mockStore.login(email, password);
    if (result) {
      return { success: true, user: result.user, token: result.token };
    }
    return { success: false, error: "Invalid credentials or user inactive" };
  }

  public async logout(): Promise<{ success: boolean }> {
    await mockStore.logout();
    return { success: true };
  }

  public async getCurrentUser(): Promise<User | null> {
    return mockStore.getCurrentUser();
  }
}
