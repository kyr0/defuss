var Module = (() => {
  
  return (
async function(moduleArg = {}) {
  var moduleRtn;

// include: shell.js
// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(moduleArg) => Promise<Module>
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = moduleArg;

// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).

// Attempt to auto-detect the environment
var ENVIRONMENT_IS_WEB = typeof window == 'object';
var ENVIRONMENT_IS_WORKER = typeof WorkerGlobalScope != 'undefined';
// N.b. Electron.js environment is simultaneously a NODE-environment, but
// also a web environment.
var ENVIRONMENT_IS_NODE = typeof process == 'object' && process.versions?.node && process.type != 'renderer';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  // When building an ES module `require` is not normally available.
  // We need to use `createRequire()` to construct the require()` function.
  const { createRequire } = await import('module');
  /** @suppress{duplicate} */
  var require = createRequire(import.meta.url);

}

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)


var arguments_ = [];
var thisProgram = './this.program';
var quit_ = (status, toThrow) => {
  throw toThrow;
};

var _scriptName = import.meta.url;

// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = '';
function locateFile(path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory);
  }
  return scriptDirectory + path;
}

// Hooks that are implemented differently in different runtime environments.
var readAsync, readBinary;

if (ENVIRONMENT_IS_NODE) {

  // These modules will usually be used on Node.js. Load them eagerly to avoid
  // the complexity of lazy-loading.
  var fs = require('fs');

  if (_scriptName.startsWith('file:')) {
    scriptDirectory = require('path').dirname(require('url').fileURLToPath(_scriptName)) + '/';
  }

// include: node_shell_read.js
readBinary = (filename) => {
  // We need to re-wrap `file://` strings to URLs.
  filename = isFileURI(filename) ? new URL(filename) : filename;
  var ret = fs.readFileSync(filename);
  return ret;
};

readAsync = async (filename, binary = true) => {
  // See the comment in the `readBinary` function.
  filename = isFileURI(filename) ? new URL(filename) : filename;
  var ret = fs.readFileSync(filename, binary ? undefined : 'utf8');
  return ret;
};
// end include: node_shell_read.js
  if (process.argv.length > 1) {
    thisProgram = process.argv[1].replace(/\\/g, '/');
  }

  arguments_ = process.argv.slice(2);

  quit_ = (status, toThrow) => {
    process.exitCode = status;
    throw toThrow;
  };

} else

// Note that this includes Node.js workers when relevant (pthreads is enabled).
// Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
// ENVIRONMENT_IS_NODE.
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  try {
    scriptDirectory = new URL('.', _scriptName).href; // includes trailing slash
  } catch {
    // Must be a `blob:` or `data:` URL (e.g. `blob:http://site.com/etc/etc`), we cannot
    // infer anything from them.
  }

  {
// include: web_or_worker_shell_read.js
if (ENVIRONMENT_IS_WORKER) {
    readBinary = (url) => {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.responseType = 'arraybuffer';
      xhr.send(null);
      return new Uint8Array(/** @type{!ArrayBuffer} */(xhr.response));
    };
  }

  readAsync = async (url) => {
    // Fetch has some additional restrictions over XHR, like it can't be used on a file:// url.
    // See https://github.com/github/fetch/pull/92#issuecomment-140665932
    // Cordova or Electron apps are typically loaded from a file:// url.
    // So use XHR on webview if URL is a file URL.
    if (isFileURI(url)) {
      return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            resolve(xhr.response);
            return;
          }
          reject(xhr.status);
        };
        xhr.onerror = reject;
        xhr.send(null);
      });
    }
    var response = await fetch(url, { credentials: 'same-origin' });
    if (response.ok) {
      return response.arrayBuffer();
    }
    throw new Error(response.status + ' : ' + response.url);
  };
// end include: web_or_worker_shell_read.js
  }
} else
{
}

var out = console.log.bind(console);
var err = console.error.bind(console);

// end include: shell.js

// include: preamble.js
// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

var wasmBinary;

// Wasm globals

//========================================
// Runtime essentials
//========================================

// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code code in shell environments
// but only when noExitRuntime is false.
var EXITSTATUS;

// In STRICT mode, we only define assert() when ASSERTIONS is set.  i.e. we
// don't define it at all in release modes.  This matches the behaviour of
// MINIMAL_RUNTIME.
// TODO(sbc): Make this the default even without STRICT enabled.
/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    // This build was created without ASSERTIONS defined.  `assert()` should not
    // ever be called in this configuration but in case there are callers in
    // the wild leave this simple abort() implementation here for now.
    abort(text);
  }
}

/**
 * Indicates whether filename is delivered via file protocol (as opposed to http/https)
 * @noinline
 */
var isFileURI = (filename) => filename.startsWith('file://');

// include: runtime_common.js
// include: runtime_stack_check.js
// end include: runtime_stack_check.js
// include: runtime_exceptions.js
// end include: runtime_exceptions.js
// include: runtime_debug.js
// end include: runtime_debug.js
var readyPromiseResolve, readyPromiseReject;

// Memory management

var wasmMemory;

var
/** @type {!Int8Array} */
  HEAP8,
/** @type {!Uint8Array} */
  HEAPU8,
/** @type {!Int16Array} */
  HEAP16,
/** @type {!Uint16Array} */
  HEAPU16,
/** @type {!Int32Array} */
  HEAP32,
/** @type {!Uint32Array} */
  HEAPU32,
/** @type {!Float32Array} */
  HEAPF32,
/** @type {!Float64Array} */
  HEAPF64;

// BigInt64Array type is not correctly defined in closure
var
/** not-@type {!BigInt64Array} */
  HEAP64,
/* BigUint64Array type is not correctly defined in closure
/** not-@type {!BigUint64Array} */
  HEAPU64;

var runtimeInitialized = false;



function updateMemoryViews() {
  var b = wasmMemory.buffer;
  HEAP8 = new Int8Array(b);
  HEAP16 = new Int16Array(b);
  HEAPU8 = new Uint8Array(b);
  HEAPU16 = new Uint16Array(b);
  HEAP32 = new Int32Array(b);
  HEAPU32 = new Uint32Array(b);
  HEAPF32 = new Float32Array(b);
  HEAPF64 = new Float64Array(b);
  HEAP64 = new BigInt64Array(b);
  HEAPU64 = new BigUint64Array(b);
}

// include: memoryprofiler.js
// end include: memoryprofiler.js
// end include: runtime_common.js
function preRun() {
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  // Begin ATPRERUNS hooks
  callRuntimeCallbacks(onPreRuns);
  // End ATPRERUNS hooks
}

function initRuntime() {
  runtimeInitialized = true;

  // No ATINITS hooks

  wasmExports['__wasm_call_ctors']();

  // No ATPOSTCTORS hooks
}

function postRun() {
   // PThreads reuse the runtime from the main thread.

  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }

  // Begin ATPOSTRUNS hooks
  callRuntimeCallbacks(onPostRuns);
  // End ATPOSTRUNS hooks
}

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// Module.preRun (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled

function addRunDependency(id) {
  runDependencies++;

  Module['monitorRunDependencies']?.(runDependencies);

}

function removeRunDependency(id) {
  runDependencies--;

  Module['monitorRunDependencies']?.(runDependencies);

  if (runDependencies == 0) {
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}

/** @param {string|number=} what */
function abort(what) {
  Module['onAbort']?.(what);

  what = 'Aborted(' + what + ')';
  // TODO(sbc): Should we remove printing and leave it up to whoever
  // catches the exception?
  err(what);

  ABORT = true;

  what += '. Build with -sASSERTIONS for more info.';

  // Use a wasm runtime error, because a JS error might be seen as a foreign
  // exception, which means we'd run destructors on it. We need the error to
  // simply make the program stop.
  // FIXME This approach does not work in Wasm EH because it currently does not assume
  // all RuntimeErrors are from traps; it decides whether a RuntimeError is from
  // a trap or not based on a hidden field within the object. So at the moment
  // we don't have a way of throwing a wasm trap from JS. TODO Make a JS API that
  // allows this in the wasm spec.

  // Suppress closure compiler warning here. Closure compiler's builtin extern
  // definition for WebAssembly.RuntimeError claims it takes no arguments even
  // though it can.
  // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure gets fixed.
  /** @suppress {checkTypes} */
  var e = new WebAssembly.RuntimeError(what);

  readyPromiseReject?.(e);
  // Throw the error whether or not MODULARIZE is set because abort is used
  // in code paths apart from instantiation where an exception is expected
  // to be thrown when abort is called.
  throw e;
}


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
var wasmBinaryFile = 'data:application/octet-stream;base64,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nAgoAgBHDQZBkAhBADYCAEGcCEEANgIADwtBnAgoAgAiBiAERgRAQZwIIAM2AgBBkAhBkAgoAgAgAGoiADYCACADIABBAXI2AgQgACADaiAANgIADwsgAkF4cSAAaiEAIAQoAgwhASACQf8BTQRAIAQoAggiBSABRgRAQYgIQYgIKAIAQX4gAkEDdndxNgIADAULIAUgATYCDCABIAU2AggMBAsgBCgCGCEHIAEgBEcEQCAEKAIIIgIgATYCDCABIAI2AggMAwsgBCgCFCICBH8gBEEUagUgBCgCECICRQ0CIARBEGoLIQUDQCAFIQggAiIBQRRqIQUgASgCFCICDQAgAUEQaiEFIAEoAhAiAg0ACyAIQQA2AgAMAgsgBCACQX5xNgIEIAMgAEEBcjYCBCAAIANqIAA2AgAMAwtBACEBCyAHRQ0AAkAgBCgCHCIFQQJ0QbgKaiICKAIAIARGBEAgAiABNgIAIAENAUGMCEGMCCgCAEF+IAV3cTYCAAwCCwJAIAQgBygCEEYEQCAHIAE2AhAMAQsgByABNgIUCyABRQ0BCyABIAc2AhggBCgCECICBEAgASACNgIQIAIgATYCGAsgBCgCFCICRQ0AIAEgAjYCFCACIAE2AhgLIAMgAEEBcjYCBCAAIANqIAA2AgAgAyAGRw0AQZAIIAA2AgAPCyAAQf8BTQRAIABBeHFBsAhqIQECf0GICCgCACICQQEgAEEDdnQiAHFFBEBBiAggACACcjYCACABDAELIAEoAggLIQAgASADNgIIIAAgAzYCDCADIAE2AgwgAyAANgIIDwtBHyEBIABB////B00EQCAAQSYgAEEIdmciAWt2QQFxIAFBAXRrQT5qIQELIAMgATYCHCADQgA3AhAgAUECdEG4CmohBQJ/AkACf0GMCCgCACICQQEgAXQiBHFFBEBBjAggAiAEcjYCACAFIAM2AgBBGCEBQQgMAQsgAEEZIAFBAXZrQQAgAUEfRxt0IQEgBSgCACEFA0AgBSICKAIEQXhxIABGDQIgAUEddiEFIAFBAXQhASACIAVBBHFqIgQoAhAiBQ0ACyAEIAM2AhBBGCEBIAIhBUEICyEAIAMhAiADDAELIAIoAggiBSADNgIMIAIgAzYCCEEYIQBBCCEBQQALIQQgASADaiAFNgIAIAMgAjYCDCAAIANqIAQ2AgBBqAhBqAgoAgBBAWsiA0F/IAMbNgIACwsLCQEAQYEICwIGAQD7AQRuYW1lAAwLd2FzbV9jLndhc20BxwEJABZlbXNjcmlwdGVuX3Jlc2l6ZV9oZWFwARFfX3dhc21fY2FsbF9jdG9ycwINZG90X3Byb2R1Y3RfYwMZX2Vtc2NyaXB0ZW5fc3RhY2tfcmVzdG9yZQQXX2Vtc2NyaXB0ZW5fc3RhY2tfYWxsb2MFHGVtc2NyaXB0ZW5fc3RhY2tfZ2V0X2N1cnJlbnQGBHNicmsHGWVtc2NyaXB0ZW5fYnVpbHRpbl9tYWxsb2MIF2Vtc2NyaXB0ZW5fYnVpbHRpbl9mcmVlBxIBAA9fX3N0YWNrX3BvaW50ZXIJCAEABS5kYXRhACEQc291cmNlTWFwcGluZ1VSTA93YXNtX2Mud2FzbS5tYXA=';
wasmBinary = dataUrlToUint8Array(wasmBinaryFile);


function findWasmBinary() {
  if (Module['locateFile']) {
    return locateFile('wasm_c.wasm');
  }
  // Use bundler-friendly `new URL(..., import.meta.url)` pattern; works in browsers too.
  return new URL('wasm_c.wasm', import.meta.url).href;
}

function getBinarySync(file) {
  if (file == wasmBinaryFile && wasmBinary) {
    return new Uint8Array(wasmBinary);
  }
  if (readBinary) {
    return readBinary(file);
  }
  throw 'both async and sync fetching of the wasm failed';
}

async function getWasmBinary(binaryFile) {
  // If we don't have the binary yet, load it asynchronously using readAsync.
  if (!wasmBinary) {
    // Fetch the binary using readAsync
    try {
      var response = await readAsync(binaryFile);
      return new Uint8Array(response);
    } catch {
      // Fall back to getBinarySync below;
    }
  }

  // Otherwise, getBinarySync should be able to get it synchronously
  return getBinarySync(binaryFile);
}

async function instantiateArrayBuffer(binaryFile, imports) {
  try {
    var binary = await getWasmBinary(binaryFile);
    var instance = await WebAssembly.instantiate(binary, imports);
    return instance;
  } catch (reason) {
    err(`failed to asynchronously prepare wasm: ${reason}`);

    abort(reason);
  }
}

async function instantiateAsync(binary, binaryFile, imports) {
  if (!binary && typeof WebAssembly.instantiateStreaming == 'function'
      // Don't use streaming for file:// delivered objects in a webview, fetch them synchronously.
      && !isFileURI(binaryFile)
      // Avoid instantiateStreaming() on Node.js environment for now, as while
      // Node.js v18.1.0 implements it, it does not have a full fetch()
      // implementation yet.
      //
      // Reference:
      //   https://github.com/emscripten-core/emscripten/pull/16917
      && !ENVIRONMENT_IS_NODE
     ) {
    try {
      var response = fetch(binaryFile, { credentials: 'same-origin' });
      var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
      return instantiationResult;
    } catch (reason) {
      // We expect the most common failure cause to be a bad MIME type for the binary,
      // in which case falling back to ArrayBuffer instantiation should work.
      err(`wasm streaming compile failed: ${reason}`);
      err('falling back to ArrayBuffer instantiation');
      // fall back of instantiateArrayBuffer below
    };
  }
  return instantiateArrayBuffer(binaryFile, imports);
}

function getWasmImports() {
  // prepare imports
  return {
    'env': wasmImports,
    'wasi_snapshot_preview1': wasmImports,
  }
}

// Create the wasm instance.
// Receives the wasm imports, returns the exports.
async function createWasm() {
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  /** @param {WebAssembly.Module=} module*/
  function receiveInstance(instance, module) {
    wasmExports = instance.exports;

    

    wasmMemory = wasmExports['memory'];
    
    updateMemoryViews();

    assignWasmExports(wasmExports);
    removeRunDependency('wasm-instantiate');
    return wasmExports;
  }
  // wait for the pthread pool (if any)
  addRunDependency('wasm-instantiate');

  // Prefer streaming instantiation if available.
  function receiveInstantiationResult(result) {
    // 'result' is a ResultObject object which has both the module and instance.
    // receiveInstance() will swap in the exports (to Module.asm) so they can be called
    // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193, the above line no longer optimizes out down to the following line.
    // When the regression is fixed, can restore the above PTHREADS-enabled path.
    return receiveInstance(result['instance']);
  }

  var info = getWasmImports();

  // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
  // to manually instantiate the Wasm module themselves. This allows pages to
  // run the instantiation parallel to any other async startup actions they are
  // performing.
  // Also pthreads and wasm workers initialize the wasm instance through this
  // path.
  if (Module['instantiateWasm']) {
    return new Promise((resolve, reject) => {
        Module['instantiateWasm'](info, (mod, inst) => {
          resolve(receiveInstance(mod, inst));
        });
    });
  }

  wasmBinaryFile ??= findWasmBinary();
  var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info);
  var exports = receiveInstantiationResult(result);
  return exports;
}

// end include: preamble.js

// Begin JS library code


  class ExitStatus {
      name = 'ExitStatus';
      constructor(status) {
        this.message = `Program terminated with exit(${status})`;
        this.status = status;
      }
    }

  var callRuntimeCallbacks = (callbacks) => {
      while (callbacks.length > 0) {
        // Pass the module as the first argument.
        callbacks.shift()(Module);
      }
    };
  var onPostRuns = [];
  var addOnPostRun = (cb) => onPostRuns.push(cb);

  var onPreRuns = [];
  var addOnPreRun = (cb) => onPreRuns.push(cb);


  
    /**
     * @param {number} ptr
     * @param {string} type
     */
  function getValue(ptr, type = 'i8') {
    if (type.endsWith('*')) type = '*';
    switch (type) {
      case 'i1': return HEAP8[ptr];
      case 'i8': return HEAP8[ptr];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP64[((ptr)>>3)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      case '*': return HEAPU32[((ptr)>>2)];
      default: abort(`invalid type for getValue: ${type}`);
    }
  }

  var noExitRuntime = true;

  
    /**
     * @param {number} ptr
     * @param {number} value
     * @param {string} type
     */
  function setValue(ptr, value, type = 'i8') {
    if (type.endsWith('*')) type = '*';
    switch (type) {
      case 'i1': HEAP8[ptr] = value; break;
      case 'i8': HEAP8[ptr] = value; break;
      case 'i16': HEAP16[((ptr)>>1)] = value; break;
      case 'i32': HEAP32[((ptr)>>2)] = value; break;
      case 'i64': HEAP64[((ptr)>>3)] = BigInt(value); break;
      case 'float': HEAPF32[((ptr)>>2)] = value; break;
      case 'double': HEAPF64[((ptr)>>3)] = value; break;
      case '*': HEAPU32[((ptr)>>2)] = value; break;
      default: abort(`invalid type for setValue: ${type}`);
    }
  }

  var stackRestore = (val) => __emscripten_stack_restore(val);

  var stackSave = () => _emscripten_stack_get_current();

  var abortOnCannotGrowMemory = (requestedSize) => {
      abort('OOM');
    };
  var _emscripten_resize_heap = (requestedSize) => {
      var oldSize = HEAPU8.length;
      // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
      requestedSize >>>= 0;
      abortOnCannotGrowMemory(requestedSize);
    };
// End JS library code

// include: postlibrary.js
// This file is included after the automatically-generated JS library code
// but before the wasm module is created.

{

  // Begin ATMODULES hooks
  if (Module['noExitRuntime']) noExitRuntime = Module['noExitRuntime'];
if (Module['print']) out = Module['print'];
if (Module['printErr']) err = Module['printErr'];
if (Module['wasmBinary']) wasmBinary = Module['wasmBinary'];
  // End ATMODULES hooks

  if (Module['arguments']) arguments_ = Module['arguments'];
  if (Module['thisProgram']) thisProgram = Module['thisProgram'];

}

// Begin runtime exports
  // End runtime exports
  // Begin JS library exports
  // End JS library exports

// end include: postlibrary.js


// Imports from the Wasm binary.
var _dot_product_c,
  _malloc,
  _free,
  __emscripten_stack_restore,
  __emscripten_stack_alloc,
  _emscripten_stack_get_current;


function assignWasmExports(wasmExports) {
  Module['_dot_product_c'] = _dot_product_c = wasmExports['dot_product_c'];
  Module['_malloc'] = _malloc = wasmExports['malloc'];
  Module['_free'] = _free = wasmExports['free'];
  __emscripten_stack_restore = wasmExports['_emscripten_stack_restore'];
  __emscripten_stack_alloc = wasmExports['_emscripten_stack_alloc'];
  _emscripten_stack_get_current = wasmExports['emscripten_stack_get_current'];
}
var wasmImports = {
  /** @export */
  emscripten_resize_heap: _emscripten_resize_heap
};
var wasmExports = await createWasm();


// include: postamble.js
// === Auto-generated postamble setup entry stuff ===

function run() {

  if (runDependencies > 0) {
    dependenciesFulfilled = run;
    return;
  }

  preRun();

  // a preRun added a dependency, run will be called later
  if (runDependencies > 0) {
    dependenciesFulfilled = run;
    return;
  }

  function doRun() {
    // run may have just been called through dependencies being fulfilled just in this very frame,
    // or while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return;

    initRuntime();

    readyPromiseResolve?.(Module);
    Module['onRuntimeInitialized']?.();

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(() => {
      setTimeout(() => Module['setStatus'](''), 1);
      doRun();
    }, 1);
  } else
  {
    doRun();
  }
}

function preInit() {
  if (Module['preInit']) {
    if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
    while (Module['preInit'].length > 0) {
      Module['preInit'].shift()();
    }
  }
}

preInit();
run();

// end include: postamble.js

// include: postamble_modularize.js
// In MODULARIZE mode we wrap the generated code in a factory function
// and return either the Module itself, or a promise of the module.
//
// We assign to the `moduleRtn` global here and configure closure to see
// this as and extern so it won't get minified.

if (runtimeInitialized)  {
  moduleRtn = Module;
} else {
  // Set up the promise that indicates the Module is initialized
  moduleRtn = new Promise((resolve, reject) => {
    readyPromiseResolve = resolve;
    readyPromiseReject = reject;
  });
}

// end include: postamble_modularize.js



  return moduleRtn;
}
);
})();
export default Module;
