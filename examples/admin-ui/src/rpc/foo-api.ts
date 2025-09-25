export class FooApi {
  public async helloWorld(foo: number): Promise<string> {
    return Promise.resolve(`Hello, world! ${foo}`);
  }
}
