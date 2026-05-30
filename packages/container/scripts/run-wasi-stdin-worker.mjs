import { readSync } from "node:fs";
import { workerData } from "node:worker_threads";

const CAPACITY = workerData.capacity;
const state = new Int32Array(workerData.stateBuffer);
const ring = new Uint8Array(workerData.dataBuffer);
const temp = Buffer.alloc(4096);

while (Atomics.load(state, 4) === 0) {
  let read;
  try {
    read = readSync(0, temp, 0, temp.length, null);
  } catch (error) {
    if (error && (error.code === "EAGAIN" || error.code === "EWOULDBLOCK")) {
      Atomics.wait(state, 4, 0, 10);
      continue;
    }
    throw error;
  }

  if (read <= 0) {
    Atomics.store(state, 1, 1);
    Atomics.notify(state, 0);
    break;
  }

  let offset = 0;
  while (offset < read && Atomics.load(state, 4) === 0) {
    const available = Atomics.load(state, 0);
    const free = CAPACITY - available;
    if (free === 0) {
      Atomics.wait(state, 0, CAPACITY);
      continue;
    }

    const writePos = Atomics.load(state, 2);
    const chunk = Math.min(read - offset, free, CAPACITY - writePos);
    ring.set(temp.subarray(offset, offset + chunk), writePos);
    Atomics.store(state, 2, (writePos + chunk) % CAPACITY);
    Atomics.add(state, 0, chunk);
    Atomics.notify(state, 0);
    offset += chunk;
  }
}