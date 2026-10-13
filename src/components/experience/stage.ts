/**
 * Shared state for the whole-page experience.
 *
 * The DOM (scroll, pointer, the control panel, the configurator) writes here;
 * the WebGL scene reads it every frame. Anything that changes per frame lives
 * in plain mutable objects; anything the React UI has to re-render for lives
 * in a small subscribable store.
 */

export type ModuleType = "solo" | "duo" | "flex";
export type EndsType = "core" | "duo" | "flex";

/** Page sections in scroll order. `svh` is the section's scroll length. */
export const SECTIONS = [
  { id: "hero", label: "YU ONE", svh: 420 },
  { id: "modules", label: "Modules", svh: 700 },
  { id: "care", label: "Care", svh: 700 },
  { id: "control", label: "Control", svh: 600 },
  { id: "build", label: "Build", svh: 400 },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

/** The product page in the store, where the cart is. */
export const STORE_URL = "https://yuhome.com.sg/products/yu-one-automated-laundry-system";

/**
 * Resting beats on the page, as page positions (section index + progress).
 * Scrolling past one plays the journey through to the next, so a reader who
 * nudges the wheel sees a whole transition rather than a frame of it. Reduced
 * motion cuts straight between them.
 */
export const ANCHORS = [
  0, 0.2, 0.62, 0.97,
  1.29, 1.5, 1.6, 1.74, 1.97,
  2.22, 2.41, 2.57, 2.71, 2.92,
  3.4, 3.62, 3.76, 3.9,
  4.5, 5.0,
];

/** Fraction of a section's progress spent scrolling into view, before it pins. */
export const enterOf = (id: SectionId) => 100 / SECTIONS.find((s) => s.id === id)!.svh;

export const stage = {
  /** 0→1 per section, same order as SECTIONS. */
  progress: [0, 0, 0, 0, 0],
  /** Normalised cursor, -1..1 on both axes. */
  pointer: { x: 0, y: 0 },
  /** Scroll speed in viewport heights per second, signed. */
  velocity: 0,
  /** prefers-reduced-motion */
  reduced: false,
  /** The model is decoded and on screen. */
  ready: false,
  /** Rack height set from the control panel: 0 = up at the ceiling, 1 = lowered. */
  height: 1,
  /** Drag-to-orbit offsets in the configurator, radians. */
  orbit: { yaw: 0, pitch: 0 },
  /** Set by the sound toggle. */
  sound: false,
};

/** Continuous position on the page: section index + progress within it. */
export function pageT() {
  const p = stage.progress;
  let t = 0;
  for (let i = 0; i < p.length; i++) t += p[i];
  return t;
}

type Listener = () => void;

function createStore<T extends object>(initial: T) {
  let value = initial;
  const subs = new Set<Listener>();
  return {
    get: () => value,
    set(patch: Partial<T>) {
      let changed = false;
      for (const k in patch) {
        if (!Object.is(patch[k], value[k])) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      value = { ...value, ...patch };
      subs.forEach((f) => f());
    },
    subscribe(f: Listener) {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
  };
}

export type LightMode = "off" | "warm" | "cool" | "daylight";

/** What the unit is doing, as shown on (and set from) the control panel. */
export type ControlState = {
  light: LightMode;
  flow: boolean;
  uv: boolean;
  heat: boolean;
  /** "you" while the visitor drives, "schedule" while the day timeline does. */
  driver: "you" | "schedule";
  /** Clock label for the day timeline, e.g. "07:00". Empty while the visitor drives. */
  clock: string;
  /** What the schedule just did, for the panel's status line. */
  note: string;
};

export const control = createStore<ControlState>({
  light: "off",
  flow: false,
  uv: false,
  heat: false,
  driver: "you",
  clock: "",
  note: "",
});

export type BuildState = {
  ends: EndsType;
  slots: ModuleType[];
  flow: boolean;
  uv: boolean;
  /** Show the room outline and the figure for scale. */
  space: boolean;
  /** Width of the visitor's balcony or room, metres. */
  roomWidth: number;
};

export const DEFAULT_BUILD: BuildState = {
  ends: "flex",
  slots: ["solo", "duo", "flex"],
  flow: true,
  uv: true,
  space: false,
  roomWidth: 2.4,
};

export const build = createStore<BuildState>(DEFAULT_BUILD);

const CODE: Record<ModuleType, string> = { solo: "s", duo: "d", flex: "f" };
const FROM_CODE: Record<string, ModuleType> = { s: "solo", d: "duo", f: "flex" };

/** Compact, shareable form of a configuration, e.g. "flex-sdf-fu". */
export function encodeBuild(b: BuildState) {
  const extras = `${b.flow ? "f" : ""}${b.uv ? "u" : ""}` || "0";
  return `${b.ends}-${b.slots.map((s) => CODE[s]).join("")}-${extras}`;
}

export function decodeBuild(code: string): Partial<BuildState> | null {
  const m = /^(core|duo|flex)-([sdf]{2,4})-([fu0]{1,2})$/.exec(code.trim());
  if (!m) return null;
  return {
    ends: m[1] as EndsType,
    slots: m[2].split("").map((c) => FROM_CODE[c]),
    flow: m[3].includes("f"),
    uv: m[3].includes("u"),
  };
}
