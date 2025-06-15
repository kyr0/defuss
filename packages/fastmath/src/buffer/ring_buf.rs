use js_sys::Atomics;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;
use web_sys::console;

pub struct RingBuf {
  capacity: u32,
  storage: js_sys::Float32Array,
  write_ptr: js_sys::Uint32Array,
  read_ptr: js_sys::Uint32Array,
}

impl RingBuf {
  pub fn new(shared_buffer: JsValue) -> RingBuf {
    if !shared_buffer.is_instance_of::<js_sys::SharedArrayBuffer>() {
      panic!("Expected a SharedArrayBuffer");
    }

    let write_ptr = js_sys::Uint32Array::new_with_byte_offset(&shared_buffer, 0);
    let read_ptr = js_sys::Uint32Array::new_with_byte_offset(&shared_buffer, 4);
    let storage = js_sys::Float32Array::new_with_byte_offset_and_length(
      &shared_buffer,
      8,
      (shared_buffer
        .dyn_ref::<js_sys::SharedArrayBuffer>()
        .unwrap()
        .byte_length()
        - 8) as u32
        / 4,
    );

    let capacity = storage.length();

    RingBuf {
      capacity,
      storage,
      write_ptr,
      read_ptr,
    }
  }

  pub fn write(&self, data: &[f32]) -> usize {
    let rd = Atomics::load(&self.read_ptr, 0).unwrap_or(0) as u32;
    let wr = Atomics::load(&self.write_ptr, 0).unwrap_or(0) as u32;

    if (wr + 1) % self.capacity == rd {
        console::log_1(&"Buffer full".into());
        return 0;
    }

    let available = self.available_to_write();
    let to_write = std::cmp::min(data.len(), available as usize);

    // two-part copy
    let first_part = std::cmp::min((self.capacity - wr) as usize, to_write);
    let second_part = to_write - first_part;

    // first part
    for i in 0..first_part {
      self.storage.set_index(wr + i as u32, data[i]);
    }

    // second part (wrap around)
    for i in 0..second_part {
      self.storage.set_index(i as u32, data[first_part + i]);
    }

    // update write pointer exactly like JS
    let new_wr = (wr + to_write as u32) % self.capacity;
    if let Err(err) = Atomics::store(&self.write_ptr, 0, new_wr as i32) {
      console::error_1(&format!("Failed to update write pointer: {:?}", err).into());
    }

    to_write
  }

  pub fn available_to_write(&self) -> u32 {
    let rd = Atomics::load(&self.read_ptr, 0).unwrap_or(0) as u32;
    let wr = Atomics::load(&self.write_ptr, 0).unwrap_or(0) as u32;
    self.capacity() - ((wr + self.capacity - rd) % self.capacity)
  }

  pub fn capacity(&self) -> u32 {
    self.capacity - 1
  }

  pub fn copy_data(&self, target: &mut [f32]) {
    let rd = Atomics::load(&self.read_ptr, 0).unwrap_or(0) as u32;
    let wr = Atomics::load(&self.write_ptr, 0).unwrap_or(0) as u32;

    // calculate the amount of data available to read
    let available = ((wr + self.capacity - rd) % self.capacity) as usize;
    let to_copy = std::cmp::min(target.len(), available);

    // copy data in two parts to handle wraparound
    let first_part = std::cmp::min(to_copy, (self.capacity - rd) as usize);
    for i in 0..first_part {
      target[i] = self.storage.get_index((rd + i as u32) % self.capacity);
    }

    let second_part = to_copy - first_part;
    for i in 0..second_part {
      target[first_part + i] = self.storage.get_index(i as u32);
    }
  }
}