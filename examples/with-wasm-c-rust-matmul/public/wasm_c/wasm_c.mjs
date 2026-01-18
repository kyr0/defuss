
var Module = (() => {
  var _scriptDir = import.meta.url;
  
  return (
async function(moduleArg = {}) {

var Module = moduleArg;

var readyPromiseResolve, readyPromiseReject;

Module["ready"] = new Promise((resolve, reject) => {
 readyPromiseResolve = resolve;
 readyPromiseReject = reject;
});

var moduleOverrides = Object.assign({}, Module);

var arguments_ = [];

var thisProgram = "./this.program";

var quit_ = (status, toThrow) => {
 throw toThrow;
};

var ENVIRONMENT_IS_WEB = typeof window == "object";

var ENVIRONMENT_IS_WORKER = typeof importScripts == "function";

var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string";

var scriptDirectory = "";

function locateFile(path) {
 if (Module["locateFile"]) {
  return Module["locateFile"](path, scriptDirectory);
 }
 return scriptDirectory + path;
}

var read_, readAsync, readBinary;

if (ENVIRONMENT_IS_NODE) {
 const {createRequire: createRequire} = await import("module");
 /** @suppress{duplicate} */ var require = createRequire(import.meta.url);
 var fs = require("fs");
 var nodePath = require("path");
 if (ENVIRONMENT_IS_WORKER) {
  scriptDirectory = nodePath.dirname(scriptDirectory) + "/";
 } else {
  scriptDirectory = require("url").fileURLToPath(new URL("./", import.meta.url));
 }
 read_ = (filename, binary) => {
  filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
  return fs.readFileSync(filename, binary ? undefined : "utf8");
 };
 readBinary = filename => {
  var ret = read_(filename, true);
  if (!ret.buffer) {
   ret = new Uint8Array(ret);
  }
  return ret;
 };
 readAsync = (filename, onload, onerror, binary = true) => {
  filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
  fs.readFile(filename, binary ? undefined : "utf8", (err, data) => {
   if (err) onerror(err); else onload(binary ? data.buffer : data);
  });
 };
 if (!Module["thisProgram"] && process.argv.length > 1) {
  thisProgram = process.argv[1].replace(/\\/g, "/");
 }
 arguments_ = process.argv.slice(2);
 quit_ = (status, toThrow) => {
  process.exitCode = status;
  throw toThrow;
 };
 Module["inspect"] = () => "[Emscripten Module object]";
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
 if (ENVIRONMENT_IS_WORKER) {
  scriptDirectory = self.location.href;
 } else if (typeof document != "undefined" && document.currentScript) {
  scriptDirectory = document.currentScript.src;
 }
 if (_scriptDir) {
  scriptDirectory = _scriptDir;
 }
 if (scriptDirectory.indexOf("blob:") !== 0) {
  scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
 } else {
  scriptDirectory = "";
 }
 {
  read_ = url => {
   var xhr = new XMLHttpRequest;
   xhr.open("GET", url, false);
   xhr.send(null);
   return xhr.responseText;
  };
  if (ENVIRONMENT_IS_WORKER) {
   readBinary = url => {
    var xhr = new XMLHttpRequest;
    xhr.open("GET", url, false);
    xhr.responseType = "arraybuffer";
    xhr.send(null);
    return new Uint8Array(/** @type{!ArrayBuffer} */ (xhr.response));
   };
  }
  readAsync = (url, onload, onerror) => {
   var xhr = new XMLHttpRequest;
   xhr.open("GET", url, true);
   xhr.responseType = "arraybuffer";
   xhr.onload = () => {
    if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) {
     onload(xhr.response);
     return;
    }
    onerror();
   };
   xhr.onerror = onerror;
   xhr.send(null);
  };
 }
} else {}

var out = Module["print"] || console.log.bind(console);

var err = Module["printErr"] || console.error.bind(console);

Object.assign(Module, moduleOverrides);

moduleOverrides = null;

if (Module["arguments"]) arguments_ = Module["arguments"];

if (Module["thisProgram"]) thisProgram = Module["thisProgram"];

if (Module["quit"]) quit_ = Module["quit"];

var wasmBinary;

if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];

if (typeof WebAssembly != "object") {
 abort("no native wasm support detected");
}

var wasmMemory;

var ABORT = false;

var EXITSTATUS;

var /** @type {!Int8Array} */ HEAP8, /** @type {!Uint8Array} */ HEAPU8, /** @type {!Int16Array} */ HEAP16, /** @type {!Uint16Array} */ HEAPU16, /** @type {!Int32Array} */ HEAP32, /** @type {!Uint32Array} */ HEAPU32, /** @type {!Float32Array} */ HEAPF32, /** @type {!Float64Array} */ HEAPF64;

function updateMemoryViews() {
 var b = wasmMemory.buffer;
 Module["HEAP8"] = HEAP8 = new Int8Array(b);
 Module["HEAP16"] = HEAP16 = new Int16Array(b);
 Module["HEAPU8"] = HEAPU8 = new Uint8Array(b);
 Module["HEAPU16"] = HEAPU16 = new Uint16Array(b);
 Module["HEAP32"] = HEAP32 = new Int32Array(b);
 Module["HEAPU32"] = HEAPU32 = new Uint32Array(b);
 Module["HEAPF32"] = HEAPF32 = new Float32Array(b);
 Module["HEAPF64"] = HEAPF64 = new Float64Array(b);
}

var __ATPRERUN__ = [];

var __ATINIT__ = [];

var __ATPOSTRUN__ = [];

var runtimeInitialized = false;

function preRun() {
 if (Module["preRun"]) {
  if (typeof Module["preRun"] == "function") Module["preRun"] = [ Module["preRun"] ];
  while (Module["preRun"].length) {
   addOnPreRun(Module["preRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPRERUN__);
}

function initRuntime() {
 runtimeInitialized = true;
 callRuntimeCallbacks(__ATINIT__);
}

function postRun() {
 if (Module["postRun"]) {
  if (typeof Module["postRun"] == "function") Module["postRun"] = [ Module["postRun"] ];
  while (Module["postRun"].length) {
   addOnPostRun(Module["postRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
 __ATPRERUN__.unshift(cb);
}

function addOnInit(cb) {
 __ATINIT__.unshift(cb);
}

function addOnPostRun(cb) {
 __ATPOSTRUN__.unshift(cb);
}

var runDependencies = 0;

var runDependencyWatcher = null;

var dependenciesFulfilled = null;

function addRunDependency(id) {
 runDependencies++;
 if (Module["monitorRunDependencies"]) {
  Module["monitorRunDependencies"](runDependencies);
 }
}

function removeRunDependency(id) {
 runDependencies--;
 if (Module["monitorRunDependencies"]) {
  Module["monitorRunDependencies"](runDependencies);
 }
 if (runDependencies == 0) {
  if (runDependencyWatcher !== null) {
   clearInterval(runDependencyWatcher);
   runDependencyWatcher = null;
  }
  if (dependenciesFulfilled) {
   var callback = dependenciesFulfilled;
   dependenciesFulfilled = null;
   callback();
  }
 }
}

/** @param {string|number=} what */ function abort(what) {
 if (Module["onAbort"]) {
  Module["onAbort"](what);
 }
 what = "Aborted(" + what + ")";
 err(what);
 ABORT = true;
 EXITSTATUS = 1;
 what += ". Build with -sASSERTIONS for more info.";
 /** @suppress {checkTypes} */ var e = new WebAssembly.RuntimeError(what);
 readyPromiseReject(e);
 throw e;
}

var dataURIPrefix = "data:application/octet-stream;base64,";

/**
 * Indicates whether filename is a base64 data URI.
 * @noinline
 */ var isDataURI = filename => filename.startsWith(dataURIPrefix);

/**
 * Indicates whether filename is delivered via file protocol (as opposed to http/https)
 * @noinline
 */ var isFileURI = filename => filename.startsWith("file://");


const dataUrlToUint8Array = (dataUrl) => {
  // extract the base64 encoded part from the data URL
  const base64String = dataUrl.split(',')[1];
  
  // decode the base64 string into a binary string
  const binaryString = atob(base64String);

  // create a Uint8Array from the binary string
  const binaryLength = binaryString.length;
  const bytes = new Uint8Array(binaryLength);
  
  for (let i = 0; i < binaryLength; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};
var wasmBinaryFile = 'data:application/octet-stream;base64,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';
wasmBinary = dataUrlToUint8Array(wasmBinaryFile);


if (Module["locateFile"]) {
 wasmBinaryFile = "wasm_c.wasm";
 if (!isDataURI(wasmBinaryFile)) {
  wasmBinaryFile = locateFile(wasmBinaryFile);
 }
} else {
 wasmBinaryFile = new URL("wasm_c.wasm", import.meta.url).href;
}

function getBinarySync(file) {
 if (file == wasmBinaryFile && wasmBinary) {
  return new Uint8Array(wasmBinary);
 }
 if (readBinary) {
  return readBinary(file);
 }
 throw "both async and sync fetching of the wasm failed";
}

function getBinaryPromise(binaryFile) {
 if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
  if (typeof fetch == "function" && !isFileURI(binaryFile)) {
   return fetch(binaryFile, {
    credentials: "same-origin"
   }).then(response => {
    if (!response["ok"]) {
     throw "failed to load wasm binary file at '" + binaryFile + "'";
    }
    return response["arrayBuffer"]();
   }).catch(() => getBinarySync(binaryFile));
  } else if (readAsync) {
   return new Promise((resolve, reject) => {
    readAsync(binaryFile, response => resolve(new Uint8Array(/** @type{!ArrayBuffer} */ (response))), reject);
   });
  }
 }
 return Promise.resolve().then(() => getBinarySync(binaryFile));
}

function instantiateArrayBuffer(binaryFile, imports, receiver) {
 return getBinaryPromise(binaryFile).then(binary => WebAssembly.instantiate(binary, imports)).then(instance => instance).then(receiver, reason => {
  err(`failed to asynchronously prepare wasm: ${reason}`);
  abort(reason);
 });
}

function instantiateAsync(binary, binaryFile, imports, callback) {
 if (!binary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(binaryFile) && !isFileURI(binaryFile) && !ENVIRONMENT_IS_NODE && typeof fetch == "function") {
  return fetch(binaryFile, {
   credentials: "same-origin"
  }).then(response => {
   /** @suppress {checkTypes} */ var result = WebAssembly.instantiateStreaming(response, imports);
   return result.then(callback, function(reason) {
    err(`wasm streaming compile failed: ${reason}`);
    err("falling back to ArrayBuffer instantiation");
    return instantiateArrayBuffer(binaryFile, imports, callback);
   });
  });
 }
 return instantiateArrayBuffer(binaryFile, imports, callback);
}

function createWasm() {
 var info = {
  "env": wasmImports,
  "wasi_snapshot_preview1": wasmImports
 };
 /** @param {WebAssembly.Module=} module*/ function receiveInstance(instance, module) {
  wasmExports = instance.exports;
  wasmExports = applySignatureConversions(wasmExports);
  wasmMemory = wasmExports["memory"];
  updateMemoryViews();
  addOnInit(wasmExports["__wasm_call_ctors"]);
  removeRunDependency("wasm-instantiate");
  return wasmExports;
 }
 addRunDependency("wasm-instantiate");
 function receiveInstantiationResult(result) {
  receiveInstance(result["instance"]);
 }
 if (Module["instantiateWasm"]) {
  try {
   return Module["instantiateWasm"](info, receiveInstance);
  } catch (e) {
   err(`Module.instantiateWasm callback failed with error: ${e}`);
   readyPromiseReject(e);
  }
 }
 instantiateAsync(wasmBinary, wasmBinaryFile, info, receiveInstantiationResult).catch(readyPromiseReject);
 return {};
}

var callRuntimeCallbacks = callbacks => {
 while (callbacks.length > 0) {
  callbacks.shift()(Module);
 }
};

var noExitRuntime = Module["noExitRuntime"] || true;

var getHeapMax = () => 4294901760;

var growMemory = size => {
 var b = wasmMemory.buffer;
 var pages = (size - b.byteLength + 65535) / 65536;
 try {
  wasmMemory.grow(pages);
  updateMemoryViews();
  return 1;
 } /*success*/ catch (e) {}
};

function _emscripten_resize_heap(requestedSize) {
 requestedSize >>>= 0;
 var oldSize = HEAPU8.length;
 var maxHeapSize = getHeapMax();
 if (requestedSize > maxHeapSize) {
  return false;
 }
 var alignUp = (x, multiple) => x + (multiple - x % multiple) % multiple;
 for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
  var overGrownHeapSize = oldSize * (1 + .2 / cutDown);
  overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
  var newSize = Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536));
  var replacement = growMemory(newSize);
  if (replacement) {
   return true;
  }
 }
 return false;
}

var wasmImports = {
 /** @export */ emscripten_resize_heap: _emscripten_resize_heap
};

var wasmExports = createWasm();

var ___wasm_call_ctors = () => (___wasm_call_ctors = wasmExports["__wasm_call_ctors"])();

var _dot_product_serial_c_plain = Module["_dot_product_serial_c_plain"] = (a0, a1, a2, a3, a4) => (_dot_product_serial_c_plain = Module["_dot_product_serial_c_plain"] = wasmExports["dot_product_serial_c_plain"])(a0, a1, a2, a3, a4);

var _dot_product_c = Module["_dot_product_c"] = (a0, a1, a2) => (_dot_product_c = Module["_dot_product_c"] = wasmExports["dot_product_c"])(a0, a1, a2);

var _dot_product_serial_c = Module["_dot_product_serial_c"] = (a0, a1, a2, a3, a4) => (_dot_product_serial_c = Module["_dot_product_serial_c"] = wasmExports["dot_product_serial_c"])(a0, a1, a2, a3, a4);

var ___errno_location = () => (___errno_location = wasmExports["__errno_location"])();

var _malloc = Module["_malloc"] = a0 => (_malloc = Module["_malloc"] = wasmExports["malloc"])(a0);

var _free = Module["_free"] = a0 => (_free = Module["_free"] = wasmExports["free"])(a0);

var stackSave = () => (stackSave = wasmExports["stackSave"])();

var stackRestore = a0 => (stackRestore = wasmExports["stackRestore"])(a0);

var stackAlloc = a0 => (stackAlloc = wasmExports["stackAlloc"])(a0);

function applySignatureConversions(wasmExports) {
 wasmExports = Object.assign({}, wasmExports);
 var makeWrapper_p = f => () => f() >>> 0;
 var makeWrapper_pp = f => a0 => f(a0) >>> 0;
 wasmExports["__errno_location"] = makeWrapper_p(wasmExports["__errno_location"]);
 wasmExports["malloc"] = makeWrapper_pp(wasmExports["malloc"]);
 wasmExports["stackSave"] = makeWrapper_p(wasmExports["stackSave"]);
 wasmExports["stackAlloc"] = makeWrapper_pp(wasmExports["stackAlloc"]);
 return wasmExports;
}

var calledRun;

dependenciesFulfilled = function runCaller() {
 if (!calledRun) run();
 if (!calledRun) dependenciesFulfilled = runCaller;
};

function run() {
 if (runDependencies > 0) {
  return;
 }
 preRun();
 if (runDependencies > 0) {
  return;
 }
 function doRun() {
  if (calledRun) return;
  calledRun = true;
  Module["calledRun"] = true;
  if (ABORT) return;
  initRuntime();
  readyPromiseResolve(Module);
  if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
  postRun();
 }
 if (Module["setStatus"]) {
  Module["setStatus"]("Running...");
  setTimeout(function() {
   setTimeout(function() {
    Module["setStatus"]("");
   }, 1);
   doRun();
  }, 1);
 } else {
  doRun();
 }
}

if (Module["preInit"]) {
 if (typeof Module["preInit"] == "function") Module["preInit"] = [ Module["preInit"] ];
 while (Module["preInit"].length > 0) {
  Module["preInit"].pop()();
 }
}

run();


  return moduleArg.ready
}
);
})();
;
export default Module;