type PWConfig = {
  fMin: number;
  fMax: number;
  hopMs: number;
  analysisWinMs: number;
  adaptive: boolean;
  adaptPeriods: number;
  minWinMs: number;
  maxWinMs: number;
  yinThreshold: number;
  octaveGuardEpsilon: number;
};

type PWState = {
  sr: number;
  cfg: PWConfig;

  ring: Float32Array;
  ringWrite: number;
  ringFilled: boolean;

  window: Float32Array;
  hann: Float32Array;
  hannLen: number;

  tauMin: number;
  tauMax: number;
  cmndf: Float32Array;
  nsdf: Float32Array;

  s0: Float32Array;
  s1: Float32Array;
  r01: Float32Array;

  lastFreq: number;
  effWinLen: number;
  hopLen: number;
};

const clamp = (x: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, x));

const makeHann = (N: number) => {
  const w = new Float32Array(N);
  const f = (Math.PI * 2) / (N - 1);
  for (let i = 0; i < N; i++) w[i] = 0.5 * (1 - Math.cos(f * i));
  return w;
};

const initState = (sr: number, cfg: PWConfig): PWState => {
  const tauMin = Math.max(1, Math.floor(sr / cfg.fMax));
  const tauMax = Math.floor(sr / cfg.fMin);

  const maxWinLen = Math.round((cfg.maxWinMs / 1000) * sr);
  const ring = new Float32Array(maxWinLen * 2);
  const window = new Float32Array(maxWinLen);
  const hann = makeHann(Math.round((cfg.analysisWinMs / 1000) * sr));
  const hopLen = Math.round((cfg.hopMs / 1000) * sr);

  const cmndf = new Float32Array(tauMax + 1);
  const nsdf = new Float32Array(tauMax + 1);
  const s0 = new Float32Array(tauMax + 1);
  const s1 = new Float32Array(tauMax + 1);
  const r01 = new Float32Array(tauMax + 1);

  const st: PWState = {
    sr,
    cfg,
    ring,
    ringWrite: 0,
    ringFilled: false,
    window,
    hann,
    hannLen: hann.length,
    tauMin,
    tauMax,
    cmndf,
    nsdf,
    s0,
    s1,
    r01,
    lastFreq: 1500,
    effWinLen: Math.round((cfg.analysisWinMs / 1000) * sr),
    hopLen,
  };

  st.effWinLen = computeEffWinLen(st, st.lastFreq);
  if (st.hannLen !== st.effWinLen) {
    st.hann = makeHann(st.effWinLen);
    st.hannLen = st.effWinLen;
  }
  return st;
};

const computeEffWinLen = (st: PWState, fEst: number) => {
  const { adaptive, adaptPeriods, minWinMs, maxWinMs } = st.cfg;
  const sr = st.sr;
  let winMs = st.cfg.analysisWinMs;
  if (adaptive) {
    const periods = Math.max(4, adaptPeriods);
    const perMs = (periods * 1000) / Math.max(1, fEst);
    winMs = clamp(perMs, minWinMs, maxWinMs);
  }
  const minSamples = st.tauMax + 8;
  return Math.max(minSamples, Math.round((winMs / 1000) * sr));
};

const ringPush = (st: PWState, frame: Float32Array) => {
  const n = frame.length;
  const m = st.ring.length;
  const w = st.ringWrite;
  if (n >= m) {
    st.ring.set(frame.subarray(n - m));
    st.ringWrite = 0;
    st.ringFilled = true;
    return;
  }
  const end = w + n;
  if (end <= m) {
    st.ring.set(frame, w);
    st.ringWrite = end % m;
  } else {
    const first = m - w;
    st.ring.set(frame.subarray(0, first), w);
    st.ring.set(frame.subarray(first), 0);
    st.ringWrite = end % m;
    st.ringFilled = true;
  }
};

const ringLatest = (st: PWState, out: Float32Array, L: number) => {
  const m = st.ring.length;
  const end = st.ringWrite;
  const haveAll = st.ringFilled || end >= L;
  if (!haveAll) {
    out.set(st.ring.subarray(0, end), 0);
    if (end < L) out.fill(0, end, L);
    return;
  }
  const start = ((st.ringFilled ? end : Math.max(0, end)) - L + m) % m;
  const first = Math.min(L, m - start);
  out.set(st.ring.subarray(start, start + first), 0);
  if (first < L) out.set(st.ring.subarray(0, L - first), first);
};

const applyHannInPlace = (x: Float32Array, w: Float32Array, L: number) => {
  for (let i = 0; i < L; i++) x[i] *= w[i];
};

const accumulateSumsUnrolled16 = (
  x: Float32Array,
  L: number,
  _tauMin: number,
  tauMax: number,
  s0: Float32Array,
  s1: Float32Array,
  r01: Float32Array,
) => {
  for (let tau = 1; tau <= tauMax; tau++) {
    let sum0 = 0;
    let sum1 = 0;
    let r = 0;
    const M = L - tau;
    if (M <= 0) {
      s0[tau] = 0;
      s1[tau] = 0;
      r01[tau] = 0;
      continue;
    }
    let i = 0;
    const MM = M - (M % 16);
    for (; i < MM; i += 16) {
      let a0 = x[i];
      let a1 = x[i + tau];
      sum0 += a0 * a0;
      sum1 += a1 * a1;
      r += a0 * a1;
      a0 = x[i + 1];
      a1 = x[i + 1 + tau];
      sum0 += a0 * a0;
      sum1 += a1 * a1;
      r += a0 * a1;
      a0 = x[i + 2];
      a1 = x[i + 2 + tau];
      sum0 += a0 * a0;
      sum1 += a1 * a1;
      r += a0 * a1;
      a0 = x[i + 3];
      a1 = x[i + 3 + tau];
      sum0 += a0 * a0;
      sum1 += a1 * a1;
      r += a0 * a1;
      a0 = x[i + 4];
      a1 = x[i + 4 + tau];
      sum0 += a0 * a0;
      sum1 += a1 * a1;
      r += a0 * a1;
      a0 = x[i + 5];
      a1 = x[i + 5 + tau];
      sum0 += a0 * a0;
      sum1 += a1 * a1;
      r += a0 * a1;
      a0 = x[i + 6];
      a1 = x[i + 6 + tau];
      sum0 += a0 * a0;
      sum1 += a1 * a1;
      r += a0 * a1;
      a0 = x[i + 7];
      a1 = x[i + 7 + tau];
      sum0 += a0 * a0;
      sum1 += a1 * a1;
      r += a0 * a1;
      a0 = x[i + 8];
      a1 = x[i + 8 + tau];
      sum0 += a0 * a0;
      sum1 += a1 * a1;
      r += a0 * a1;
      a0 = x[i + 9];
      a1 = x[i + 9 + tau];
      sum0 += a0 * a0;
      sum1 += a1 * a1;
      r += a0 * a1;
      a0 = x[i + 10];
      a1 = x[i + 10 + tau];
      sum0 += a0 * a0;
      sum1 += a1 * a1;
      r += a0 * a1;
      a0 = x[i + 11];
      a1 = x[i + 11 + tau];
      sum0 += a0 * a0;
      sum1 += a1 * a1;
      r += a0 * a1;
      a0 = x[i + 12];
      a1 = x[i + 12 + tau];
      sum0 += a0 * a0;
      sum1 += a1 * a1;
      r += a0 * a1;
      a0 = x[i + 13];
      a1 = x[i + 13 + tau];
      sum0 += a0 * a0;
      sum1 += a1 * a1;
      r += a0 * a1;
      a0 = x[i + 14];
      a1 = x[i + 14 + tau];
      sum0 += a0 * a0;
      sum1 += a1 * a1;
      r += a0 * a1;
      a0 = x[i + 15];
      a1 = x[i + 15 + tau];
      sum0 += a0 * a0;
      sum1 += a1 * a1;
      r += a0 * a1;
    }
    for (; i < M; i++) {
      const a0 = x[i];
      const a1 = x[i + tau];
      sum0 += a0 * a0;
      sum1 += a1 * a1;
      r += a0 * a1;
    }
    s0[tau] = sum0;
    s1[tau] = sum1;
    r01[tau] = r;
  }
};

const computeYinWithNsdf = (
  x: Float32Array,
  L: number,
  tauMin: number,
  tauMax: number,
  cmndf: Float32Array,
  nsdf: Float32Array,
  s0: Float32Array,
  s1: Float32Array,
  r01: Float32Array,
  yinThreshold: number,
) => {
  accumulateSumsUnrolled16(x, L, tauMin, tauMax, s0, s1, r01);

  cmndf[0] = 1;
  nsdf[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    const S0 = s0[tau];
    const S1 = s1[tau];
    const R = r01[tau];
    const dTau = S0 + S1 - 2 * R;
    running += dTau;
    cmndf[tau] = (dTau * tau) / (running || 1e-20);
    const denom = S0 + S1;
    nsdf[tau] = denom > 0 ? (2 * R) / denom : 0;
  }

  let tauSel = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if (cmndf[t] < yinThreshold) {
      let t2 = t;
      while (t2 + 1 <= tauMax && cmndf[t2 + 1] < cmndf[t2]) t2++;
      tauSel = t2;
      break;
    }
  }
  if (tauSel === -1) {
    tauSel = tauMin;
    for (let t = tauMin + 1; t <= tauMax; t++)
      if (cmndf[t] < cmndf[tauSel]) tauSel = t;
  }

  const t0 = Math.max(1, tauSel - 1);
  const t2 = Math.min(tauMax, tauSel + 1);
  const sA = cmndf[t0];
  const sB = cmndf[tauSel];
  const sC = cmndf[t2];
  let tauInterp = tauSel;
  const denom = sA + sC - 2 * sB;
  if (denom !== 0) tauInterp = tauSel + (0.5 * (sA - sC)) / denom;

  return { tauSel, tauInterp };
};

const octaveGuard = (
  tau: number,
  tauMin: number,
  tauMax: number,
  cmndf: Float32Array,
  nsdf: Float32Array,
  eps: number,
) => {
  let bestTau = tau;
  const baselineNsdf = nsdf[Math.round(tau)] || 0;
  const baselineCmn = cmndf[Math.round(tau)] || 1;

  const tryCandidate = (cand: number) => {
    const tc = Math.round(cand);
    if (tc < tauMin || tc > tauMax) return;
    const n = nsdf[tc] || 0;
    const c = cmndf[tc] || 1;
    if (n > baselineNsdf * (1 + eps) && c <= baselineCmn + eps) bestTau = tc;
  };

  tryCandidate(tau * 0.5);
  tryCandidate(tau * 2.0);

  return bestTau;
};

const rmsDbUnrolled16 = (x: Float32Array, L: number) => {
  let s = 0;
  let i = 0;
  const LL = L - (L % 16);
  for (; i < LL; i += 16) {
    s +=
      x[i] * x[i] +
      x[i + 1] * x[i + 1] +
      x[i + 2] * x[i + 2] +
      x[i + 3] * x[i + 3] +
      x[i + 4] * x[i + 4] +
      x[i + 5] * x[i + 5] +
      x[i + 6] * x[i + 6] +
      x[i + 7] * x[i + 7] +
      x[i + 8] * x[i + 8] +
      x[i + 9] * x[i + 9] +
      x[i + 10] * x[i + 10] +
      x[i + 11] * x[i + 11] +
      x[i + 12] * x[i + 12] +
      x[i + 13] * x[i + 13] +
      x[i + 14] * x[i + 14] +
      x[i + 15] * x[i + 15];
  }
  for (; i < L; i++) s += x[i] * x[i];
  const rms = Math.sqrt(s / L);
  return 20 * Math.log10(rms + 1e-12);
};

const snrFromNsdf = (nsdf: number) => {
  const n = clamp(nsdf, 1e-6, 0.999999);
  const lin = n / (1 - n);
  return 10 * Math.log10(lin);
};

const analyzeFrame = (st: PWState) => {
  const effLen = computeEffWinLen(st, st.lastFreq);
  st.effWinLen = effLen;
  if (st.hannLen !== effLen) {
    st.hann = makeHann(effLen);
    st.hannLen = effLen;
  }

  ringLatest(st, st.window, effLen);
  applyHannInPlace(st.window, st.hann, effLen);

  const db = rmsDbUnrolled16(st.window, effLen);

  let freq = 0;
  let quality = 0;
  let nsdfPeak = 0;
  if (db > -70) {
    const sel = computeYinWithNsdf(
      st.window,
      effLen,
      st.tauMin,
      st.tauMax,
      st.cmndf,
      st.nsdf,
      st.s0,
      st.s1,
      st.r01,
      st.cfg.yinThreshold,
    );

    const tauOG = octaveGuard(
      sel.tauInterp,
      st.tauMin,
      st.tauMax,
      st.cmndf,
      st.nsdf,
      st.cfg.octaveGuardEpsilon,
    );

    const tg = Math.round(tauOG);
    const t0 = Math.max(1, tg - 1);
    const t2 = Math.min(st.tauMax, tg + 1);
    const sA = st.cmndf[t0];
    const sB = st.cmndf[tg];
    const sC = st.cmndf[t2];
    let tauBetter = tg;
    const denom = sA + sC - 2 * sB;
    if (denom !== 0) tauBetter = tg + (0.5 * (sA - sC)) / denom;

    const f = st.sr / tauBetter;
    if (Number.isFinite(f) && f > 0) {
      freq = f;
      quality = 1 - (st.cmndf[tg] || 1);
      nsdfPeak = st.nsdf[tg] || 0;
    }
  }

  if (freq > 0) st.lastFreq = 0.7 * st.lastFreq + 0.3 * freq;

  const snrDb = snrFromNsdf(nsdfPeak);
  return {
    db,
    freq,
    quality,
    nsdf: nsdfPeak,
    snrDb,
    effWinMs: (effLen / st.sr) * 1000,
  };
};

class PitchDetectorProcessor extends AudioWorkletProcessor {
  private st: PWState;
  private acc = 0;

  // Debug state
  private frames = 0;
  private posts = 0;
  private lastStatTime = 0;

  constructor() {
    super();
    const def: PWConfig = {
      fMin: 600,
      fMax: 6000,
      hopMs: 20,
      analysisWinMs: 40,
      adaptive: true,
      adaptPeriods: 8,
      minWinMs: 24,
      maxWinMs: 60,
      yinThreshold: 0.1,
      octaveGuardEpsilon: 0.05,
    };
    this.st = initState(sampleRate, def);
    this.port.onmessage = (e) => {
      const m = e.data;
      if (m?.type === "config") {
        const cfg: PWConfig = {
          fMin: m.fMin ?? this.st.cfg.fMin,
          fMax: m.fMax ?? this.st.cfg.fMax,
          hopMs: m.hopMs ?? this.st.cfg.hopMs,
          analysisWinMs: m.analysisWinMs ?? this.st.cfg.analysisWinMs,
          adaptive: m.adaptive ?? this.st.cfg.adaptive,
          adaptPeriods: m.adaptPeriods ?? this.st.cfg.adaptPeriods,
          minWinMs: m.minWinMs ?? this.st.cfg.minWinMs,
          maxWinMs: m.maxWinMs ?? this.st.cfg.maxWinMs,
          yinThreshold: m.yinThreshold ?? this.st.cfg.yinThreshold,
          octaveGuardEpsilon:
            m.octaveGuardEpsilon ?? this.st.cfg.octaveGuardEpsilon,
        };
        this.st = initState(sampleRate, cfg);
        this.lastStatTime = 0;
      }
    };
    // Signal that the worklet is alive
    this.port.postMessage({ type: "ready", sr: sampleRate });
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]) {
    const ch0 = inputs[0]?.[0];
    const out0 = outputs[0]?.[0];
    if (out0) {
      // pass-through (keeps node in the render graph)
      if (ch0 && ch0.length === out0.length) {
        out0.set(ch0);
      } else {
        out0.fill(0);
      }
    }

    if (!ch0) {
      this.maybePostStats(true /*silence*/);
      return true;
    }

    this.frames++;
    ringPush(this.st, ch0);
    this.acc += ch0.length;

    while (
      this.acc >= this.st.hopLen &&
      (this.st.ringFilled || this.st.ringWrite >= this.st.effWinLen)
    ) {
      this.acc -= this.st.hopLen;
      const { db, freq, quality, nsdf, snrDb, effWinMs } = analyzeFrame(
        this.st,
      );
      const tMs = currentTime * 1000;
      this.port.postMessage({ tMs, db, freq, quality, nsdf, snrDb, effWinMs });
      this.posts++;
    }

    this.maybePostStats(false /*silence*/);
    return true;
  }

  private maybePostStats(silence: boolean) {
    const now = currentTime;
    if (now - this.lastStatTime >= 0.1) {
      this.lastStatTime = now;
      this.port.postMessage({
        type: "stats",
        frames: this.frames,
        posts: this.posts,
        acc: this.acc,
        hopLen: this.st.hopLen,
        effWinLen: this.st.effWinLen,
        ringWrite: this.st.ringWrite,
        ringFilled: this.st.ringFilled,
        silence,
      });
    }
  }
}
registerProcessor("pitch-detector", PitchDetectorProcessor);
