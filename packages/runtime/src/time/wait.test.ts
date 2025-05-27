import {
  wait,
  createTimeoutPromise,
  waitForWithPolling,
  waitForRef,
} from "./wait.js";

describe("wait", () => {
  it("should be defined", () => {
    expect(wait).toBeDefined();
  });

  it("should wait for the specified time", async () => {
    const start = Date.now();
    await wait(100);
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(90); // Allow some tolerance
    expect(end - start).toBeLessThan(200); // Reasonable upper bound
  });

  it("should return a promise", () => {
    const result = wait(10);
    expect(result).toBeInstanceOf(Promise);
  });
});

describe("createTimeoutPromise", () => {
  it("should be defined", () => {
    expect(createTimeoutPromise).toBeDefined();
  });

  it("should resolve when operation completes before timeout", async () => {
    const operation = () => Promise.resolve("success");
    const result = await createTimeoutPromise(100, operation);
    expect(result).toBe("success");
  });

  it("should resolve with sync operation result", async () => {
    const operation = () => "sync success";
    const result = await createTimeoutPromise(100, operation);
    expect(result).toBe("sync success");
  });

  it("should reject when operation times out", async () => {
    const operation = () =>
      new Promise((resolve) => setTimeout(() => resolve("late"), 200));
    await expect(createTimeoutPromise(100, operation)).rejects.toThrow(
      "Timeout after 100ms",
    );
  });

  it("should call timeout callback when timing out", async () => {
    const timeoutCallback = vi.fn();
    const operation = () =>
      new Promise((resolve) => setTimeout(() => resolve("late"), 200));

    await expect(
      createTimeoutPromise(100, operation, timeoutCallback),
    ).rejects.toThrow();
    expect(timeoutCallback).toHaveBeenCalledWith(100);
  });

  it("should reject when operation throws error", async () => {
    const operation = () => Promise.reject(new Error("operation failed"));
    await expect(createTimeoutPromise(100, operation)).rejects.toThrow(
      "operation failed",
    );
  });

  it("should reject when sync operation throws error", async () => {
    const operation = () => {
      throw new Error("sync operation failed");
    };
    await expect(createTimeoutPromise(100, operation)).rejects.toThrow(
      "sync operation failed",
    );
  });
});

describe("waitForWithPolling", () => {
  it("should be defined", () => {
    expect(waitForWithPolling).toBeDefined();
  });

  it("should resolve when check returns truthy value", async () => {
    let counter = 0;
    const check = () => {
      counter++;
      return counter >= 3 ? "success" : null;
    };

    const result = await waitForWithPolling(check, 1000, 10);
    expect(result).toBe("success");
    expect(counter).toBeGreaterThanOrEqual(3);
  });

  it("should timeout when check never returns truthy value", async () => {
    const check = () => null;
    await expect(waitForWithPolling(check, 50, 10)).rejects.toThrow(
      "Timeout after 50ms",
    );
  });

  it("should reject when check throws error", async () => {
    const check = () => {
      throw new Error("check failed");
    };
    await expect(waitForWithPolling(check, 100, 10)).rejects.toThrow(
      "check failed",
    );
  });

  it("should handle undefined return values", async () => {
    let counter = 0;
    const check = () => {
      counter++;
      return counter >= 2 ? "found" : undefined;
    };

    const result = await waitForWithPolling(check, 1000, 10);
    expect(result).toBe("found");
  });

  it("should continue polling when check returns null/undefined", async () => {
    let counter = 0;
    const check = () => {
      counter++;
      if (counter < 3) return null;
      if (counter < 5) return undefined;
      if (counter < 7) return null;
      return "success";
    };

    const result = await waitForWithPolling(check, 1000, 10);
    expect(result).toBe("success");
    expect(counter).toBeGreaterThanOrEqual(7);
  });
});

describe("waitForRef", () => {
  it("should be defined", () => {
    expect(waitForRef).toBeDefined();
  });

  it("should resolve when ref.current becomes truthy", async () => {
    const ref: { current: any } = { current: null };

    // Set ref.current after a delay
    setTimeout(() => {
      ref.current = "value";
    }, 50);

    const result = await waitForRef(ref, 1000);
    expect(result).toBe("value");
  });

  it("should timeout when ref.current never becomes truthy", async () => {
    const ref = { current: null };
    await expect(waitForRef(ref, 50)).rejects.toThrow("Timeout after 50ms");
  });

  it("should resolve immediately when ref.current is already truthy", async () => {
    const ref = { current: "immediate value" };
    const result = await waitForRef(ref, 1000);
    expect(result).toBe("immediate value");
  });

  it("should handle different truthy values", async () => {
    const ref: { current: any } = { current: null };

    setTimeout(() => {
      ref.current = { nested: "object" };
    }, 20);

    const result = await waitForRef(ref, 1000);
    expect(result).toEqual({ nested: "object" });
  });
});
