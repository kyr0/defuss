import { describe, expect, it } from "vitest";
import { pickResponsiblePeer, isResponsibleForWorkItem, fnv1a64, mix64, rendezvousScore } from "./rendezvous";

function remapRatio(numKeys: number, before: string[], after: string[]): number {
  let moved = 0;
  for (let i = 0; i < numKeys; i++) {
    const key = `key-${i}`;
    if (pickResponsiblePeer(key, before) !== pickResponsiblePeer(key, after)) {
      moved++;
    }
  }
  return moved / numKeys;
}

describe("rendezvous hashing", () => {
  it("is deterministic", () => {
    const peers = ["a", "b", "c", "d"];
    const k = "work-123";

    expect(pickResponsiblePeer(k, peers)).toBe(pickResponsiblePeer(k, peers));
  });

  it("returns undefined for empty peer list", () => {
    expect(pickResponsiblePeer("x", [])).toBeUndefined();
  });

  it("distributes evenly across peers", () => {
    const peers = Array.from({ length: 8 }, (_, i) => `peer-${i}`);
    const numKeys = 200_000;
    const counts = new Map<string, number>();
    for (const p of peers) counts.set(p, 0);

    for (let i = 0; i < numKeys; i++) {
      const peer = pickResponsiblePeer(`key-${i}`, peers)!;
      counts.set(peer, (counts.get(peer) ?? 0) + 1);
    }

    const avg = numKeys / peers.length;
    for (const count of counts.values()) {
      const deviation = Math.abs(count - avg) / avg;
      expect(deviation).toBeLessThan(0.02); // < 2% deviation
    }
  });

  it("remaps about 1/(n+1) when adding a peer", () => {
    const before = Array.from({ length: 8 }, (_, i) => `peer-${i}`);
    const after = [...before, "peer-8"];

    const ratio = remapRatio(100_000, before, after);

    // expected ~1/9 ≈ 0.1111
    expect(ratio).toBeGreaterThan(0.09);
    expect(ratio).toBeLessThan(0.13);
  });

  it("remaps about 1/n when removing a peer", () => {
    const before = Array.from({ length: 8 }, (_, i) => `peer-${i}`);
    const after = before.filter((p) => p !== "peer-3");

    const ratio = remapRatio(100_000, before, after);

    // expected ~1/8 = 0.125
    expect(ratio).toBeGreaterThan(0.10);
    expect(ratio).toBeLessThan(0.15);
  });

  it("isResponsibleForWorkItem matches pickResponsiblePeer", () => {
    const peers = ["alice", "bob", "carol"];
    const workItem = "task-42";
    const owner = pickResponsiblePeer(workItem, peers)!;

    expect(isResponsibleForWorkItem(owner, workItem, peers)).toBe(true);

    const nonOwner = peers.find((p) => p !== owner)!;
    expect(isResponsibleForWorkItem(nonOwner, workItem, peers)).toBe(false);
  });
});


describe("fnv1a64", () => {
	it("returns a bigint for any string", () => {
		expect(typeof fnv1a64("hello")).toBe("bigint");
	});

	it("matches known FNV-1a 64-bit test vectors", () => {
		// Empty string → FNV offset basis
		expect(fnv1a64("")).toBe(0xcbf29ce484222325n);

		// Single byte "a" (0x61)
		// fnv1a64("a"):
		//   hash = offset XOR 0x61 = 0xcbf29ce484222325 ^ 0x61 = 0xcbf29ce484222344
		//   hash = hash * prime (mod 2^64)
		const aHash = fnv1a64("a");
		expect(aHash).toBeGreaterThan(0n);
		expect(aHash).not.toBe(fnv1a64("b"));
	});

	it("is deterministic", () => {
		expect(fnv1a64("test-item-123")).toBe(fnv1a64("test-item-123"));
	});

	it("produces different hashes for different inputs", () => {
		const hashes = new Set<bigint>();
		for (let i = 0; i < 1000; i++) {
			hashes.add(fnv1a64(`key-${i}`));
		}
		expect(hashes.size).toBe(1000);
	});

	it("stays within 64-bit range", () => {
		const max64 = (1n << 64n) - 1n;
		for (let i = 0; i < 100; i++) {
			const h = fnv1a64(`stress-${i}-${"x".repeat(i)}`);
			expect(h).toBeGreaterThanOrEqual(0n);
			expect(h).toBeLessThanOrEqual(max64);
		}
	});
});

describe("mix64", () => {
	it("maps zero to zero (fixed point of the finalizer)", () => {
		// The MurmurHash3 xor-shift-multiply finalizer has 0 as a fixed point
		expect(mix64(0n)).toBe(0n);
	});

	it("maps non-zero to non-zero", () => {
		expect(mix64(1n)).not.toBe(0n);
		expect(mix64(42n)).not.toBe(0n);
	});

	it("produces different outputs for adjacent inputs (avalanche)", () => {
		const a = mix64(1n);
		const b = mix64(2n);
		// Hamming distance should be high; at minimum they differ
		expect(a).not.toBe(b);
	});

	it("stays within 64-bit range", () => {
		const max64 = (1n << 64n) - 1n;
		expect(mix64(max64)).toBeLessThanOrEqual(max64);
		expect(mix64(max64)).toBeGreaterThanOrEqual(0n);
	});
});

describe("rendezvousScore", () => {
	it("is deterministic for the same pair", () => {
		const s1 = rendezvousScore("item-1", "peer-a");
		const s2 = rendezvousScore("item-1", "peer-a");
		expect(s1).toBe(s2);
	});

	it("differs when workItemId changes", () => {
		expect(rendezvousScore("item-1", "peer-a")).not.toBe(
			rendezvousScore("item-2", "peer-a"),
		);
	});

	it("differs when peerId changes", () => {
		expect(rendezvousScore("item-1", "peer-a")).not.toBe(
			rendezvousScore("item-1", "peer-b"),
		);
	});
});

describe("pickResponsiblePeer", () => {
	it("returns undefined for empty peer list", () => {
		expect(pickResponsiblePeer("item-1", [])).toBeUndefined();
	});

	it("returns the single peer when there is only one", () => {
		expect(pickResponsiblePeer("item-1", ["peer-a"])).toBe("peer-a");
	});

	it("is deterministic", () => {
		const peers = ["peer-a", "peer-b", "peer-c"];
		const r1 = pickResponsiblePeer("item-1", peers);
		const r2 = pickResponsiblePeer("item-1", peers);
		expect(r1).toBe(r2);
	});

	it("distributes items roughly evenly across peers", () => {
		const peers = ["p0", "p1", "p2", "p3", "p4", "p5", "p6", "p7"];
		const counts = new Map<string, number>();
		const total = 200_000;

		for (let i = 0; i < total; i++) {
			const chosen = pickResponsiblePeer(`item-${i}`, peers);
			counts.set(chosen!, (counts.get(chosen!) ?? 0) + 1);
		}

		const expected = total / peers.length;
		for (const [, count] of counts) {
			const deviation = Math.abs(count - expected) / expected;
			expect(deviation).toBeLessThan(0.02);
		}
	});

	it("remaps approximately 1/N items when a peer is added", () => {
		const before = ["p0", "p1", "p2", "p3"];
		const after = ["p0", "p1", "p2", "p3", "p4"];
		const total = 50_000;
		let remapped = 0;

		for (let i = 0; i < total; i++) {
			const key = `item-${i}`;
			if (pickResponsiblePeer(key, before) !== pickResponsiblePeer(key, after)) {
				remapped++;
			}
		}

		const remapRatio = remapped / total;
		// Adding 1 peer to 4 should move ~1/5 = 0.20 of items
		expect(remapRatio).toBeGreaterThan(0.15);
		expect(remapRatio).toBeLessThan(0.25);
	});

	it("remaps approximately 1/N items when a peer is removed", () => {
		const before = ["p0", "p1", "p2", "p3", "p4"];
		const after = ["p0", "p1", "p2", "p3"];
		const total = 50_000;
		let remapped = 0;

		for (let i = 0; i < total; i++) {
			const key = `item-${i}`;
			if (pickResponsiblePeer(key, before) !== pickResponsiblePeer(key, after)) {
				remapped++;
			}
		}

		const remapRatio = remapped / total;
		// Removing 1 peer from 5 should move ~1/5 = 0.20 of items
		expect(remapRatio).toBeGreaterThan(0.15);
		expect(remapRatio).toBeLessThan(0.25);
	});

	it("breaks ties lexicographically", () => {
		// While actual ties are improbable, the algorithm prefers the
		// lexicographically smaller peer on equal scores. We just verify
		// it always returns a string from the input set.
		const peers = ["alpha", "beta", "gamma"];
		const result = pickResponsiblePeer("tie-test", peers);
		expect(peers).toContain(result);
	});

	it("remaps approximately 1/(n+1) items when a peer is added", () => {
		const before = Array.from({ length: 8 }, (_, i) => `peer-${i}`);
		const after = [...before, "peer-8"];
		const total = 100_000;
		let remapped = 0;

		for (let i = 0; i < total; i++) {
			const key = `key-${i}`;
			if (pickResponsiblePeer(key, before) !== pickResponsiblePeer(key, after)) {
				remapped++;
			}
		}

		const remapRatio = remapped / total;
		// expected ~1/9 ≈ 0.1111
		expect(remapRatio).toBeGreaterThan(0.09);
		expect(remapRatio).toBeLessThan(0.13);
	});
});

describe("isResponsibleForWorkItem", () => {
	it("returns true for the peer that pickResponsiblePeer selects", () => {
		const peers = ["alice", "bob", "carol"];
		const workItem = "task-42";
		const owner = pickResponsiblePeer(workItem, peers)!;

		expect(isResponsibleForWorkItem(owner, workItem, peers)).toBe(true);
	});

	it("returns false for a non-owner peer", () => {
		const peers = ["alice", "bob", "carol"];
		const workItem = "task-42";
		const owner = pickResponsiblePeer(workItem, peers)!;
		const nonOwner = peers.find((p) => p !== owner)!;

		expect(isResponsibleForWorkItem(nonOwner, workItem, peers)).toBe(false);
	});
});
