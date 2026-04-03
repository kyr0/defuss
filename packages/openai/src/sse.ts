/**
 * Transforms a raw byte stream into a typed `ReadableStream` of parsed SSE events.
 *
 * SSE delivers newline-delimited text frames over a single HTTP response. This
 * function incrementally decodes bytes, splits on the SSE double-newline boundary,
 * extracts `data:` fields per the W3C spec, and JSON-parses each payload into `T`.
 * The stream closes automatically when the OpenAI `[DONE]` sentinel is received.
 *
 * Buffering: incoming bytes accumulate until a `\n\n` boundary appears. The last
 * incomplete fragment is retained across reads so partial frames are never lost.
 * On source EOF a final flush processes any trailing unterminated data.
 *
 * @param source - Raw byte stream from `Response.body`.
 * @param map - Optional transform for each parsed JSON object before enqueueing.
 *   Defaults to identity cast.
 */
export const createSSEStream = <T>(
  source: ReadableStream<Uint8Array>,
  map: (event: unknown) => T = (event) => event as T
): ReadableStream<T> => {
  const reader = source.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  /**
   * Scans the buffer for complete SSE events (separated by `\n\n`).
   *
   * Normal mode (`flushTail=false`): retains the last segment as it may be
   * incomplete. EOF mode (`flushTail=true`): consumes everything including
   * any trailing partial event. Returns `true` when `[DONE]` closes the stream.
   */
  const flushEvents = (
    controller: ReadableStreamDefaultController<T>,
    flushTail = false
  ) => {
    const normalized = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const parts = normalized.split('\n\n');

    if (!flushTail) {
      buffer = parts.pop() ?? '';
    } else {
      buffer = '';
    }

    for (const rawEvent of flushTail ? parts : parts) {
      const data = parseSSEEvent(rawEvent);
      if (data == null || data.length === 0) continue;
      if (data === '[DONE]') {
        controller.close();
        void reader.cancel();
        return true;
      }
      controller.enqueue(map(JSON.parse(data)));
    }

    if (flushTail) {
      const tail = parseSSEEvent(buffer);
      if (tail && tail !== '[DONE]') {
        controller.enqueue(map(JSON.parse(tail)));
      }
      if (tail === '[DONE]') {
        controller.close();
        void reader.cancel();
        return true;
      }
    }

    return false;
  };

  return new ReadableStream<T>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const closed = flushEvents(controller);
          if (closed) return;
        }

        buffer += decoder.decode();
        const closed = flushEvents(controller, true);
        if (!closed) controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
    async cancel(reason) {
      await reader.cancel(reason);
    },
  });
};

/**
 * Extracts the concatenated `data:` field from a single SSE event block.
 *
 * Per the SSE spec, multiple `data:` lines within one event are joined with
 * `\n`. Comment lines (`:`) and unknown fields are silently ignored.
 *
 * @returns The joined data string, or `undefined` if no data lines exist.
 */
const parseSSEEvent = (rawEvent: string): string | undefined => {
  const lines = rawEvent.split('\n');
  const data: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith(':')) continue;

    const separatorIndex = line.indexOf(':');
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex);
    let value = separatorIndex === -1 ? '' : line.slice(separatorIndex + 1);

    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'data') data.push(value);
  }

  if (data.length === 0) return undefined;
  return data.join('\n');
};
