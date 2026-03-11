export {
  fnv1a64,
  mix64,
  rendezvousScore,
  pickResponsiblePeer,
  isResponsibleForWorkItem,
} from "./rendezvous";
export type { PeerId } from "./rendezvous";

export type JsonPrimitive = null | boolean | number | string;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };

// Primary exports — pure TypeScript JIT-optimized hasher (no WASM, no init() needed)
export {
  contentHash,
  ContentHasher,
  createContentHasher,
} from "./content-hash-js";
