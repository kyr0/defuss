export class AuthApi {
  public async login(email: string, password: string): Promise<string> {
    // Implement login logic
    return Promise.resolve("token");
  }

  public async logout(token: string): Promise<void> {
    // Implement logout logic
    return Promise.resolve();
  }
}
