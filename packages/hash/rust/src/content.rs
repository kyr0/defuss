use serde_json::{Map, Number, Value};
use wasm_bindgen::prelude::*;

const TOK_NULL: u64 = 0x4210_8421;
const TOK_TRUE: u64 = 0x4210_8422;
const TOK_FALSE: u64 = 0x4210_8423;
const TOK_NUM: u64 = 0x4210_8424;
const TOK_STR: u64 = 0x4210_8425;
const TOK_ARR: u64 = 0x4210_8426;
const TOK_OBJ: u64 = 0x4210_8427;
const TOK_KEY: u64 = 0x4210_8428;
const TOK_CNT: u64 = 0x4210_8429;

const SEED_A: u64 = 0x243f_6a88_85a3_08d3;
const SEED_B: u64 = 0x1319_8a2e_0370_7344;
const MIX_A: u64 = 0x9e37_79b9_7f4a_7c15;
const MIX_B: u64 = 0xbf58_476d_1ce4_e5b9;
const MIX_C: u64 = 0x94d0_49bb_1331_11eb;

#[derive(Clone, Copy, Debug)]
struct Hash128 {
    a: u64,
    b: u64,
}

impl Hash128 {
    fn seeded(token: u64) -> Self {
        Self {
            a: avalanche(SEED_A ^ token),
            b: avalanche(SEED_B ^ token.rotate_left(17)),
        }
    }

    fn push_u64(&mut self, value: u64) {
        self.a = mix_lane(self.a, value ^ MIX_A);
        self.b = mix_lane(self.b, value ^ MIX_B);
    }

    fn push_hash(&mut self, other: Hash128) {
        self.push_u64(other.a);
        self.push_u64(other.b);
    }

    fn finish(mut self) -> Self {
        self.a = avalanche(self.a);
        self.b = avalanche(self.b);
        self
    }

    fn to_hex(self) -> String {
        format!("{:016x}{:016x}", self.a, self.b)
    }
}

#[inline]
fn avalanche(mut x: u64) -> u64 {
    x ^= x >> 30;
    x = x.wrapping_mul(MIX_B);
    x ^= x >> 27;
    x = x.wrapping_mul(MIX_C);
    x ^ (x >> 31)
}

#[inline]
fn mix_lane(state: u64, value: u64) -> u64 {
    avalanche(state ^ avalanche(value.wrapping_add(MIX_A)).rotate_left(27))
}

fn hash_bytes(token: u64, bytes: &[u8]) -> Hash128 {
    let mut h = Hash128::seeded(token);
    h.push_u64(bytes.len() as u64);

    let mut chunks = bytes.chunks_exact(8);
    for chunk in &mut chunks {
        let mut lane = [0u8; 8];
        lane.copy_from_slice(chunk);
        h.push_u64(u64::from_le_bytes(lane));
    }

    let remainder = chunks.remainder();
    if !remainder.is_empty() {
        let mut tail = [0u8; 8];
        tail[..remainder.len()].copy_from_slice(remainder);
        h.push_u64(u64::from_le_bytes(tail));
    }

    h.finish()
}

fn hash_number(number: &Number) -> Hash128 {
    // Hash based on f64 bit pattern for consistency within each parse path.
    // Note: serde_json::from_str and serde_wasm_bindgen may disagree by 1 ULP
    // for edge-case floats like "53.550399999999996". This is expected — the
    // two APIs (contentHash vs contentHashJson) are not guaranteed to agree for
    // such values. Within each API, the hash is deterministic and stable.
    if let Some(f) = number.as_f64() {
        let mut h = Hash128::seeded(TOK_NUM);
        h.push_u64(f.to_bits());
        h.finish()
    } else {
        // Fallback for arbitrary_precision or unusual cases
        hash_bytes(TOK_NUM, number.to_string().as_bytes())
    }
}

fn hash_string(value: &str) -> Hash128 {
    hash_bytes(TOK_STR, value.as_bytes())
}

fn hash_key(key: &str) -> Hash128 {
    hash_bytes(TOK_KEY, key.as_bytes())
}

/// Parse JSON directly from a `&str` — avoids serde_wasm_bindgen overhead.
fn parse_json_str(json: &str) -> Result<Value, JsValue> {
    serde_json::from_str(json)
        .map_err(|err| js_error(format!("invalid JSON: {err}")))
}

/// Parse JSON directly from bytes — avoids serde_wasm_bindgen overhead.
fn parse_json_bytes(bytes: &[u8]) -> Result<Value, JsValue> {
    serde_json::from_slice(bytes)
        .map_err(|err| js_error(format!("invalid JSON: {err}")))
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum ExactToken {
    Key(Box<str>),
    Index(usize),
}

#[derive(Debug, Clone)]
enum PathToken {
    Exact(ExactToken),
    Wild,
}

#[derive(Debug, Default, Clone)]
struct SkipNode {
    exact: Vec<(ExactToken, usize)>,
    wild: Option<usize>,
    terminal: bool,
}

#[derive(Debug, Default, Clone)]
struct SkipMatcher {
    nodes: Vec<SkipNode>,
}

enum SegmentRef<'a> {
    Key(&'a str),
    Index(usize),
}

impl SkipMatcher {
    fn new(paths: &[String]) -> Result<Self, String> {
        let mut matcher = Self {
            nodes: vec![SkipNode::default()],
        };

        for path in paths {
            matcher.insert(parse_path(path)?);
        }

        Ok(matcher)
    }

    fn insert(&mut self, tokens: Vec<PathToken>) {
        let mut cursor = 0usize;

        for token in tokens {
            cursor = match token {
                PathToken::Exact(token) => self.exact_child(cursor, token),
                PathToken::Wild => self.wild_child(cursor),
            };
        }

        self.nodes[cursor].terminal = true;
    }

    fn exact_child(&mut self, at: usize, token: ExactToken) -> usize {
        if let Some(position) = self.nodes[at]
            .exact
            .iter()
            .position(|(candidate, _)| *candidate == token)
        {
            return self.nodes[at].exact[position].1;
        }

        let next = self.nodes.len();
        self.nodes.push(SkipNode::default());
        self.nodes[at].exact.push((token, next));
        next
    }

    fn wild_child(&mut self, at: usize) -> usize {
        if let Some(next) = self.nodes[at].wild {
            return next;
        }

        let next = self.nodes.len();
        self.nodes.push(SkipNode::default());
        self.nodes[at].wild = Some(next);
        next
    }

    /// Advance matcher states by one segment, writing into `out` buffer.
    /// Returns `true` if any reached state is terminal (= skip this subtree).
    /// Callers should clear `out` before calling.
    fn advance_into(&self, states: &[usize], segment: SegmentRef<'_>, out: &mut Vec<usize>) -> bool {
        if states.is_empty() {
            return false;
        }

        let mut skip = false;

        for state in states {
            let node = &self.nodes[*state];

            for (token, child) in &node.exact {
                let matched = match (token, &segment) {
                    (ExactToken::Key(expected), SegmentRef::Key(actual)) => expected.as_ref() == *actual,
                    (ExactToken::Index(expected), SegmentRef::Index(actual)) => *expected == *actual,
                    _ => false,
                };

                if matched {
                    if !out.contains(child) {
                        out.push(*child);
                    }
                    if self.nodes[*child].terminal {
                        skip = true;
                    }
                }
            }

            if let Some(child) = node.wild {
                if !out.contains(&child) {
                    out.push(child);
                }
                if self.nodes[child].terminal {
                    skip = true;
                }
            }
        }

        skip
    }
}

fn parse_path(path: &str) -> Result<Vec<PathToken>, String> {
    if path.is_empty() {
        return Err("skip path must not be empty".to_string());
    }

    let bytes = path.as_bytes();
    let mut out = Vec::new();
    let mut i = 0usize;
    let mut seg_start = 0usize;

    while i < bytes.len() {
        match bytes[i] {
            b'.' => {
                if seg_start == i {
                    return Err(format!("invalid skip path segment in '{path}'"));
                }
                push_segment(&mut out, &path[seg_start..i])?;
                i += 1;
                seg_start = i;
            }
            b'[' => {
                if seg_start < i {
                    push_segment(&mut out, &path[seg_start..i])?;
                }

                let mut end = i + 1;
                while end < bytes.len() && bytes[end] != b']' {
                    end += 1;
                }
                if end >= bytes.len() {
                    return Err(format!("unterminated array segment in '{path}'"));
                }

                let inner = &path[i + 1..end];
                if inner == "*" {
                    out.push(PathToken::Wild);
                } else {
                    let index = inner
                        .parse::<usize>()
                        .map_err(|_| format!("invalid array index '{inner}' in '{path}'"))?;
                    out.push(PathToken::Exact(ExactToken::Index(index)));
                }

                i = end + 1;
                if i < bytes.len() && bytes[i] == b'.' {
                    i += 1;
                }
                seg_start = i;
            }
            _ => {
                i += 1;
            }
        }
    }

    if seg_start < bytes.len() {
        push_segment(&mut out, &path[seg_start..])?;
    }

    Ok(out)
}

fn push_segment(out: &mut Vec<PathToken>, segment: &str) -> Result<(), String> {
    if segment.is_empty() {
        return Err("empty skip path segment".to_string());
    }

    if segment == "*" {
        out.push(PathToken::Wild);
    } else {
        out.push(PathToken::Exact(ExactToken::Key(segment.into())));
    }

    Ok(())
}

fn js_error(message: impl Into<String>) -> JsValue {
    JsValue::from_str(&message.into())
}

fn parse_skip_paths(skip_paths: JsValue) -> Result<Vec<String>, JsValue> {
    if skip_paths.is_undefined() || skip_paths.is_null() {
        return Ok(Vec::new());
    }

    serde_wasm_bindgen::from_value(skip_paths)
        .map_err(|err| js_error(format!("failed to deserialize skip paths: {err}")))
}

fn parse_value(value: JsValue) -> Result<Value, JsValue> {
    serde_wasm_bindgen::from_value(value)
        .map_err(|err| js_error(format!("failed to deserialize value as JSON: {err}")))
}

fn hash_value(value: &Value, matcher: &SkipMatcher, states: &[usize]) -> Hash128 {
    match value {
        Value::Null => Hash128::seeded(TOK_NULL).finish(),
        Value::Bool(true) => Hash128::seeded(TOK_TRUE).finish(),
        Value::Bool(false) => Hash128::seeded(TOK_FALSE).finish(),
        Value::Number(number) => hash_number(number),
        Value::String(text) => hash_string(text),
        Value::Array(items) => hash_array(items, matcher, states),
        Value::Object(map) => hash_object(map, matcher, states),
    }
}

fn hash_array(items: &[Value], matcher: &SkipMatcher, states: &[usize]) -> Hash128 {
    let mut h = Hash128::seeded(TOK_ARR);
    let mut count = 0usize;
    let mut next_buf = Vec::new();

    for (index, item) in items.iter().enumerate() {
        next_buf.clear();
        let skip = matcher.advance_into(states, SegmentRef::Index(index), &mut next_buf);
        if skip {
            continue;
        }

        h.push_u64(index as u64);
        h.push_hash(hash_value(item, matcher, &next_buf));
        count += 1;
    }

    h.push_u64(TOK_CNT ^ count as u64);
    h.finish()
}

fn hash_object(map: &Map<String, Value>, matcher: &SkipMatcher, states: &[usize]) -> Hash128 {
    let mut h = Hash128::seeded(TOK_OBJ);
    let mut keys: Vec<&String> = map.keys().collect();
    keys.sort();

    let mut count = 0usize;
    let mut next_buf = Vec::new();
    for key in keys {
        next_buf.clear();
        let skip = matcher.advance_into(states, SegmentRef::Key(key), &mut next_buf);
        if skip {
            continue;
        }

        let value = map.get(key).expect("key collected from same map");
        h.push_hash(hash_key(key));
        h.push_hash(hash_value(value, matcher, &next_buf));
        count += 1;
    }

    h.push_u64(TOK_CNT ^ count as u64);
    h.finish()
}

#[wasm_bindgen]
pub struct ContentHasher {
    matcher: SkipMatcher,
}

#[wasm_bindgen]
impl ContentHasher {
    #[wasm_bindgen(constructor)]
    pub fn new(skip_paths: JsValue) -> Result<ContentHasher, JsValue> {
        let paths = parse_skip_paths(skip_paths)?;
        let matcher = SkipMatcher::new(&paths).map_err(js_error)?;
        Ok(Self { matcher })
    }

    /// Hash a JsValue (convenience path — pays serde_wasm_bindgen cost).
    pub fn hash(&self, value: JsValue) -> Result<String, JsValue> {
        let value = parse_value(value)?;
        Ok(self.hash_parsed(&value))
    }

    /// Hash a JSON string directly — fast path, avoids JS→WASM object graph clone.
    pub fn hash_json_str(&self, json: &str) -> Result<String, JsValue> {
        let value = parse_json_str(json)?;
        Ok(self.hash_parsed(&value))
    }

    /// Hash raw JSON bytes — fast path from Uint8Array.
    pub fn hash_json_bytes(&self, bytes: &[u8]) -> Result<String, JsValue> {
        let value = parse_json_bytes(bytes)?;
        Ok(self.hash_parsed(&value))
    }
}

impl ContentHasher {
    fn hash_parsed(&self, value: &Value) -> String {
        let states = if self.matcher.nodes.len() > 1 {
            vec![0usize]
        } else {
            Vec::new()
        };

        hash_value(value, &self.matcher, &states).to_hex()
    }
}

pub fn content_hash(value: JsValue, skip_paths: JsValue) -> Result<String, JsValue> {
    let hasher = ContentHasher::new(skip_paths)?;
    hasher.hash(value)
}

/// Standalone fast path: hash a JSON string with skip paths.
#[wasm_bindgen]
pub fn content_hash_json_str(json: &str, skip_paths: JsValue) -> Result<String, JsValue> {
    let hasher = ContentHasher::new(skip_paths)?;
    hasher.hash_json_str(json)
}

/// Standalone fast path: hash JSON bytes with skip paths.
#[wasm_bindgen]
pub fn content_hash_json_bytes(bytes: &[u8], skip_paths: JsValue) -> Result<String, JsValue> {
    let hasher = ContentHasher::new(skip_paths)?;
    hasher.hash_json_bytes(bytes)
}
