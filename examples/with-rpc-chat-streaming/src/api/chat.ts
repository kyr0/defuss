/**
 * Chat API module — demonstrates RPC generator streaming.
 *
 * `streamMessage` is an async generator that yields 2-3 words at a time,
 * simulating word-by-word AI chat output. Each iteration has a random
 * 50-100ms delay to mimic real token generation.
 */

const SAMPLE_RESPONSE =
  "This is a simulated AI chat response that streams word by word. " +
  "The server yields small chunks of text with a random delay between " +
  "each iteration, creating a realistic streaming experience. " +
  "When the generator finishes, the return value contains the complete " +
  "concatenated message for convenience.";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const ChatApi = {
  /**
   * Yields 2-3 words at a time from a simulated response, with random delay.
   * The final `return` value is the full assembled message.
   */
  async *streamMessage(_prompt: string) {
    const words = SAMPLE_RESPONSE.split(" ");
    let full = "";
    let i = 0;

    while (i < words.length) {
      // Pick 2-3 words per chunk
      const chunkSize = 2 + Math.floor(Math.random() * 2);
      const chunk = words.slice(i, i + chunkSize).join(" ");
      i += chunkSize;

      full += (full ? " " : "") + chunk;

      // Random 50-100ms delay
      await sleep(50 + Math.floor(Math.random() * 50));

      yield chunk;
    }
    return full;
  },

  /** Simple non-generator method for health checks. */
  async ping() {
    return "pong";
  },
};
