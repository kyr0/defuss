
/**
 * custom headers class to manage HTTP headers with case-insensitive keys.
 * simplifies header manipulation by providing utility methods.
 */
export class Headers {
  // internal map to store headers
  private map: Map<string, string>;

  /**
   * initializes the Headers instance with provided headers or another Headers object.
   * ensures all header keys are stored in lowercase for consistent access.
   * @param init initial headers as a record or another Headers instance
   */
  constructor(init: Record<string, string> | Headers = {}) {
    this.map = new Map();

    if (init instanceof Headers) {
      init.forEach((value, key) => this.map.set(key, value));
    } else {
      Object.entries(init).forEach(([key, value]) =>
        this.map.set(key.toLowerCase(), value)
      );
    }
  }

  /**
   * appends or sets the value for a specific header key.
   * stores the key in lowercase to maintain case-insensitivity.
   * @param key header name
   * @param value header value
   */
  append(key: string, value: string): void {
    this.map.set(key.toLowerCase(), value);
  }

  /**
   * retrieves the value of a specific header key.
   * @param key header name
   * @returns the header value or null if not found
   */
  get(key: string): string | null {
    return this.map.get(key.toLowerCase()) || null;
  }

  /**
   * checks if a specific header key exists.
   * @param key header name
   * @returns boolean indicating existence of the header
   */
  has(key: string): boolean {
    return this.map.has(key.toLowerCase());
  }

  /**
   * iterates over all headers and executes the provided callback for each.
   * @param callback function to execute for each header
   */
  forEach(callback: (value: string, key: string) => void): void {
    this.map.forEach((value, key) => callback(value, key));
  }
}

/**
 * ProgressSignal extends EventTarget to dispatch and track progress events.
 * useful for monitoring the progress of network requests.
 */
export class ProgressSignal extends EventTarget {
  // internal progress state
  private _progress: { loaded: number; total: number };

  /**
   * initializes the ProgressSignal with zero progress.
   */
  constructor() {
    super();
    this._progress = { loaded: 0, total: 0 };
  }

  /**
   * retrieves the current progress.
   * @returns an object containing loaded and total bytes
   */
  get progress(): { loaded: number; total: number } {
    return this._progress;
  }

  /**
   * dispatches a progress event with updated loaded and total bytes.
   * updates the internal progress state.
   * @param event the ProgressEvent containing progress information
   */
  dispatchProgress(event: ProgressEvent): void {
    this._progress = { loaded: event.loaded, total: event.total };
    this.dispatchEvent(
      new ProgressEvent('progress', { loaded: event.loaded, total: event.total })
    );
  }
}

/**
 * ProgressController manages a ProgressSignal for tracking request progress.
 * provides a centralized way to handle progress events.
 */
export class ProgressController {
  signal: ProgressSignal;

  /**
   * initializes the ProgressController with a new ProgressSignal.
   */
  constructor() {
    this.signal = new ProgressSignal();
  }
}

/**
 * serializes the request body into a format suitable for XMLHttpRequest.
 * handles various body types including JSON objects and FormData.
 * @param body the body to serialize
 * @returns the serialized body or null if no body is provided
 */
export function serializeBody(
  body: BodyInit | Record<string, unknown> | null | undefined
): XMLHttpRequestBodyInit | Document | null {
  if (!body) return null;

  if (
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body) ||
    typeof body === "string"
  ) {
    return body;
  }

  if (typeof body === "object") {
    return JSON.stringify(body); // convert object to JSON string for transmission
  }

  return String(body); // ensure fallback to string for unsupported types
}

/**
 * parses a raw header string from an XMLHttpRequest into a Headers instance.
 * @param headerStr the raw header string
 * @returns a Headers instance containing parsed headers
 */
export function parseHeaders(headerStr: string): Headers {
  const headers = new Headers();
  headerStr.split('\r\n').forEach((line) => {
    const [key, ...rest] = line.split(': ');
    if (key) headers.append(key, rest.join(': '));
  });
  return headers;
}

/**
 * extends the standard RequestInit to include an optional ProgressSignal.
 * allows tracking the progress of the network request.
 */
export interface FetchWithControllersInit extends RequestInit {
  progressSignal?: ProgressSignal;
}

/**
 * represents the response from a fetch operation, mirroring the native Response interface.
 * includes methods to access the response body in various formats.
 */
export interface FetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  url: string;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
  blob: () => Promise<Blob>;
}

/**
 * performs a network fetch request with support for progress tracking using XMLHttpRequest.
 * falls back to the native fetch implementation if no ProgressSignal is provided.
 * @param input the resource to fetch, typically a URL string
 * @param init optional configuration for the request, including method, headers, body, credentials, and progressSignal
 * @returns a promise resolving to a FetchResponse containing the response details
 */
export async function fetch(
  input: string | URL,
  init: FetchWithControllersInit = {}
): Promise<FetchResponse> {
  // use native fetch if ProgressSignal is not provided for simplicity and efficiency
  if (!init.progressSignal && typeof globalThis.fetch === "function") {
    return fetch(input, init) as unknown as FetchResponse;
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const method = (init.method || 'GET').toUpperCase();
    const body = serializeBody(init.body || null);
    const progressSignal = init.progressSignal;
    const abortSignal = init.signal;

    // handle abort events to allow request cancellation
    if (abortSignal) {
      const abortHandler = () => {
        xhr.abort();
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      };
      abortSignal.addEventListener('abort', abortHandler, { once: true });
    }

    xhr.open(method, input.toString(), true);

    // set credentials based on the init configuration
    if (init.credentials === 'include') {
      xhr.withCredentials = true;
    } else if (init.credentials === 'omit') {
      xhr.withCredentials = false;
    }

    // set request headers using the custom Headers class or raw headers
    if (init.headers instanceof Headers) {
      init.headers.forEach((value, key) => xhr.setRequestHeader(key, value));
    } else if (init.headers) {
      Object.entries(init.headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value as string);
      });
    }

    // attach progress listeners if a ProgressSignal is provided
    if (progressSignal) {
      if (xhr.upload) {
        xhr.upload.onprogress = (event) => progressSignal.dispatchProgress(event);
      }
      xhr.onprogress = (event) => progressSignal.dispatchProgress(event);
    }

    // handle the response once the request is completed
    xhr.onload = () => {
      const response: FetchResponse = {
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        statusText: xhr.statusText,
        headers: parseHeaders(xhr.getAllResponseHeaders()),
        url: xhr.responseURL,
        text: () => Promise.resolve(xhr.responseText),
        json: () => Promise.resolve(JSON.parse(xhr.responseText)),
        blob: () => Promise.resolve(new Blob([xhr.response])),
      };
      resolve(response);
    };

    // handle network errors
    xhr.onerror = () => reject(new TypeError('Network request failed'));
    xhr.ontimeout = () => reject(new TypeError('Network request timed out'));
    xhr.onabort = () => reject(new DOMException('The operation was aborted.', 'AbortError'));

    // send the serialized request body
    xhr.send(body);
  });
}


/*
 // example usage of fetch with upload tracking
 async function exampleFetchWithUploadTracking() {
   const url = 'https://example.com/upload';
   const data = new FormData();
   data.append('file', new Blob(['file content'], { type: 'text/plain' }), 'example.txt');

   const { signal: progressSignal } = new ProgressController();

   progressSignal.addEventListener('progress', (event: ProgressEvent) => {
     console.log(`Uploaded ${event.loaded} of ${event.total} bytes`);
   });

   try {
     const response = await fetch(url, {
       method: 'POST',
       body: data,
       headers: {
         'Accept': 'application/json'
       },
       credentials: 'include',
       progressSignal
     });

     if (response.ok) {
       const jsonResponse = await response.json();
       console.log('Upload successful:', jsonResponse);
     } else {
       console.error('Upload failed:', response.statusText);
     }
   } catch (error) {
     console.error('Error during fetch:', error);
   }
 }
 
 */