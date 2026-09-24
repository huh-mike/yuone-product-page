"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";

export const MODEL_URL = "/models/yu-one.glb";
const DRACO_PATH = "/draco/";

useGLTF.preload(MODEL_URL, DRACO_PATH);

/**
 * Scroll story beats, as fractions of the pinned section.
 *   attach: the baked Blender clip — modules drop away, then click in one by one
 *   spin:   a slow half turn that runs underneath the whole story
 *   lower:  the finished rack descends toward the viewer
 */
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
const SPIN_TURNS = 0.5; // half a revolution across the whole scroll, never more
const RACK_DROP = 0.24; // metres the rack lowers in the final beat
const REST_Y = 0.3; // hang point below the top of the frame
const INTRO_SECONDS = 1.6; // entrance ease on first paint

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const seg = (p: number, a: number, b: number) => THREE.MathUtils.clamp((p - a) / (b - a), 0, 1);

/**
 * Restyle the exported placeholder materials into the hero's finish:
 * satin-white shell, gunmetal poles, warm accent LED, violet UV strip.
 */
function buildMaterial(name: string, src: THREE.Material): THREE.Material {
  switch (name) {
    case "Shell":
      return new THREE.MeshPhysicalMaterial({
        color: "#f1eee8",
        roughness: 0.38,
        metalness: 0,
        clearcoat: 0.35,
        clearcoatRoughness: 0.35,
        envMapIntensity: 0.7,
      });
    case "ShellUnder":
      return new THREE.MeshStandardMaterial({ color: "#14151a", roughness: 0.6, metalness: 0.15 });
    case "Poles":
      return new THREE.MeshStandardMaterial({ color: "#17181c", roughness: 0.32, metalness: 0.78, envMapIntensity: 1.3 });
    case "Clip":
    case "Fan":
    case "Dark":
      return new THREE.MeshStandardMaterial({ color: "#101114", roughness: 0.5, metalness: 0.3 });
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
      return src;
  }
}

function restyleClone(scene: THREE.Object3D): THREE.Object3D {
  const model = scene.clone(true);
  const cache = new Map<string, THREE.Material>();
  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const restyled = mats.map((m) => {
      let mat = cache.get(m.name);
      if (!mat) {
        mat = buildMaterial(m.name, m);
        cache.set(m.name, mat);
      }
      return mat;
    });
    mesh.material = Array.isArray(mesh.material) ? restyled : restyled[0];
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  });
  return model;
}

type Rig = {
  mixer: THREE.AnimationMixer;
  actions: THREE.AnimationAction[];
  duration: number;
  rack: THREE.Object3D | null;
};

/**
 * The Blender rig gives us a `Rack` node holding the frame and the three
 * `Module_n` empties, plus one baked clip per module (detach, then click in).
 * All clips share a timeline, so we scrub them together.
 */
function createRig(model: THREE.Object3D, animations: THREE.AnimationClip[]): Rig {
  const mixer = new THREE.AnimationMixer(model);
  const actions = animations.map((clip) => {
    const action = mixer.clipAction(clip);
    action.play();
    action.paused = true; // scrubbed by hand from scroll progress
    return action;
  });
  const duration = animations.reduce((m, c) => Math.max(m, c.duration), 0);
  return { mixer, actions, duration, rack: model.getObjectByName("Rack") ?? null };
}

export type Pointer = { x: number; y: number };

type Props = {
  progress: RefObject<number>;
  /** Normalised cursor position, -1..1 on both axes, written by the page. */
  pointer: RefObject<Pointer>;
  onReady?: () => void;
};

export function YuOneModel({ progress, pointer, onReady }: Props) {
  const { scene, animations } = useGLTF(MODEL_URL, DRACO_PATH);
  const { viewport } = useThree();

  // Fit: the unit is ~1.18 m wide. Capped on wide screens, ~80% of the width on phones.
  const fit = Math.min(0.82, viewport.width / 1.45);

  const root = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const smoothed = useRef(0);
  const look = useRef<Pointer>({ x: 0, y: 0 });
  const introStart = useRef<number | null>(null);

  // model is decoded and mounted: let the page start its entrance
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  /** Own copy of the scene (the loader's is cached and shared), restyled by material name. */
  const model = useMemo(() => restyleClone(scene), [scene]);

  // The rig (mixer, actions, rack node) is mutated every frame, so it lives in
  // a ref and is created lazily inside the frame loop, never during render.
  const rigRef = useRef<Rig | null>(null);
  useEffect(
    () => () => {
      rigRef.current?.mixer.stopAllAction();
      rigRef.current = null;
    },
    [],
  );

  useFrame((state, dt) => {
    // damp toward the scroll progress so wheel steps feel like weight, not ticks
    const goal = progress.current ?? 0;
    smoothed.current += (goal - smoothed.current) * Math.min(1, dt * 5.5);
    const p = smoothed.current;
    const t = state.clock.elapsedTime;

    // one-time entrance: settle up into place and swing into the rest pose
    if (introStart.current === null) introStart.current = t;
    const intro = easeOut(Math.min(1, (t - introStart.current) / INTRO_SECONDS));

    // cursor follow: ease toward the pointer so the unit turns to look, not snap
    const target = pointer.current ?? { x: 0, y: 0 };
    const k = Math.min(1, dt * 3);
    look.current.x += (target.x - look.current.x) * k;
    look.current.y += (target.y - look.current.y) * k;

    if (spin.current) {
      const turn = easeInOut(seg(p, BEATS.spinStart, BEATS.spinEnd));
      const settle = (1 - intro) * -0.35; // arrives from a slightly different angle
      spin.current.rotation.y =
        REST_YAW +
        settle +
        turn * Math.PI * 2 * SPIN_TURNS +
        look.current.x * 0.16 +
        Math.sin(t * 0.35) * 0.015;
      // tip further up while the modules attach so the underside is the stage
      const attachPhase = Math.sin(seg(p, BEATS.attachStart, BEATS.attachEnd) * Math.PI);
      spin.current.rotation.x =
        REST_PITCH - Math.sin(turn * Math.PI) * 0.06 - attachPhase * 0.12 - look.current.y * 0.07;
      spin.current.rotation.z = Math.sin(t * 0.27) * 0.006 + look.current.x * 0.02;
    }

    // scrub the baked Blender clip: modules detach, then click in one by one
    const { actions, duration, mixer, rack } = (rigRef.current ??= createRig(model, animations));
    if (actions.length) {
      const time = seg(p, BEATS.attachStart, BEATS.attachEnd) * (duration - 1e-4);
      for (const action of actions) action.time = time;
      mixer.update(0);
    }

    const drop = easeInOut(seg(p, BEATS.lowerStart, BEATS.lowerEnd));
    if (rack) rack.position.y = -RACK_DROP * drop;

    if (root.current) {
      // as the rack comes down, ease the whole unit up and back so the
      // closing copy has clear floor beneath it
      root.current.position.y = REST_Y + 0.16 * drop - 0.06 * (1 - intro) + look.current.y * 0.015;
      root.current.position.x = look.current.x * 0.03;
      const s = fit * (1 - 0.14 * drop) * (0.96 + 0.04 * intro);
      root.current.scale.setScalar(s);
    }
  });

  return (
    <group ref={root} position={[0, REST_Y, 0]} scale={fit}>
      <group ref={spin}>
        <primitive object={model} />
      </group>
    </group>
  );
}
