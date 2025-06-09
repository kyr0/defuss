export class BarApi {
  public async calc(a: number, b: number): Promise<number> {
    return Promise.resolve(a + b);
  }
}
