import { debounce } from "./debounce.js";

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should be defined", () => {
    expect(debounce).toBeDefined();
  });

  it("should delay function execution", () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should reset timer on subsequent calls", () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    vi.advanceTimersByTime(50);
    debouncedFn(); // This should reset the timer
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should call function with latest arguments", () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn("first");
    debouncedFn("second");
    debouncedFn("third");

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("third");
  });

  it("should preserve this context", () => {
    const obj = {
      value: "test",
      fn: vi.fn(function (this: any) {
        return this.value;
      }),
    };

    const debouncedFn = debounce(obj.fn, 100);
    debouncedFn.call(obj);

    vi.advanceTimersByTime(100);
    expect(obj.fn).toHaveBeenCalledTimes(1);
  });

  it("should handle multiple arguments", () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn(1, 2, 3, "test", { key: "value" });

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith(1, 2, 3, "test", { key: "value" });
  });

  it("should handle zero delay", () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 0);

    debouncedFn();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(0);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should allow multiple independent debounced functions", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const debouncedFn1 = debounce(fn1, 100);
    const debouncedFn2 = debounce(fn2, 200);

    debouncedFn1();
    debouncedFn2();

    vi.advanceTimersByTime(100);
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it("should handle rapid successive calls", () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    for (let i = 0; i < 10; i++) {
      debouncedFn(i);
      vi.advanceTimersByTime(10);
    }

    // Function should not have been called yet
    expect(fn).not.toHaveBeenCalled();

    // Wait for the full delay after the last call
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(9); // Last argument
  });
});
