import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Worker } from "node:worker_threads";
import { WASI, WASIProcExit, wasi as wasiTypes } from "@bjorn3/browser_wasi_shim";
import { Termios, openpty } from "xterm-pty";

const ERRNO_INVAL = wasiTypes.ERRNO_INVAL;
const ERRNO_NOSYS = wasiTypes.ERRNO_NOSYS;
const DEBUG = process.env.WASI_DEBUG === "1";
const INPUT_RING_CAPACITY = 64 * 1024;
const FLAG_ISTRIP = 32;
const FLAG_INLCR = 64;
const FLAG_IGNCR = 128;
const FLAG_ICRNL = 256;
const FLAG_IXON = 1024;
const FLAG_OPOST = 1;
const FLAG_ISIG = 1;
const FLAG_ICANON = 2;
const FLAG_ECHO = 8;
const FLAG_ECHONL = 64;
const FLAG_IEXTEN = 32768;

class InteractiveShellExit extends WASIProcExit {
  constructor() {
    super(0);
  }
}

const inputState = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 5));
const inputRingBuffer = new SharedArrayBuffer(INPUT_RING_CAPACITY);
const inputRing = new Uint8Array(inputRingBuffer);
const stdinWorker = new Worker(new URL("./run-wasi-stdin-worker.mjs", import.meta.url), {
  workerData: {
    capacity: INPUT_RING_CAPACITY,
    stateBuffer: inputState.buffer,
    dataBuffer: inputRingBuffer,
  },
});

const { master, slave } = openpty();
const dataListeners = new Set();
const resizeListeners = new Set();

master.activate({
  write(data, callback) {
    const chunk = Buffer.from(data);
    if (process.stdout.write(chunk)) {
      callback();
      return;
    }
    process.stdout.once("drain", callback);
  },
  onData(listener) {
    dataListeners.add(listener);
    return {
      dispose() {
        dataListeners.delete(listener);
      },
    };
  },
  onBinary() {
    return { dispose() {} };
  },
  onResize(listener) {
    resizeListeners.add(listener);
    return {
      dispose() {
        resizeListeners.delete(listener);
      },
    };
  },
});

let termios = slave.ioctl("TCGETS");
termios = new Termios(
  termios.iflag & ~(FLAG_ISTRIP | FLAG_INLCR | FLAG_IGNCR | FLAG_ICRNL | FLAG_IXON),
  termios.oflag & ~FLAG_OPOST,
  termios.cflag,
  termios.lflag & ~(FLAG_ECHO | FLAG_ECHONL | FLAG_ICANON | FLAG_ISIG | FLAG_IEXTEN),
  termios.cc,
);
slave.ioctl("TCSETS", termios);

function emitResize() {
  const cols = process.stdout.columns ?? 80;
  const rows = process.stdout.rows ?? 24;
  for (const listener of resizeListeners) {
    listener({ cols, rows });
  }
}

emitResize();
if (process.stdout.isTTY) {
  process.stdout.on("resize", emitResize);
}

stdinWorker.on("error", (error) => {
  console.error("stdin worker failed", error);
  process.exit(1);
});

process.on("exit", () => {
  if (process.stdout.isTTY) {
    process.stdout.off("resize", emitResize);
  }
  master.dispose();
  Atomics.store(inputState, 4, 1);
  Atomics.notify(inputState, 0);
  stdinWorker.terminate();
});

function memoryView(wasi) {
  return new DataView(wasi.inst.exports.memory.buffer);
}

function memoryBytes(wasi) {
  return new Uint8Array(wasi.inst.exports.memory.buffer);
}

function readFromInputRing(maxLen) {
  const available = Atomics.load(inputState, 0);
  if (available === 0) return new Uint8Array(0);

  const len = Math.min(maxLen, available);
  const chunk = new Uint8Array(len);
  let readPos = Atomics.load(inputState, 3);
  const firstChunk = Math.min(len, INPUT_RING_CAPACITY - readPos);
  chunk.set(inputRing.slice(readPos, readPos + firstChunk), 0);
  if (firstChunk < len) {
    chunk.set(inputRing.slice(0, len - firstChunk), firstChunk);
  }
  readPos = (readPos + len) % INPUT_RING_CAPACITY;
  Atomics.store(inputState, 3, readPos);
  Atomics.sub(inputState, 0, len);
  Atomics.notify(inputState, 0);
  return chunk;
}

function forwardInput(payload) {
  if (payload.length === 0) {
    return;
  }
  for (const listener of dataListeners) {
    listener(payload);
  }
}

function pumpInput() {
  while (Atomics.load(inputState, 0) > 0) {
    const chunk = readFromInputRing(Atomics.load(inputState, 0));
    if (chunk.length === 0) break;
    forwardInput(Array.from(chunk));
  }
}

function waitForReadable(timeoutNs) {
  pumpInput();
  if (slave.readable) return true;
  if (Atomics.load(inputState, 1) === 1) return false;

  if (timeoutNs === 0n) {
    if (DEBUG) console.error("[wasi-debug] poll_oneoff readable=false (non-blocking)");
    return false;
  }

  const timeoutMs = timeoutNs !== undefined && timeoutNs > 0n
    ? Math.max(1, Number(timeoutNs / 1_000_000n))
    : undefined;
  if (DEBUG) console.error(`[wasi-debug] poll_oneoff waiting timeoutNs=${timeoutNs?.toString() ?? "block"}`);
  Atomics.wait(inputState, 0, 0, timeoutMs);
  pumpInput();
  const readable = slave.readable;
  if (DEBUG) console.error(`[wasi-debug] poll_oneoff readable=${readable}`);
  return readable;
}

function waitForClock(timeoutNs) {
  if (timeoutNs <= 0n) {
    return;
  }

  const observed = Atomics.load(inputState, 0);
  const timeoutMs = Math.max(1, Number(timeoutNs / 1_000_000n));
  if (DEBUG) console.error(`[wasi-debug] poll_oneoff clock wait timeoutNs=${timeoutNs.toString()}`);
  Atomics.wait(inputState, 0, observed, timeoutMs);
  pumpInput();
}

function readFromPty(maxLen) {
  while (!slave.readable) {
    if (!waitForReadable(0n)) {
      return new Uint8Array(0);
    }
  }
  return Uint8Array.from(slave.read(maxLen));
}

function writeEvent(view, ptr, userdata, type) {
  new wasiTypes.Event(userdata, wasiTypes.ERRNO_SUCCESS, type).write_bytes(view, ptr);
}

const wasmPath = resolve(process.argv[2] ?? "dist/out.wasm");
const userArgs = process.argv.slice(3);
const args = userArgs.length > 0 ? ["arg0", ...userArgs] : [];
const env = [];
const interactiveShellMode = userArgs.length === 0;

let stdinLineBuffer = "";
let pendingShellExit = false;
let lastGuestReadAt = 0;
let lastGuestWriteAt = Date.now();

const bytes = await readFile(wasmPath);
const module = await WebAssembly.compile(bytes);
const wasi = new WASI(args, env, [], { debug: false });
const importedFunctionNames = new Set(
  WebAssembly.Module.imports(module)
    .filter((entry) => entry.module === "wasi_snapshot_preview1" && entry.kind === "function")
    .map((entry) => entry.name),
);

for (const entry of WebAssembly.Module.imports(module)) {
  if (entry.module !== "wasi_snapshot_preview1" || entry.kind !== "function") {
    continue;
  }

  if (!(entry.name in wasi.wasiImport)) {
    wasi.wasiImport[entry.name] = (..._args) => ERRNO_NOSYS;
  }
}

const originalFdRead = wasi.wasiImport.fd_read;
const originalFdWrite = wasi.wasiImport.fd_write;
const originalFdFdstatGet = wasi.wasiImport.fd_fdstat_get;
const originalFdFilestatGet = wasi.wasiImport.fd_filestat_get;

function noteInputChunk(data) {
  if (!interactiveShellMode || data.length === 0) {
    return false;
  }

  const text = Buffer.from(data).toString("utf8");
  if (DEBUG) {
    console.error(`[wasi-debug] input chunk=${JSON.stringify(text)}`);
  }

  stdinLineBuffer += text;
  const lines = stdinLineBuffer.split(/\r\n|\n|\r/);
  stdinLineBuffer = lines.pop() ?? "";
  let immediateExit = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "exit" || trimmed === "logout") {
      pendingShellExit = true;
      immediateExit = text.trim() === trimmed;
      if (DEBUG) {
        console.error(`[wasi-debug] pending interactive exit from line=${JSON.stringify(trimmed)}`);
      }
    }
  }
  return immediateExit;
}

function maybeExitInteractiveShell() {
  if (!interactiveShellMode || !pendingShellExit) {
    return;
  }

  const now = Date.now();
  if (now - lastGuestReadAt < 300 || now - lastGuestWriteAt < 300) {
    if (DEBUG) {
      console.error(
        `[wasi-debug] waiting to exit shell readDelta=${now - lastGuestReadAt} writeDelta=${now - lastGuestWriteAt}`,
      );
    }
    return;
  }

  if (DEBUG) {
    console.error("[wasi-debug] exiting interactive shell host shim");
  }
  throw new InteractiveShellExit();
}

wasi.wasiImport.fd_read = (fd, iovsPtr, iovsLen, nreadPtr) => {
  if (fd !== 0) {
    return originalFdRead(fd, iovsPtr, iovsLen, nreadPtr);
  }

  if (DEBUG) console.error(`[wasi-debug] fd_read iovs_len=${iovsLen}`);
  const view = memoryView(wasi);
  const bytesView = memoryBytes(wasi);
  const iovecs = wasiTypes.Iovec.read_bytes_array(view, iovsPtr, iovsLen);
  let nread = 0;
  let immediateExit = false;
  for (const iovec of iovecs) {
    if (iovec.buf_len === 0) continue;
    const data = readFromPty(iovec.buf_len);
    bytesView.set(data, iovec.buf);
    immediateExit = noteInputChunk(data) || immediateExit;
    nread += data.length;
    if (data.length < iovec.buf_len) break;
  }
  view.setUint32(nreadPtr, nread, true);
  lastGuestReadAt = Date.now();
  if (DEBUG) console.error(`[wasi-debug] fd_read returning ${nread} bytes from pty`);
  if (immediateExit) {
    if (DEBUG) {
      console.error("[wasi-debug] exiting interactive shell immediately from input command");
    }
    throw new InteractiveShellExit();
  }
  return 0;
};

wasi.wasiImport.fd_write = (fd, iovsPtr, iovsLen, nwrittenPtr) => {
  if (fd !== 1 && fd !== 2) {
    return originalFdWrite(fd, iovsPtr, iovsLen, nwrittenPtr);
  }

  const view = memoryView(wasi);
  const bytesView = memoryBytes(wasi);
  const iovecs = wasiTypes.Ciovec.read_bytes_array(view, iovsPtr, iovsLen);
  let total = 0;
  for (const iovec of iovecs) {
    const chunk = bytesView.slice(iovec.buf, iovec.buf + iovec.buf_len);
    if (chunk.length === 0) continue;
    slave.write(Array.from(chunk));
    total += chunk.length;
  }
  view.setUint32(nwrittenPtr, total, true);
  if (total > 0) {
    lastGuestWriteAt = Date.now();
  }
  return 0;
};

wasi.wasiImport.fd_fdstat_get = (fd, fdstatPtr) => {
  if (fd > 2) {
    return originalFdFdstatGet(fd, fdstatPtr);
  }

  const view = memoryView(wasi);
  view.setUint8(fdstatPtr, wasiTypes.FILETYPE_CHARACTER_DEVICE);
  view.setUint16(fdstatPtr + 2, 0, true);
  view.setBigUint64(fdstatPtr + 8, 0xffffffffffffffffn, true);
  view.setBigUint64(fdstatPtr + 16, 0xffffffffffffffffn, true);
  return 0;
};

wasi.wasiImport.fd_filestat_get = (fd, filestatPtr) => {
  if (fd > 2) {
    return originalFdFilestatGet(fd, filestatPtr);
  }

  const view = memoryView(wasi);
  for (let index = 0; index < 64; index++) {
    view.setUint8(filestatPtr + index, 0);
  }
  view.setUint8(filestatPtr + 16, wasiTypes.FILETYPE_CHARACTER_DEVICE);
  return 0;
};

wasi.wasiImport.poll_oneoff = (inPtr, outPtr, nsubscriptions, neventsPtr) => {
  if (nsubscriptions === 0) {
    return ERRNO_INVAL;
  }

  const view = memoryView(wasi);
  const subscriptions = Array.from({ length: nsubscriptions }, (_, index) =>
    wasiTypes.Subscription.read_bytes(view, inPtr + index * 48),
  );
  if (DEBUG) console.error(`[wasi-debug] poll_oneoff nsubs=${nsubscriptions}`);

  let stdinSubscription;
  let clockSubscription;
  for (const subscription of subscriptions) {
    if (subscription.eventtype === wasiTypes.EVENTTYPE_FD_READ && subscription.clockid === 0) {
      stdinSubscription = subscription;
    } else if (subscription.eventtype === wasiTypes.EVENTTYPE_CLOCK) {
      if (!clockSubscription || subscription.timeout < clockSubscription.timeout) {
        clockSubscription = subscription;
      }
    }
  }

  const readable = stdinSubscription
    ? waitForReadable(clockSubscription?.timeout)
    : false;

  if (!stdinSubscription && clockSubscription) {
    if (pendingShellExit) {
      if (DEBUG) {
        console.error("[wasi-debug] exiting interactive shell on clock-only poll");
      }
      throw new InteractiveShellExit();
    }
    waitForClock(clockSubscription.timeout);
  }

  maybeExitInteractiveShell();

  let eventCount = 0;
  if (readable && stdinSubscription) {
    writeEvent(view, outPtr + eventCount * 32, stdinSubscription.userdata, wasiTypes.EVENTTYPE_FD_READ);
    eventCount += 1;
  }
  if (clockSubscription) {
    writeEvent(view, outPtr + eventCount * 32, clockSubscription.userdata, wasiTypes.EVENTTYPE_CLOCK);
    eventCount += 1;
  }
  view.setUint32(neventsPtr, eventCount, true);
  return 0;
};

wasi.wasiImport.proc_exit = (code) => {
  throw new WASIProcExit(code);
};

if (DEBUG) {
  const skipTrace = new Set([
    "args_get",
    "args_sizes_get",
    "environ_get",
    "environ_sizes_get",
    "clock_time_get",
    "fd_read",
    "fd_write",
    "poll_oneoff",
  ]);

  for (const name of importedFunctionNames) {
    if (skipTrace.has(name)) {
      continue;
    }

    const original = wasi.wasiImport[name];
    if (typeof original !== "function") {
      continue;
    }

    wasi.wasiImport[name] = (...syscallArgs) => {
      const result = original(...syscallArgs);
      console.error(`[wasi-debug] ${name}(${syscallArgs.join(", ")}) => ${result}`);
      return result;
    };
  }
}

const instance = await WebAssembly.instantiate(module, {
  wasi_snapshot_preview1: wasi.wasiImport,
});

try {
  const exitCode = wasi.start(instance);
  process.exit(exitCode);
} catch (error) {
  if (typeof error === "string") {
    const match = error.match(/^exit with exit code (\d+)$/);
    if (match) {
      process.exit(Number(match[1]));
    }
  }
  throw error;
}