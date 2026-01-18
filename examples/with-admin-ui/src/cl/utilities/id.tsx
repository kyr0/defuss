// --- id helpers ---
let __id = 0;
export const uid = (p = "cmp") => `${p}-${++__id}`;
