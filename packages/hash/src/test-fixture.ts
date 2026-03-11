import type { JsonValue } from "./index";

function createDay(day: number, withHours: boolean): { d: string; typTsz?: { typ: string; sprechzeiten: { z: string }[] }[] } {
  if (!withHours) {
    return { d: `2026-03-${String(day).padStart(2, "0")}` };
  }

  return {
    d: `2026-03-${String(day).padStart(2, "0")}`,
    typTsz: [
      {
        typ: "01",
        sprechzeiten: [{ z: "09:00 - 13:00" }, { z: "15:00 - 18:00" }],
      },
    ],
  };
}

function createPractitioner(index: number) {
  return {
    arzt: true,
    id: String(index),
    name: `Doctor-${index}`,
    vorname: `Given-${index}`,
    distance: 100 + index,
    geoeffnet: index % 2 === 0 ? "OPEN" : "CLOSED",
    keineSprechzeiten: index % 3 === 0,
    ag: [
      { key: "12", value: "Psychotherapie" },
      { key: String(index % 50), value: `Area-${index % 7}` },
    ],
    tsz: [
      createDay(11, index % 2 === 0),
      createDay(12, true),
      createDay(13, index % 4 === 0),
      createDay(14, false),
    ],
    fs: ["Englisch", ...(index % 5 === 0 ? ["Italienisch"] : [])],
    fg: ["Ärztliche Psychotherapie"],
    psy: [
      {
        heading: "Tiefenpsychologisch fundierte Psychotherapie",
        values: index % 2 === 0 ? ["Einzeltherapie"] : ["Gruppentherapie"],
      },
    ],
    kvg: [
      {
        heading: "Psychosomatische Grundversorgung",
        values: ["Psychosomatische Gespräche"],
      },
    ],
    lat: 53.55 + index / 10000,
    lon: 10.0 + index / 10000,
    erm: false,
    nteStart: `2026-03-${String((index % 28) + 1).padStart(2, "0")}@13:00`,
    nteEnde: `2026-03-${String((index % 28) + 1).padStart(2, "0")}@13:50`,
    nested: {
      meta: {
        stable: true,
        score: index,
        tags: ["a", "b", String(index % 3)],
      },
    },
  } satisfies JsonValue;
}

export function createFixture(count = 32): JsonValue {
  return Array.from({ length: count }, (_, i) => createPractitioner(i + 1));
}
