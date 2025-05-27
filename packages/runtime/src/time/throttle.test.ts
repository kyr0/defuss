import { throttle } from "./throttle.js";

describe("throttle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should be defined", () => {
    expect(throttle).toBeDefined();
  });

  it("should call function immediately on first call", () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 100);

    throttledFn();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should ignore calls within the wait period", () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 100);

    throttledFn();
    throttledFn();
    throttledFn();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should allow call after wait period", () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 100);

    throttledFn();
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    throttledFn();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should pass arguments to the function", () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 100);

    throttledFn(1, 2, 3);
    expect(fn).toHaveBeenCalledWith(1, 2, 3);

    vi.advanceTimersByTime(100);
    throttledFn("a", "b", "c");
    expect(fn).toHaveBeenCalledWith("a", "b", "c");
  });

  it("should preserve this context", () => {
    const obj = {
      value: "test",
      fn: vi.fn(function (this: any) {
        return this.value;
      }),
    };

    const throttledFn = throttle(obj.fn, 100);
    throttledFn.call(obj);

    expect(obj.fn).toHaveBeenCalledTimes(1);
  });

  it("should handle zero wait time", () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 0);

    throttledFn();
    throttledFn();
    throttledFn();

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("should handle multiple independent throttled functions", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const throttledFn1 = throttle(fn1, 100);
    const throttledFn2 = throttle(fn2, 200);

    throttledFn1();
    throttledFn2();

    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);

    throttledFn1();
    throttledFn2();

    // Should still be 1 for both since wait period hasn't passed
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    throttledFn1();
    throttledFn2(); // Still within wait period

    expect(fn1).toHaveBeenCalledTimes(2);
    expect(fn2).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    throttledFn2();

    expect(fn2).toHaveBeenCalledTimes(2);
  });

  it("should throttle based on actual time elapsed", () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 100);

    throttledFn("first");
    expect(fn).toHaveBeenCalledWith("first");

    vi.advanceTimersByTime(50);
    throttledFn("second"); // Should be ignored
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(50);
    throttledFn("third"); // Should be called
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenCalledWith("third");
  });

  it("should handle rapid successive calls correctly", () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 100);

    // First call should go through
    throttledFn(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1);

    // Multiple calls within the wait period should be ignored
    for (let i = 2; i <= 10; i++) {
      throttledFn(i);
    }
    expect(fn).toHaveBeenCalledTimes(1);

    // After wait period, next call should go through
    vi.advanceTimersByTime(100);
    throttledFn(11);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenCalledWith(11);
  });
});
