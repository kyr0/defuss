declare module "../wasm/pkg/defuss_hash.js" {
  export default function init(input?: unknown): Promise<unknown>;

  /** Convenience: hash a JsValue (serde_wasm_bindgen crossing). */
  export function content_hash(
    value: unknown,
    skipPaths?: readonly string[],
  ): string;

  /** Fast path: hash a JSON string directly in Rust. */
  export function content_hash_json_str(
    json: string,
    skipPaths?: readonly string[],
  ): string;

  /** Fast path: hash raw JSON bytes directly in Rust. */
  export function content_hash_json_bytes(
    bytes: Uint8Array,
    skipPaths?: readonly string[],
  ): string;

  export class ContentHasher {
    constructor(skipPaths?: readonly string[]);
    hash(value: unknown): string;
    hash_json_str(json: string): string;
    hash_json_bytes(bytes: Uint8Array): string;
  }
}
