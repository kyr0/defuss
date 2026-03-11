import { describe, expect, it } from "vitest";
import { pickResponsiblePeer, isResponsibleForWorkItem } from "./rendezvous";

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
