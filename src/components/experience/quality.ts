import { render, type RenderMode } from "./stage";

/**
 * Pixel densities the canvas steps down through when frames run slow. The
 * first is the most a screen gets; the last is below 1x on purpose, for
 * integrated graphics on high-resolution laptop screens.
 */
export const DPR_STEPS = [1.75, 1.5, 1.25, 1, 0.75];

/** The first step no denser than this screen. */
export function initialDprStep() {
  const native = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const i = DPR_STEPS.findIndex((d) => d <= native + 0.01);
  return i === -1 ? DPR_STEPS.length - 1 : i;
}

const KEY = "yu-render";

const read = () => {
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
};
const write = (value: string) => {
  try {
    window.sessionStorage.setItem(KEY, value);
  } catch {
    // storage blocked: the choice lasts for this page view only
  }
};

/** The visitor asked for live 3D: never fall back to stills on our own. */
export const liveForced = () => read() === "live" || new URLSearchParams(window.location.search).get("3d") === "1";

/** Software renderers draw the unit at a few frames a second. */
const SOFTWARE = /swiftshader|llvmpipe|softpipe|basic render|software/i;

/**
 * Decide before loading anything: stills when WebGL is missing or the browser
 * says it would draw in software, live otherwise. `?3d=0` / `?3d=1` force a
 * mode, and a choice already made this session sticks.
 */
export function chooseMode(): Exclude<RenderMode, "probing"> {
  const asked = new URLSearchParams(window.location.search).get("3d");
  if (asked === "1") return "live";
  if (asked === "0") return "stills";
  const remembered = read();
  if (remembered === "live" || remembered === "stills") return remembered;

  const canvas = document.createElement("canvas");
  // fails where the browser could only draw in software or the driver is blocklisted
  const options: WebGLContextAttributes = { failIfMajorPerformanceCaveat: true };
  const fast = canvas.getContext("webgl2", options) ?? canvas.getContext("webgl", options);
  if (!fast) return "stills";
  const info = fast.getExtension("WEBGL_debug_renderer_info");
  const renderer = info ? String(fast.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
  fast.getExtension("WEBGL_lose_context")?.loseContext();
  return SOFTWARE.test(renderer) ? "stills" : "live";
}

/** Switch to stills for the rest of the session: the live canvas could not keep up. */
export function fallBackToStills() {
  if (liveForced()) return;
  write("stills");
  render.set({ mode: "stills" });
}

/** The visitor turned live 3D back on from the stills view. */
export function forceLive() {
  write("live");
  render.set({ mode: "live" });
}
