use wasm_bindgen::prelude::*;
use rayon::prelude::*;
use std::sync::Mutex;
use byteorder::{LittleEndian, ReadBytesExt};
use ndarray::{Array1, Array2};
use std::{
    fs::File,
    io::{Read, Seek, SeekFrom},
    path::Path,
};
use thiserror::Error;

/// The 16 languages supported by the custom model.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Language {
    Arabic,
    Danish,
    Dutch,
    English,
    Finnish,
    French,
    German,
    Hungarian,
    Italian,
    Norwegian,
    Portuguese,
    Romanian,
    Russian,
    Spanish,
    Swedish,
    Turkish,
}

impl Language {
    /// fastText label string used in the model.
    pub const fn label(self) -> &'static str {
        match self {
            Language::Arabic => "arb_Arab",
            Language::Danish => "dan_Latn",
            Language::Dutch => "nld_Latn",
            Language::English => "eng_Latn",
            Language::Finnish => "fin_Latn",
            Language::French => "fra_Latn",
            Language::German => "deu_Latn",
            Language::Hungarian => "hun_Latn",
            Language::Italian => "ita_Latn",
            Language::Norwegian => "nob_Latn",
            Language::Portuguese => "por_Latn",
            Language::Romanian => "ron_Latn",
            Language::Russian => "rus_Cyrl",
            Language::Spanish => "spa_Latn",
            Language::Swedish => "swe_Latn",
            Language::Turkish => "tur_Latn",
        }
    }
}

impl TryFrom<&str> for Language {
    type Error = ();
    fn try_from(s: &str) -> Result<Self, Self::Error> {
        Ok(match s {
            "arb_Arab" => Language::Arabic,
            "dan_Latn" => Language::Danish,
            "nld_Latn" => Language::Dutch,
            "eng_Latn" => Language::English,
            "fin_Latn" => Language::Finnish,
            "fra_Latn" => Language::French,
            "deu_Latn" => Language::German,
            "hun_Latn" => Language::Hungarian,
            "ita_Latn" => Language::Italian,
            "nob_Latn" => Language::Norwegian,
            "por_Latn" => Language::Portuguese,
            "ron_Latn" => Language::Romanian,
            "rus_Cyrl" => Language::Russian,
            "spa_Latn" => Language::Spanish,
            "swe_Latn" => Language::Swedish,
            "tur_Latn" => Language::Turkish,
            _ => return Err(()),
        })
    }
}

const FASTTEXT_MAGIC: u32 = 0x12FD21E5;
const FASTTEXT_VERSION: u32 = 12; // format version written by fastText ≥0.9

/// Errors that can occur while loading or using the model.
#[derive(Error, Debug)]
pub enum LidError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("not a fastText model or wrong version (magic/version)")]
    BadHeader,

    #[error("unsupported quantisation layout")]
    Unsupported,

    #[error("model expects dim to be divisible by nsub")]
    BadDims,

    #[error("prediction requested for empty input string")]
    EmptyInput,
}

/// fastText training args block (only the fields we need).
#[derive(Debug, Clone)]
struct Args {
    dim: u32,
    bucket: u32,
    minn: u32,
    maxn: u32,
    nwords: u32,
}

/// Quantised matrix as stored in `.ftz`.
#[derive(Clone)]
struct QMatrix {
    qnorm: bool,
    rows: u32,
    dim: u32,
    nsub: u32,
    dsub: u32,
    // codes length = rows * nsub
    codes: Vec<u8>,
    // centroids length = nsub * 256 * dsub
    centroids: Vec<f32>,
    // Optional norm product quantiser
    norm_codes: Option<Vec<u8>>,      // rows
    norm_centroids: Option<Vec<f32>>, // 256
}

impl QMatrix {
    /// De‑quantise a single row into the provided slice.
    fn row_into(&self, row: u32, out: &mut [f32]) {
        let row = row as usize;
        out.fill(0.0);
        for s in 0..self.nsub as usize {
            let code = self.codes[row * self.nsub as usize + s] as usize;
            let cent_start = (s * 256 + code) * self.dsub as usize;
            let dst_start = s * self.dsub as usize;
            out[dst_start..dst_start + self.dsub as usize]
                .copy_from_slice(&self.centroids[cent_start..cent_start + self.dsub as usize]);
        }
        if self.qnorm {
            let norm_code = self
                .norm_codes
                .as_ref()
                .expect("qnorm codes")
                [row] as usize;
            let norm = self.norm_centroids.as_ref().unwrap()[norm_code];
            out.iter_mut().for_each(|v| *v *= norm);
        }
    }
}

/// Entire supervised model (only what we need for inference).
pub struct Model {
    args: Args,
    labels: Vec<String>,    // output labels, len = n_labels
    qinput: QMatrix,        // word/subword embeddings
    w_out: Array2<f32>,     // *de‑quantised* classifier weight matrix (n_labels × dim)
}

impl Model {
    /// Load a **quantised** fastText model (`*.ftz`). Works with models created by
    /// `fasttext quantize -qnorm -retrain`.
    pub fn load<P: AsRef<Path>>(path: P) -> Result<Self, LidError> {
        let mut f = File::open(path)?;

        // ------ 1. Header checks ------
        if f.read_u32::<LittleEndian>()? != FASTTEXT_MAGIC {
            return Err(LidError::BadHeader);
        }
        if f.read_u32::<LittleEndian>()? != FASTTEXT_VERSION {
            return Err(LidError::BadHeader);
        }

        // ------ 2. Args block ------
        let dim = f.read_u32::<LittleEndian>()?; // dim
        let _ws = f.read_u32::<LittleEndian>()?; // window size (unused)
        let _epoch = f.read_u32::<LittleEndian>()?;
        let _min_count = f.read_u32::<LittleEndian>()?;
        let _neg = f.read_u32::<LittleEndian>()?;
        let word_ngrams = f.read_u32::<LittleEndian>()?; // 1 for supervised
        let loss = f.read_u32::<LittleEndian>()?;        // 2 = softmax
        let _model = f.read_u32::<LittleEndian>()?;
        let bucket = f.read_u32::<LittleEndian>()?;
        let minn = f.read_u32::<LittleEndian>()?;
        let maxn = f.read_u32::<LittleEndian>()?;
        let _lr_update_rate = f.read_u32::<LittleEndian>()?;
        let _t = f.read_f64::<LittleEndian>()?;

        let args = Args {
            dim,
            bucket,
            minn,
            maxn,
            nwords: 0, // temp, will set later
        };

        // ------ 3. Dictionary ------
        // The dictionary is stored as:
        // [nwords u32] [nlabels u32] [ntokens u64] then nwords entries and nlabels entries.
        let nwords = f.read_u32::<LittleEndian>()?;
        let nlabels = f.read_u32::<LittleEndian>()?;
        let _ntokens = f.read_u64::<LittleEndian>()?;

        // skip nwords word entries (we don't need them)
        for _ in 0..nwords {
            Model::skip_dictionary_entry(&mut f)?;
        }
        // read label entries to get label strings
        let mut labels = Vec::with_capacity(nlabels as usize);
        for _ in 0..nlabels {
            labels.push(Model::read_dictionary_entry(&mut f)?);
        }

        // ------ 4. Read input QMatrix ------
        let qinput = Model::read_qmatrix(&mut f)?;

        // ------ 5. Read output QMatrix, de‑quantise all rows ------
        let qout = Model::read_qmatrix(&mut f)?;
        if qout.dim != dim {
            return Err(LidError::Unsupported);
        }
        let mut w_out = Array2::<f32>::zeros((nlabels as usize, dim as usize));
        let mut buf = vec![0f32; dim as usize];
        for row in 0..nlabels {
            qout.row_into(row, &mut buf);
            let mut slice = w_out.row_mut(row as usize);
            slice.as_slice_mut().unwrap().copy_from_slice(&buf);
        }

        Ok(Model {
            args: Args { nwords, ..args },
            labels,
            qinput,
            w_out,
        })
    }

    /// Predict top‑1 label and probability for a sentence.
    pub fn predict<'a>(&'a self, sentence: &str) -> Result<(&'a str, f32), LidError> {
        if sentence.trim().is_empty() {
            return Err(LidError::EmptyInput);
        }
        let v = self.sentence_vector(sentence);
        // scores = W_out · v
        let scores = self.w_out.dot(&v);
        let (idx, score) = scores
            .iter()
            .enumerate()
            .fold((0usize, f32::NEG_INFINITY), |acc, (i, s)| {
                if *s > acc.1 { (i, *s) } else { acc }
            });
        // softmax prob for single winner
        let prob = 1.0 / scores.mapv(|x| (x - scores[idx]).exp()).sum();
        Ok((&self.labels[idx], prob))
    }

    // ---- helpers ----

    fn sentence_vector(&self, sentence: &str) -> Array1<f32> {
        let mut v = Array1::<f32>::zeros(self.args.dim as usize);
        let mut cnt = 0f32;
        let mut buf = vec![0f32; self.args.dim as usize];
        for token in sentence.split_whitespace() {
            let word = format!("<{token}>");
            let bytes = word.as_bytes();
            let len = bytes.len() as u32;
            for n in self.args.minn..=self.args.maxn.min(len) {
                for i in 0..=len - n {
                    let ngram = &bytes[i as usize..(i + n) as usize];
                    let h = hash_ngram(ngram) % self.args.bucket;
                    let idx = self.args.nwords + h + 1; // +1 for OOV bucket 0
                    self.qinput.row_into(idx, &mut buf);
                    v += &Array1::from_vec(buf.clone());
                    cnt += 1.0;
                }
            }
        }
        if cnt > 0.0 { v.mapv_inplace(|x| x / cnt); }
        v
    }

    fn skip_dictionary_entry<R: Read>(r: &mut R) -> Result<(), LidError> {
        let len = r.read_u32::<LittleEndian>()? as usize;
        let mut dummy = vec![0u8; len];
        r.read_exact(&mut dummy)?; // word
        r.read_u64::<LittleEndian>()?; // count
        Ok(())
    }

    fn read_dictionary_entry<R: Read>(r: &mut R) -> Result<String, LidError> {
        let len = r.read_u32::<LittleEndian>()? as usize;
        let mut bytes = vec![0u8; len];
        r.read_exact(&mut bytes)?;
        // skip count
        r.read_u64::<LittleEndian>()?;
        Ok(String::from_utf8_lossy(&bytes).into_owned())
    }

    fn read_qmatrix<R: Read + Seek>(r: &mut R) -> Result<QMatrix, LidError> {
        let qnorm = r.read_u8()? != 0;
        let rows = r.read_u32::<LittleEndian>()?;
        let dim = r.read_u32::<LittleEndian>()?;
        let nsub = r.read_u32::<LittleEndian>()?;
        let dsub = dim / nsub;
        if dim % nsub != 0 { return Err(LidError::BadDims); }
        let mut codes = vec![0u8; (rows * nsub) as usize];
        r.read_exact(&mut codes)?;
        let mut centroids = vec![0f32; (nsub * 256 * dsub) as usize];
        r.read_f32_into::<LittleEndian>(&mut centroids)?;
        let (norm_codes, norm_centroids) = if qnorm {
            let mut nc = vec![0u8; rows as usize];
            r.read_exact(&mut nc)?;
            let mut ncent = vec![0f32; 256];
            r.read_f32_into::<LittleEndian>(&mut ncent)?;
            (Some(nc), Some(ncent))
        } else {
            (None, None)
        };
        Ok(QMatrix { qnorm, rows, dim, nsub, dsub, codes, centroids, norm_codes, norm_centroids })
    }
}

// ===== standalone helper functions =====

/// fastText FNV‑1a hash (32‑bit, little‑endian)
pub fn hash_ngram(bytes: &[u8]) -> u32 {
    const FNV_OFFSET: u32 = 2166136261;
    const FNV_PRIME: u32 = 16777619;
    let mut h = FNV_OFFSET;
    for &b in bytes {
        h ^= b as u32;
        h = h.wrapping_mul(FNV_PRIME);
    }
    h
}