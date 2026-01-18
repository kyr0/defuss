import { bench, describe } from "vitest";
import { createStore, deepEquals } from "./store.js";

describe("Store Performance", () => {
    const largeState: Record<string, number> = Array.from({ length: 1000 }).reduce(
        (acc: Record<string, number>, _, i) => {
            acc[`key${i}`] = i;
            return acc;
        },
        {} as Record<string, number>
    );

    // Default is now shallow
    const defaultStore = createStore(largeState);
    const deepStore = createStore(largeState, { equals: deepEquals });
    const pathStore = createStore({ nested: { deep: { value: 1 } } });

    bench("getRaw (O(1))", () => {
        defaultStore.getRaw();
    });

    bench("get (path, O(L))", () => {
        pathStore.get("nested.deep.value");
    });

    bench("setRaw (default shallow, no change)", () => {
        defaultStore.setRaw(largeState);
    });

    bench("setRaw (deep compare, no change, expensive)", () => {
        deepStore.setRaw(largeState);
    });

    bench("setRaw (default shallow, change)", () => {
        // We toggle between two states to force updates
        const stateA = { ...largeState, id: 1 };
        defaultStore.setRaw(stateA);
    });

    bench("set (path update)", () => {
        pathStore.set("nested.deep.value", Math.random());
    });

    bench("creation overhead", () => {
        createStore({ id: 1 });
    });
});
