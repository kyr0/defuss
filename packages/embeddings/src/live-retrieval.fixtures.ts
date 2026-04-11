export const LIVE_MODEL_ID = "tss-deposium/harrier-oss-v1-270m-onnx-int8";
export const LIVE_CACHE_DIR = ".cache/defuss-embeddings-live";
export const LIVE_BROWSER_CACHE_DIR = ".cache/defuss-embeddings-live-browser";
export const LIVE_TIMEOUT_MS = 900_000;

export interface RetrievalDoc {
  readonly id: string;
  readonly text: string;
}

const getRetrievalDoc = (id: string): RetrievalDoc => {
  const doc = corpus.find((entry) => entry.id === id);
  if (!doc) {
    throw new Error(`Unknown retrieval doc id: ${id}`);
  }
  return doc;
};

const NEEDLE_HAYSTACK_DISTRACTOR_TOPICS = [
  "radio telescopes",
  "rose pruning",
  "laminated pastry",
  "bond yields",
  "topographic contours",
  "vowel harmony",
  "basalt columns",
  "string quartets",
  "coral reefs",
  "cantilever beams",
  "portrait lighting",
  "barometric pressure",
  "comet dust tails",
  "compost temperature",
  "whole wheat loaves",
  "fiscal stimulus",
  "map generalization",
  "semantic drift",
  "river deltas",
  "tempo rubato",
  "kelp forests",
  "daylight wells",
  "manual white balance",
  "forecast models",
  "binary star orbits",
  "pollinator flowers",
  "pie crusts",
  "trade deficits",
  "nautical charts",
  "dialect continua",
  "karst caves",
  "drum rudiments",
  "mangrove roots",
  "green roofs",
  "raw development",
  "jet streams",
] as const;

const makeThemeDocs = (
  theme: string,
  context: string,
  subjects: readonly string[],
): RetrievalDoc[] => {
  return subjects.map((subject, index) => ({
    id: `${theme}-${index}`,
    text: `${subject} is covered in this ${theme} note. It explains ${subject} with concrete details about ${context} and practical examples for readers studying ${theme}.`,
  }));
};

export const corpus: RetrievalDoc[] = [
  {
    id: "protein-guideline",
    text:
      "As a general guideline, the CDC's average requirement of protein for women ages 19 to 70 is 46 grams per day. But, as you can see from this chart, you'll need to increase that if you're expecting or training for a marathon. Check out the chart below to see how much protein you should be eating each day.",
  },
  {
    id: "summit-definition",
    text:
      "Definition of summit for English Language Learners. : 1 the highest point of a mountain : the top of a mountain. : 2 the highest level. : 3 a meeting or series of meetings between the leaders of two or more governments.",
  },
  {
    id: "css-center-div",
    text:
      "To center a div in CSS with flexbox, set display: flex on the container, then use justify-content: center and align-items: center to center the child horizontally and vertically.",
  },
  {
    id: "python-virtualenv",
    text:
      "Create a Python virtual environment by running python -m venv .venv, then activate it before installing packages with pip so dependencies stay isolated from the global interpreter.",
  },
  ...makeThemeDocs("astronomy", "observatories, telescopes, and night-sky measurement", [
    "nebula spectroscopy",
    "red giant evolution",
    "comet dust tails",
    "lunar eclipses",
    "planetary transits",
    "radio telescopes",
    "stellar parallax",
    "dark matter mapping",
    "binary star orbits",
    "meteor showers",
  ]),
  ...makeThemeDocs("gardening", "soil care, pruning schedules, and seasonal planting", [
    "tomato seedlings",
    "compost temperature",
    "mulch retention",
    "rose pruning",
    "herb planters",
    "rain barrels",
    "bean trellises",
    "pollinator flowers",
    "seed trays",
    "shade gardens",
  ]),
  ...makeThemeDocs("baking", "fermentation, oven heat, and dough structure", [
    "sourdough starters",
    "laminated pastry",
    "whole wheat loaves",
    "proofing baskets",
    "bagel boiling",
    "rye flour",
    "pie crusts",
    "biscuit texture",
    "cinnamon rolls",
    "sheet cakes",
  ]),
  ...makeThemeDocs("economics", "markets, incentives, and public policy", [
    "inflation expectations",
    "bond yields",
    "labor mobility",
    "price ceilings",
    "fiscal stimulus",
    "currency pegs",
    "household savings",
    "trade deficits",
    "productivity growth",
    "interest rates",
  ]),
  ...makeThemeDocs("cartography", "maps, projections, and spatial analysis", [
    "topographic contours",
    "choropleth legends",
    "mercator projection",
    "street atlases",
    "scale bars",
    "geodesic distances",
    "terrain shading",
    "map generalization",
    "land parcel grids",
    "nautical charts",
  ]),
  ...makeThemeDocs("linguistics", "phonology, syntax, and language change", [
    "vowel harmony",
    "verb conjugation",
    "tone sandhi",
    "loanwords",
    "morphological case",
    "code switching",
    "semantic drift",
    "pragmatic markers",
    "dialect continua",
    "prosody patterns",
  ]),
  ...makeThemeDocs("geology", "rock layers, erosion, and tectonic movement", [
    "basalt columns",
    "fault scarps",
    "sedimentary basins",
    "glacial till",
    "volcanic ash",
    "mineral veins",
    "river deltas",
    "plate boundaries",
    "fossil beds",
    "karst caves",
  ]),
  ...makeThemeDocs("music", "composition, rehearsal, and performance technique", [
    "string quartets",
    "brass harmonies",
    "jazz voicings",
    "choral diction",
    "drum rudiments",
    "piano pedaling",
    "counterpoint studies",
    "orchestral tuning",
    "tempo rubato",
    "stage monitors",
  ]),
  ...makeThemeDocs("marine-biology", "coastal habitats, migration, and underwater ecosystems", [
    "coral reefs",
    "kelp forests",
    "whale migration",
    "salinity gradients",
    "plankton blooms",
    "sea turtle nests",
    "mangrove roots",
    "tidal pools",
    "deep sea vents",
    "estuary nurseries",
  ]),
  ...makeThemeDocs("architecture", "materials, facades, and structural planning", [
    "cantilever beams",
    "courtyard housing",
    "brick vaults",
    "passive ventilation",
    "daylight wells",
    "timber framing",
    "acoustic panels",
    "stair cores",
    "green roofs",
    "load paths",
  ]),
  ...makeThemeDocs("photography", "lighting, lenses, and field workflow", [
    "portrait lighting",
    "prime lenses",
    "long exposure waterfalls",
    "histogram checks",
    "color grading",
    "tripod stability",
    "street photography",
    "macro focus stacking",
    "manual white balance",
    "raw development",
  ]),
  ...makeThemeDocs("meteorology", "fronts, pressure systems, and severe weather", [
    "cold fronts",
    "barometric pressure",
    "storm cells",
    "jet streams",
    "hail formation",
    "humidity levels",
    "tornado watches",
    "radar reflectivity",
    "ocean currents",
    "forecast models",
  ]),
];

export const scenarios = [
  {
    query: "how much protein should a woman eat each day",
    expectedId: "protein-guideline",
  },
  {
    query: "what does summit mean in English",
    expectedId: "summit-definition",
  },
  {
    query: "how do I center a div using CSS flexbox",
    expectedId: "css-center-div",
  },
  {
    query: "how do I create a Python virtual environment",
    expectedId: "python-virtualenv",
  },
] as const;

export const buildNeedleHaystackCorpus = (
  size = 512,
  targetScenarios = scenarios,
): RetrievalDoc[] => {
  if (size <= targetScenarios.length) {
    throw new Error(`Needle haystack size must exceed ${targetScenarios.length}`);
  }

  const targets = targetScenarios.map((scenario) => getRetrievalDoc(scenario.expectedId));
  const haystack: RetrievalDoc[] = [];
  const distractorCount = size - targets.length;

  for (let index = 0; index < distractorCount; index++) {
    const topicA = NEEDLE_HAYSTACK_DISTRACTOR_TOPICS[index % NEEDLE_HAYSTACK_DISTRACTOR_TOPICS.length]!;
    const topicB =
      NEEDLE_HAYSTACK_DISTRACTOR_TOPICS[
        (index * 7 + 3) % NEEDLE_HAYSTACK_DISTRACTOR_TOPICS.length
      ]!;
    const topicC =
      NEEDLE_HAYSTACK_DISTRACTOR_TOPICS[
        (index * 11 + 5) % NEEDLE_HAYSTACK_DISTRACTOR_TOPICS.length
      ]!;

    haystack.push({
      id: `archive-${index}`,
      text:
        `Archive record ${index}. Field notes cover ${topicA}, ${topicB}, and ${topicC} with sensor readings, maintenance logs, specimen counts, and shipment manifests for long-term storage.`,
    });
  }

  for (let index = 0; index < targets.length; index++) {
    const insertAt = Math.floor(((index + 1) * size) / (targets.length + 1));
    haystack.splice(insertAt, 0, targets[index]!);
  }

  return haystack;
};
