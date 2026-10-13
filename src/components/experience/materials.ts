import * as THREE from "three";

/**
 * The exported models carry placeholder materials named by role. Both the
 * hero model and the parts kit are restyled from those names into one shared
 * set, so a part from either file looks the same and the emissive ones can be
 * driven from a single place.
 */

const cache = new Map<string, THREE.Material>();

function create(name: string): THREE.Material | null {
  switch (name) {
    case "Shell":
    case "ShellUnder":
      // satin black housing, top and underside alike
      return new THREE.MeshPhysicalMaterial({
        color: "#16171b",
        roughness: 0.42,
        metalness: 0.15,
        clearcoat: 0.3,
        clearcoatRoughness: 0.4,
        envMapIntensity: 0.9,
      });
    case "Panel":
      // the light ring under the shell: frosted acrylic (磨砂), milky white, never reflects
      // and nothing shows through it; it is itself the lamp. Opaque on purpose: the scattered
      // light inside the acrylic is the faint glow it keeps when off (PANEL_IDLE_GLOW).
      return new THREE.MeshPhysicalMaterial({
        color: "#f2f0eb",
        roughness: 1,
        metalness: 0,
        specularIntensity: 0,
        envMapIntensity: 0.8,
        emissive: new THREE.Color("#ffe2bf"),
        emissiveIntensity: 0,
      });
    case "Logo":
      // the yuhome marks: a gloss finish, tone on tone against the satin black
      return new THREE.MeshPhysicalMaterial({
        color: "#3a3b41",
        roughness: 0.12,
        metalness: 0.85,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        envMapIntensity: 1.4,
      });
    case "Poles":
      // gunmetal
      return new THREE.MeshStandardMaterial({ color: "#2b2d34", roughness: 0.34, metalness: 0.7, envMapIntensity: 1.2 });
    case "Clip":
    case "Fan":
    case "Dark":
      return new THREE.MeshStandardMaterial({ color: "#1c1d22", roughness: 0.5, metalness: 0.3 });
    case "AccentLED":
      return new THREE.MeshStandardMaterial({
        color: "#ff9a70",
        emissive: new THREE.Color("#ff6a3d"),
        emissiveIntensity: 2.6,
        roughness: 0.4,
      });
    case "UVLED":
      return new THREE.MeshStandardMaterial({
        color: "#b08cff",
        emissive: new THREE.Color("#7a3dff"),
        emissiveIntensity: 2.2,
        roughness: 0.3,
      });
    default:
      return null;
  }
}

/** The parts kit prefixes its material names with "K_". */
const roleOf = (name: string) => name.replace(/^K_/, "");

export function materialFor(src: THREE.Material): THREE.Material {
  const role = roleOf(src.name);
  let mat = cache.get(role);
  if (!mat) {
    mat = create(role) ?? src;
    cache.set(role, mat);
  }
  return mat;
}

/** Swap every mesh material in `root` for its shared, restyled counterpart. */
export function restyle(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(materialFor) : materialFor(mesh.material);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  });
  return root;
}

const standard = (role: string) => {
  const mat = cache.get(role) ?? create(role)!;
  cache.set(role, mat);
  return mat as THREE.MeshStandardMaterial;
};

/** The three materials that light up. */
export const glow = {
  flow: () => standard("AccentLED"),
  uv: () => standard("UVLED"),
  panel: () => standard("Panel"),
};

export const HERO_FLOW_GLOW = 2.6;
export const HERO_UV_GLOW = 2.2;
/** Light the frosted panel scatters even when it is off, so it reads as acrylic, not paint. */
export const PANEL_IDLE_GLOW = 0.06;
