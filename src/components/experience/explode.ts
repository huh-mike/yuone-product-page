/** How far each part travels in the exploded view, metres along the unit's height. */
export const EXPLODE = {
  shell: 0.36,
  plate: 0.19,
  panel: 0.04,
  flow: -0.2,
  uv: -0.34,
  /** Frame and everything hanging from it. */
  rack: -0.62,
  /** Modules, on top of the rack's own travel. */
  modules: -0.22,
};
