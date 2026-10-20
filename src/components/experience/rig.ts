import * as THREE from "three";
import { ANCHORS, DEFAULT_BUILD, build, control, pageT, stage, type FeatureSlot, type FrameType, type LightMode, type ModuleType } from "./stage";

/**
 * The choreography. One function turns "where the reader is on the page" into
 * everything the scene needs this frame: where the unit sits on screen, how
 * far apart its parts are, what is switched on, and which backdrop is showing.
 *
 * T is the page position: section index + progress inside it.
 *   0‥1 hero · 1‥2 modules · 2‥3 care · 3‥4 control · 4‥5 build
 */

/** The camera never moves; the unit is posed in front of it. */
export const CAMERA = { position: [0, -0.18, 2.6] as [number, number, number], fov: 30 };
/** World units visible top to bottom at the unit's distance. */
const VIEW_HEIGHT = 2 * Math.hypot(CAMERA.position[1], CAMERA.position[2]) * Math.tan((CAMERA.fov * Math.PI) / 360);

/* ---------- hero constants (unchanged from the original scroll hero) ---------- */

export const BEATS = {
  spinStart: 0.12,
  spinEnd: 0.8,
  attachStart: 0.26,
  attachEnd: 0.66,
  lowerStart: 0.74,
  lowerEnd: 0.97,
};

const REST_YAW = -0.42; // slight 3/4 pose at rest
const REST_PITCH = -0.16; // tip the underside toward the viewer, as if looking up at the ceiling
const SPIN_TURNS = 0.5; // half a revolution across the hero, never more
/** Full travel of the rack, metres: the rail ends up 1.3 m below the top of the unit. */
export const RACK_DROP = 0.91;
/** Where the rack sits while the laundry dries in the care section: low enough to read, not at the floor. */
const CARE_DROP = 0.5;
const REST_Y = 0.3; // hang point below the top of the frame
const INTRO_SECONDS = 1.6; // entrance ease on first paint

/** Model-space heights, metres. The top of the base is y = 0. */
export const RACK_Y = -0.39;
/** Specimen drawer: how far below the rack each module row hangs. */
const ROW_GAP = 0.95;
/** Phones show one specimen at a time, so the rows hang further apart and the others leave the screen. */
const ROW_GAP_NARROW = 1.9;
const row = (k: number) => RACK_Y - 0.3 - ROW_GAP * k - 0.33;
/** Where row k hangs this frame; the kit reads this. */
export const drawerY = (k: number) => -0.3 - rig.rowGap * k;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const smooth = (u: number) => u * u * (3 - 2 * u);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

type Key = [t: number, v: number];

/** Piecewise track over T, eased between keys. */
function track(keys: Key[]) {
  return (t: number) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, v0] = keys[i];
      const [t1, v1] = keys[i + 1];
      if (t <= t1) return t1 === t0 ? v1 : v0 + (v1 - v0) * smooth((t - t0) / (t1 - t0));
    }
    return keys[keys.length - 1][1];
  };
}

const PI = Math.PI;

/* ---------- where the unit sits on screen, after the hero ---------- */

/** The specimen drawer is seen from above and a touch to the side, so a pair of poles reads as two lines. */
const DRAWER_YAW = PI + 0.3;
const DRAWER_PITCH = 0.58;

const yaw = track([
  [1.0, REST_YAW + PI], [1.14, 3.5], [1.34, 3.58], [1.44, DRAWER_YAW], [1.76, DRAWER_YAW], [1.84, 3.72], [2.0, 3.8],
  [2.14, 3.56], [2.3, 3.5], [2.38, PI], [2.44, PI], [2.52, 4.0], [2.62, 4.1], [2.68, 4.56], [2.74, 4.62], [2.82, 3.52], [3.0, 3.44],
  [3.167, 3.62], [4.0, 3.56], [4.25, 3.66], [4.8, 3.66], [5.0, 3.56],
]);
const pitch = track([
  [1.0, REST_PITCH], [1.14, 0.34], [1.34, 0.34], [1.44, DRAWER_PITCH], [1.76, DRAWER_PITCH], [1.84, -0.42], [2.0, -0.42],
  [2.14, -0.18], [2.3, -0.18], [2.38, -1.3], [2.44, -1.3], [2.52, -0.2], [2.62, -0.2], [2.68, -0.42], [2.74, -0.42], [2.82, -0.26], [3.0, -0.26],
  [3.167, -0.14], [4.0, -0.14], [4.25, -0.2], [4.8, -0.2], [5.0, REST_PITCH],
]);
const zoom = track([
  [1.0, 0.8], [1.14, 0.7], [1.34, 0.7], [1.44, 1.2], [1.76, 1.2], [1.84, 0.92], [2.0, 0.92],
  [2.14, 0.74], [2.3, 0.74], [2.38, 0.94], [2.44, 0.94], [2.52, 0.8], [2.62, 0.8], [2.68, 2.2], [2.74, 2.3], [2.82, 0.86], [3.0, 0.86],
  [3.167, 0.72], [4.0, 0.72], [4.25, 0.85], [4.8, 0.85], [5.0, 0.8],
]);
/** Horizontal place on screen, as a fraction of the viewport width from centre. */
const fx = track([
  [1.0, 0.12], [1.14, 0.1], [1.34, 0.1], [1.44, 0.15], [1.76, 0.15], [1.84, 0.14], [2.0, 0.14],
  [2.14, 0.17], [2.3, 0.17], [2.38, 0.14], [2.44, 0.14], [2.52, 0.12], [2.62, 0.12], [2.68, 0.05], [2.74, 0.05], [2.82, 0.14], [3.0, 0.14],
  [3.167, 0.2], [4.0, 0.2], [4.25, 0.2], [4.8, 0.2], [5.0, 0],
]);
/** Vertical place on screen in world units: -0.18 is the centre, +0.5 the top edge. */
const py = track([
  [1.0, REST_Y + 0.17], [1.14, -0.12], [1.34, -0.12], [1.44, -0.05], [1.76, -0.05], [1.84, 0.0], [2.0, 0.0],
  [2.14, 0.1], [2.3, 0.1], [2.38, 0.02], [2.44, 0.02], [2.52, -0.02], [2.62, -0.02], [2.68, 0.1], [2.74, 0.1], [2.82, -0.02], [3.0, -0.02],
  [3.167, 0.14], [4.0, 0.14], [4.25, 0.08], [4.8, 0.08], [5.0, 0.3],
]);
/** The point of the model (height, metres) that sits at that place. */
const pivotY = track([
  [1.0, 0], [1.14, -0.46], [1.34, -0.46], [1.44, row(0)], [1.52, row(0)], [1.56, row(1)], [1.62, row(1)], [1.66, row(2)], [1.76, row(2)],
  [1.84, RACK_Y], [2.0, RACK_Y],
  [2.14, -0.6], [2.3, -0.6], [2.38, -0.55], [2.44, -0.55], [2.52, -0.75], [2.62, -0.75], [2.68, -1.0], [2.74, -1.0], [2.82, -0.78], [3.0, -0.78],
  [3.167, -0.42], [4.0, -0.42], [4.25, -0.32], [4.8, -0.32], [5.0, -0.2],
]);

/** Phones stack the copy under the unit, so it sits higher; more so where a panel takes the lower half. */
const narrowLift = track([
  [1.0, 0], [1.14, 0.3], [1.34, 0.3],
  // the specimen drawer: its copy sits under the heading, so the row hangs in the lower half
  [1.44, 0.06], [1.76, 0.06], [1.84, 0.16],
  [2.44, 0.16], [2.52, 0.36], [2.62, 0.36], [2.68, 0.16],
  [3.0, 0.16], [3.167, 0.12], [4.0, 0.12], [4.25, 0.24], [4.8, 0.24], [5.0, 0.05],
]);
/** Phones also need the unit smaller where copy or a panel shares the screen with it. */
const narrowZoom = track([[1.36, 1], [1.44, 0.75], [1.76, 0.75], [1.84, 1], [2.44, 1], [2.52, 0.8], [2.62, 0.8], [2.68, 1], [3.0, 1], [3.167, 0.72], [4.0, 0.72], [4.25, 1]]);

/* ---------- what the unit is doing ---------- */

// in care the rack hangs low while Flow dries, then rises all the way before UV Glow (UV only runs at the top)
const drop = track([
  [1.0, RACK_DROP], [1.1, 0], [2.04, 0], [2.14, CARE_DROP], [2.74, CARE_DROP], [2.8, 0], [3.04, 0], [3.14, CARE_DROP],
  [4.0, CARE_DROP], [4.25, 0.12], [4.8, 0.12], [4.95, 0],
]);
const explode = track([[1.16, 0], [1.25, 1], [1.33, 1], [1.4, 0]]);
const drawer = track([[1.36, 0], [1.45, 1], [1.76, 1], [1.84, 0]]);
const swing = track([[1.64, 0], [1.7, 1], [1.76, 1], [1.8, 0]]);
/** The pole-length dimension, shown under Solo. */
const poleDim = track([[1.455, 0], [1.49, 1], [1.535, 1], [1.565, 0]]);
const garment = [
  track([[1.45, 0], [1.49, 1], [1.53, 1], [1.56, 0], [2.45, 0], [2.51, 1], [4.0, 1], [4.08, 0]]),
  track([[1.55, 0], [1.59, 1], [1.63, 1], [1.66, 0], [2.46, 0], [2.52, 1], [4.0, 1], [4.08, 0]]),
  track([[1.68, 0], [1.72, 1], [1.76, 1], [1.8, 0], [2.47, 0], [2.53, 1], [4.0, 1], [4.08, 0]]),
  track([[2.48, 0], [2.54, 1], [4.0, 1], [4.08, 0]]),
];
const fan = track([[2.3, 0], [2.38, 1], [2.72, 1], [2.78, 0]]);
const air = track([[2.36, 0], [2.44, 1], [2.7, 1], [2.76, 0]]);
/** Laundry goes up wet at the start of the care section and dries under Flow. */
const damp = track([[2.0, 0], [2.04, 1], [2.52, 1], [2.64, 0]]);
const uv = track([[2.8, 0], [2.86, 1], [3.0, 1], [3.1, 0]]);
const sweep = track([[2.8, 0], [3.0, 1]]);
const lightsOut = track([[2.74, 0], [2.8, 1], [3.0, 1], [3.12, 0], [4.86, 0], [4.97, 1]]);
/** 1 while the control panel (not the script above) decides what is on. */
const inControl = track([[3.04, 0], [3.14, 1], [3.98, 1], [4.06, 0]]);
const inBuild = track([[4.04, 0], [4.1, 1]]);

/* ---------- backdrop ---------- */

const paper = track([[1.03, 0], [1.13, 1], [2.0, 1], [2.12, 0]]);
const duskHero = track([[1.0, 1], [1.12, 0], [3.0, 0], [3.12, 1]]);
const rainCare = track([[2.02, 0], [2.14, 1], [3.0, 1], [3.1, 0]]);
/** Darkening veil over the room plate, so the unit and the copy stay in front. */
const veil = track([[1.0, 0.3], [2.0, 0.3], [2.14, 0.18], [3.0, 0.18], [3.14, 0.3], [4.0, 0.3], [4.2, 0.5]]);

/** The day timeline in the control section: section progress → hour of day. */
export const DAY = { start: 0.56, end: 0.97, from: 7, to: 23 };
const hourAt = (q: number) => DAY.from + seg(q, DAY.start, DAY.end) * (DAY.to - DAY.from);

type ScheduleSet = Partial<{ height: number; flow: boolean; uv: boolean; heat: boolean; light: LightMode; garments: boolean }>;
const SCHEDULE: { at: number; note: string; set: ScheduleSet }[] = [
  { at: 0, note: "Waiting for the morning load", set: { height: 0, flow: false, uv: false, heat: false, light: "off", garments: false } },
  { at: 7.5, note: "Lowered for the morning load", set: { height: 1, garments: true } },
  { at: 9, note: "Flow on", set: { flow: true } },
  { at: 13, note: "Rain outside. Flow and heating keep drying", set: { flow: true, heat: true } },
  // UV only runs with the rack all the way up, so the rack goes up first
  { at: 15, note: "Dry. Raised for the disinfect cycle", set: { flow: false, heat: false, height: 0 } },
  { at: 16, note: "Disinfect cycle, rack at the top", set: { uv: true } },
  { at: 17.5, note: "Disinfected. Ready to collect", set: { uv: false } },
  { at: 18.5, note: "Collected, rack out of the way", set: { garments: false } },
  { at: 20.5, note: "Evening light, warm", set: { light: "warm" } },
  { at: 22.6, note: "Goodnight", set: { light: "off" } },
];

/** What each lighting mode looks like on the panel under the base. */
export const LIGHT_COLORS: Record<Exclude<LightMode, "off">, string> = {
  warm: "#ffcf96",
  cool: "#cfe3ff",
  daylight: "#fff4e2",
};

const SCRIPTED_SLOTS: ModuleType[] = ["solo", "duo", "flex", "duo"];
const HERO_SLOTS: ModuleType[] = ["flex", "flex", "flex"];
/** Flow and UV Glow where the model carries them. */
const SCRIPTED_FEATURES: FeatureSlot[] = DEFAULT_BUILD.features;

/** Beats the reduced-motion mode snaps to, so the unit cuts instead of flying. */
const CUTS = ANCHORS.filter((a) => a > 1);

export const rig = {
  T: 0,
  heroP: 0,
  fit: 0.82,
  narrow: false,
  reducedMotion: false,

  pos: new THREE.Vector3(0, REST_Y, 0),
  scale: 0.82,
  rot: new THREE.Euler(REST_PITCH, REST_YAW, 0),
  pivot: new THREE.Vector3(),

  /** Hero: fraction through the baked attach clip. */
  attach: 0,
  /** After the hero the rack is assembled from the parts kit. */
  useKit: false,
  drop: 0,
  explode: 0,
  drawer: 0,
  swing: 0,
  count: 3,
  slots: HERO_SLOTS,
  frame: "max" as FrameType,
  garments: [0, 0, 0, 0],
  damp: 0,
  /** What sits in each of the base's smart-feature slots. */
  features: SCRIPTED_FEATURES,
  fan: 0,
  /** Accumulated fan rotation, radians. */
  fanAngle: 0,
  /** Where Flow's louvre points this frame, radians about the pole axis: the air sweeps with it. */
  swingAngle: 0,
  air: 0,
  /** Flow speed multiplier, pushed up by scroll speed. */
  gust: 1,
  uv: 0,
  /** 1 only while the rack is all the way up: the product will not run UV anywhere else. */
  uvReady: 0,
  sweep: 0,
  light: 0,
  lightColor: new THREE.Color(LIGHT_COLORS.warm),
  heat: 0,
  lightsOut: 0,
  /** 1 while the unit has power; 0 once the page has closed and everything is off. */
  power: 1,
  space: 0,
  roomWidth: 2.4,
  /** Opacity of the exploded-view labels. */
  labels: 0,
  /** Vertical spacing of the specimen rows, metres. */
  rowGap: ROW_GAP,
  /** Phones: how far the base and the frame rise out of the way while the specimens are on show, metres. */
  drawerLift: 0,
  /** Opacity of the ceiling-to-rail dimension line. */
  measure: 0,
  /** Opacity of the pole-length dimension under the Solo specimen. */
  poleDim: 0,
  humidity: 86,
  /** Rack height as the control panel sees it, 0 up ‥ 1 down. */
  height: 1,
  /** How fast the rack is travelling, for the motor sound. */
  travel: 0,

  backdrop: { dusk: 1, rain: 0, night: 0, morning: 0, paper: 0, black: 0, dim: 0, plateScale: 1 },
};

let smoothed = 0;
let introStart: number | null = null;
const look = { x: 0, y: 0 };
let heightNow = 1;
let lastScheduleNote = "";
let lightNow = 0;
let flowNow = 0;
let uvNow = 0;
let heatNow = 0;
let spaceNow = 0;
const lightGoal = new THREE.Color(LIGHT_COLORS.warm);

const pad = (n: number) => String(n).padStart(2, "0");

/** Development only: jump the damped position straight to the scroll position. */
export function settleRig() {
  smoothed = pageT();
}

function runSchedule(q: number) {
  const hour = hourAt(q);
  const state = { height: 0, flow: false, uv: false, heat: false, light: "off" as LightMode, garments: false };
  let note = "";
  for (const step of SCHEDULE) {
    if (hour >= step.at) {
      Object.assign(state, step.set);
      note = step.note;
    }
  }
  const mins = Math.round((hour % 1) * 60);
  const h = mins === 60 ? Math.floor(hour) + 1 : Math.floor(hour);
  const clock = `${pad(h)}:${pad(mins === 60 ? 0 : Math.floor(mins / 10) * 10)}`;
  stage.height = state.height;
  if (note !== lastScheduleNote || control.get().clock !== clock) {
    lastScheduleNote = note;
    control.set({ driver: "schedule", clock, note, light: state.light, flow: state.flow, uv: state.uv, heat: state.heat });
  }
  return { hour, garments: state.garments };
}

/**
 * Evaluate the whole rig for this frame. Driven by the page's ticker rather
 * than the canvas, so the backdrop and the copy are right even while the
 * model is still loading.
 */
export function tickRig(t: number, dt: number) {
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const viewport = { aspect, width: VIEW_HEIGHT * aspect, height: VIEW_HEIGHT };
  rig.narrow = viewport.aspect < 0.9;
  rig.rowGap = rig.narrow ? ROW_GAP_NARROW : ROW_GAP;
  rig.reducedMotion = stage.reduced;
  // the unit is ~1.18 m wide: capped on wide screens, ~80% of the width on phones
  rig.fit = Math.min(0.82, viewport.width / 1.45);

  // damp toward the scroll position so wheel steps feel like weight, not ticks
  const goal = pageT();
  if (stage.reduced) {
    smoothed = goal <= 1 ? 0 : CUTS.reduce((best, a) => (Math.abs(a - goal) < Math.abs(best - goal) ? a : best), CUTS[0]);
  } else {
    smoothed += (goal - smoothed) * Math.min(1, dt * 5.5);
  }
  const T = smoothed;
  rig.T = T;
  const p = clamp01(T);
  rig.heroP = p;

  // one-time entrance, once the model is on screen: settle up into place and swing into the rest pose
  if (stage.ready && introStart === null) introStart = t;
  const intro = introStart === null ? 0 : easeOut(Math.min(1, (t - introStart) / INTRO_SECONDS));

  // cursor follow: ease toward the pointer so the unit turns to look, not snap
  const calm = stage.reduced ? 0 : 1;
  const k = Math.min(1, dt * 3);
  look.x += (stage.pointer.x * calm - look.x) * k;
  look.y += (stage.pointer.y * calm - look.y) * k;
  const swayY = Math.sin(t * 0.35) * 0.015 * calm;
  const swayZ = Math.sin(t * 0.27) * 0.006 * calm;

  /* ---------- control panel / schedule ---------- */
  const qControl = stage.progress[3];
  const wControl = inControl(T);
  let scheduleGarments = true;
  if (wControl > 0.5) {
    if (qControl >= DAY.start - 0.02) {
      scheduleGarments = runSchedule(qControl).garments;
    } else if (control.get().driver !== "you") {
      lastScheduleNote = "";
      stage.height = 1;
      control.set({ driver: "you", clock: "", note: "", light: "off", flow: false, uv: false, heat: false });
    }
  }
  // the motor has a top speed, however fast the panel asks
  const before = heightNow;
  const step = dt * 0.45;
  heightNow += Math.min(step, Math.max(-step, stage.height - heightNow));
  rig.height = heightNow;
  rig.travel = dt > 0 ? Math.abs(heightNow - before) / dt : 0;

  const c = control.get();
  const ease = Math.min(1, dt * 4);
  lightNow += ((c.light !== "off" ? 1 : 0) * wControl - lightNow) * ease;
  if (c.light !== "off") lightGoal.set(LIGHT_COLORS[c.light]);
  rig.lightColor.lerp(lightGoal, ease);
  flowNow += ((c.flow ? 1 : 0) * wControl - flowNow) * ease;
  // UV is interlocked with the lift: it runs only with the rack all the way up, and the
  // moment the rack leaves the top it switches off (the visitor turns it on again at the top)
  const atTop = heightNow <= 0.001;
  if (c.rackUp !== atTop) control.set({ rackUp: atTop });
  if (c.uv && !atTop && c.driver === "you") control.set({ uv: false });
  uvNow += ((c.uv && atTop ? 1 : 0) * wControl - uvNow) * ease;
  heatNow += ((c.heat ? 1 : 0) * wControl - heatNow) * ease;

  /* ---------- configurator ---------- */
  const wBuild = inBuild(T);
  const b = build.get();
  const building = wBuild > 0.5;
  spaceNow += ((building && b.space ? 1 : 0) - spaceNow) * Math.min(1, dt * 3);
  rig.space = spaceNow;
  rig.roomWidth = b.roomWidth;

  /* ---------- pose ---------- */
  if (T <= 1) {
    const turn = easeInOut(seg(p, BEATS.spinStart, BEATS.spinEnd));
    const settle = (1 - intro) * -0.35; // arrives from a slightly different angle
    // tip further up while the modules attach so the underside is the stage
    const attachPhase = Math.sin(seg(p, BEATS.attachStart, BEATS.attachEnd) * PI);
    const lower = easeInOut(seg(p, BEATS.lowerStart, BEATS.lowerEnd));
    rig.rot.set(
      REST_PITCH - Math.sin(turn * PI) * 0.06 - attachPhase * 0.12 - look.y * 0.07,
      REST_YAW + settle + turn * PI * 2 * SPIN_TURNS + look.x * 0.16 + swayY,
      swayZ + look.x * 0.02,
    );
    // as the rack comes down its full 1.3 m, ease the whole unit up and back
    // so the rail, the dimension and the closing copy all fit beneath the base
    // and over to the right, so the closing copy can stand beside it rather than across it
    // (phones keep the copy below, so the unit rises further and shrinks more)
    const aside = rig.narrow ? 0 : 0.12 * viewport.width * lower;
    const rise = rig.narrow ? 0.3 : 0.17;
    const shrink = rig.narrow ? 0.32 : 0.2;
    rig.pos.set(aside + look.x * 0.03, REST_Y + rise * lower - 0.06 * (1 - intro) + look.y * 0.015, 0);
    rig.scale = rig.fit * (1 - shrink * lower) * (0.96 + 0.04 * intro);
    rig.pivot.set(0, 0, 0);
    rig.drop = RACK_DROP * lower;
  } else {
    const orbit = wBuild;
    // standing back far enough to take in the whole room
    const zoomOut = 1 - 0.5 * spaceNow;
    rig.rot.set(
      pitch(T) + stage.orbit.pitch * orbit - look.y * 0.05,
      yaw(T) + stage.orbit.yaw * orbit + look.x * 0.1 + swayY,
      swayZ + look.x * 0.015,
    );
    const side = rig.narrow ? 0 : fx(T) * (1 - 0.6 * spaceNow);
    rig.pos.set(side * viewport.width + look.x * 0.02, py(T) + (rig.narrow ? narrowLift(T) : 0) - 0.26 * spaceNow + look.y * 0.012, 0);
    rig.scale = rig.fit * zoom(T) * (rig.narrow ? narrowZoom(T) : 1) * zoomOut;
    // the middle of the room, floor to ceiling
    rig.pivot.set(0, pivotY(T) - 0.98 * spaceNow, 0);
    // the specimen rows are keyed at the desktop spacing; stretch the pivot to wherever they hang now
    rig.pivot.y += (rig.pivot.y - row(0)) * (rig.rowGap / ROW_GAP - 1) * rig.drawer;
    const scripted = drop(T);
    rig.drop = scripted + (heightNow * RACK_DROP - scripted) * wControl;
  }
  rig.uvReady = 1 - seg(rig.drop, 0.001, 0.01);

  /* ---------- parts ---------- */
  rig.attach = seg(p, BEATS.attachStart, BEATS.attachEnd);
  rig.useKit = T > 1.0005;
  rig.explode = explode(T);
  rig.labels = seg(rig.explode, 0.7, 1);
  rig.drawer = drawer(T);
  rig.drawerLift = rig.narrow ? 0.8 * rig.drawer : 0;
  rig.swing = swing(T);
  rig.poleDim = poleDim(T) * (rig.narrow ? 0 : 1);
  // the ceiling-to-rail dimension: while the hero lowers, and whenever the panel has the rack away from the ceiling
  const away = seg(rig.drop, 0.04, 0.14);
  rig.measure = T <= 1 ? seg(p, BEATS.lowerStart + 0.03, BEATS.lowerStart + 0.1) * away : away * Math.max(1 - seg(T, 1.0, 1.06), wControl);

  if (building) {
    rig.slots = b.slots;
    rig.count = b.slots.length;
    rig.frame = b.frame;
    rig.features = b.features;
  } else {
    rig.slots = T < 1.07 ? HERO_SLOTS : SCRIPTED_SLOTS;
    rig.count = T < 1.86 ? 3 : T < 1.9 ? 2 : T < 1.95 ? 3 : 4;
    // Max takes three modules at most, so the four-slot frame is a Plus
    rig.frame = rig.count > 3 ? "plus" : "max";
    rig.features = SCRIPTED_FEATURES;
  }

  const showGarments = wControl > 0.5 ? scheduleGarments || control.get().driver === "you" : true;
  for (let i = 0; i < 4; i++) rig.garments[i] = showGarments ? garment[i](T) : 0;

  /* ---------- care ---------- */
  rig.fan = Math.max(fan(T), flowNow);
  rig.air = Math.max(air(T), flowNow * 0.9);
  // scrolling harder spins the fan harder
  const gustGoal = 1 + Math.min(2.2, Math.abs(stage.velocity) * 0.9) * (rig.fan > 0.01 ? 1 : 0) * calm;
  rig.gust += (gustGoal - rig.gust) * Math.min(1, dt * 2.5);
  rig.fanAngle += dt * rig.fan * rig.gust * 14;
  // the louvre sweeps the stream from row to row, slowly enough to follow with the eye
  rig.swingAngle = Math.sin(t * 0.9) * 0.55 * rig.fan * calm;
  rig.damp = damp(T);
  rig.humidity = Math.round(41 + 45 * rig.damp);
  rig.uv = Math.max(uv(T), uvNow) * rig.uvReady;
  rig.sweep = T < 3.05 ? sweep(T) : (t * 0.12) % 1;
  rig.light = lightNow;
  rig.heat = heatNow;
  rig.lightsOut = lightsOut(T);
  rig.power = 1 - seg(T, 4.86, 4.97);

  /* ---------- backdrop ---------- */
  const bd = rig.backdrop;
  bd.paper = paper(T);
  bd.black = rig.lightsOut;
  bd.plateScale = 1 + 0.06 * p;
  bd.dim = T <= 1 ? 0.3 * p : veil(T);
  bd.rain = rainCare(T);
  bd.night = wBuild;
  bd.morning = 0;
  bd.dusk = duskHero(T);
  if (wControl > 0.5 && qControl >= DAY.start - 0.02) {
    const hour = hourAt(qControl);
    // morning → storm → dusk → night, each dissolving into the next
    const stormIn = seg(hour, 12, 13.5);
    const duskIn = seg(hour, 16.2, 17.8);
    const nightIn = seg(hour, 19.5, 21);
    bd.morning = 1;
    bd.rain = stormIn;
    bd.dusk = duskIn;
    bd.night = Math.max(nightIn, wBuild);
    bd.dim = 0.1 + 0.2 * nightIn;
  } else if (wControl > 0.5) {
    bd.dusk = 1;
  }
  return rig;
}
