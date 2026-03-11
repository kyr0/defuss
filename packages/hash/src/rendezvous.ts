export type PeerId = string;

const MASK_64 = (1n << 64n) - 1n;
const FNV1A64_OFFSET = 0xcbf29ce484222325n;
const FNV1A64_PRIME = 0x100000001b3n;
const textEncoder = new TextEncoder();

/** Stable 64-bit FNV-1a over UTF-8 bytes */
export function fnv1a64(input: string): bigint {
  let hash = FNV1A64_OFFSET;

  for (const byte of textEncoder.encode(input)) {
    hash ^= BigInt(byte);
    hash = (hash * FNV1A64_PRIME) & MASK_64;
  }

  return hash;
}

/** SplitMix64 finalizer / avalanche mix */
export function mix64(z: bigint): bigint {
  z = (z ^ (z >> 30n)) & MASK_64;
  z = (z * 0xbf58476d1ce4e5b9n) & MASK_64;
  z = (z ^ (z >> 27n)) & MASK_64;
  z = (z * 0x94d049bb133111ebn) & MASK_64;
  z = (z ^ (z >> 31n)) & MASK_64;
  return z;
}

/** Pure rendezvous score */
export function rendezvousScore(workItemId: string, peerId: PeerId): bigint {
  const a = fnv1a64(workItemId);
  const b = fnv1a64(peerId);
  return mix64(a ^ b);
}

/**
 * Deterministically picks the responsible peer.
 * Tie-breaker uses lexical peerId order to stay deterministic.
 */
export function pickResponsiblePeer(
  workItemId: string,
  peerIds: readonly PeerId[],
): PeerId | undefined {
  if (peerIds.length === 0) return undefined;

  let bestPeer: PeerId | undefined;
  let bestScore = -1n;

  for (const peerId of peerIds) {
    const score = rendezvousScore(workItemId, peerId);

    if (
      score > bestScore ||
      (score === bestScore && (bestPeer === undefined || peerId < bestPeer))
    ) {
      bestScore = score;
      bestPeer = peerId;
    }
  }

  return bestPeer;
}

export function isResponsibleForWorkItem(
  selfPeerId: PeerId,
  workItemId: string,
  livePeerIds: readonly PeerId[],
): boolean {
  return pickResponsiblePeer(workItemId, livePeerIds) === selfPeerId;
}
