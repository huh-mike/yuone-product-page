"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { rig } from "./rig";
import { stage } from "./stage";

/** Ribbons of air, each a long streak leaving the outlet and sweeping down through the rows. */
const COUNT = 160;
/** Segments per ribbon. */
const SEG = 28;
/** Length of a ribbon, as a share of the whole fall. */
const LEN = 0.5;
/**
 * Where the louvre pointed, kept for as long as air takes to fall the whole way:
 * one sample every HIST_STEP of flow, newest first. Air keeps the direction it
 * left in, so swinging the louvre bends only the air still to come out.
 */
const HIST = 64;
/** The slowest parcel covers the fall in 1 / 0.3 units of flow. */
const HIST_STEP = 3.6 / (HIST - 1);

const vertexShader = /* glsl */ `
  attribute vec4 aSeed;
  attribute float aK;
  attribute float aSide;
  uniform float uFlow;
  uniform float uAmount;
  uniform float uWidth;
  uniform float uLen;
  uniform float uSwing;
  uniform float uHist[${HIST}];
  uniform float uHistBase;
  uniform vec2 uHalfRes;
  uniform vec3 uPointer;
  varying float vAlpha;
  varying float vSide;

  // the louvre angle when air that has travelled for 'age' (units of flow) left the outlet
  float swingAt(float age) {
    float emitted = uFlow - age;
    if (emitted >= uHistBase) {
      return mix(uSwing, uHist[0], clamp(age / max(uFlow - uHistBase, 1e-4), 0.0, 1.0));
    }
    float x = (uHistBase - emitted) / ${HIST_STEP.toFixed(6)};
    float i = min(floor(x), ${(HIST - 2).toFixed(1)});
    int j = int(i);
    return mix(uHist[j], uHist[j + 1], clamp(x - i, 0.0, 1.0));
  }

  // where a parcel of air is after falling t of the way, if it left the outlet with the
  // louvre at angle a: from the fan's downward face, along the louvre, spreading as it slows
  vec3 path(float t, float a) {
    // the outlet: Flow's underside, 0.48 m by 0.09 m, 14.5 cm below the top of the base
    vec3 p = vec3((aSeed.z - 0.5) * 0.48, -0.145, (aSeed.w - 0.5) * 0.09);
    float d = t * 1.6;
    // the louvre turns the jet by about half its own angle, so the sweep spans the rack's rows
    float lean = a * 0.55;
    p += vec3(0.0, -cos(lean), sin(lean)) * d;
    p.x += (aSeed.z - 0.5) * 0.4 * d;
    p.z += (aSeed.w - 0.5) * 0.3 * d;
    p.x += sin(d * 3.2 + aSeed.y * 20.0) * 0.03 * t;
    p.z += cos(d * 2.7 + aSeed.x * 20.0) * 0.03 * t;
    // the cursor parts the stream wherever the air is now
    vec2 away = p.xy - uPointer.xy;
    float push = smoothstep(0.32, 0.0, length(away));
    p.xy += normalize(away + 1e-4) * push * 0.16;
    return p;
  }

  void main() {
    // the ribbon is a streak line: its head is the oldest parcel, every point behind it
    // left the outlet a little later, and each keeps the direction it left in
    float speed = 0.3 + 0.4 * aSeed.y;
    float span = 1.0 + uLen;
    float head = fract(aSeed.x + uFlow * speed / span) * span;
    float t = head - aK * uLen;
    float t0 = clamp(t, 0.0, 1.0);
    float tn = clamp(t - 0.01, 0.0, 1.0);
    vec3 p0 = path(t0, swingAt(t0 / speed));
    vec3 pn = path(tn, swingAt(tn / speed));
    vec4 c0 = projectionMatrix * modelViewMatrix * vec4(p0, 1.0);
    vec4 cn = projectionMatrix * modelViewMatrix * vec4(pn, 1.0);
    // widen the ribbon on screen, across its own length
    vec2 dir = c0.xy / c0.w * uHalfRes - cn.xy / cn.w * uHalfRes;
    float len = length(dir);
    dir = len > 1e-4 ? dir / len : vec2(0.0, -1.0);
    vec2 n = vec2(-dir.y, dir.x);
    float w = uWidth * (0.45 + 0.55 * (1.0 - aK));
    c0.xy += n * aSide * w / uHalfRes * c0.w;
    gl_Position = c0;
    // born at the outlet, gone by the floor; the far end of each ribbon thins out
    float vis = smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.5, 1.0, t)) * step(t, 1.0);
    vAlpha = vis * pow(1.0 - aK, 0.7) * uAmount * (0.3 + 0.4 * aSeed.y);
    vSide = aSide;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uWarm;
  uniform float uHeat;
  varying float vAlpha;
  varying float vSide;

  void main() {
    float edge = 1.0 - vSide * vSide;
    gl_FragColor = vec4(mix(uColor, uWarm, uHeat), vAlpha * edge);
  }
`;

/** Flow's air, drawn as long blue streaks leaving the outlet and sweeping down through the rack; warm once heating is on. */
export function Airflow() {
  const mesh = useRef<THREE.Mesh>(null);
  const flow = useRef(0);
  const pointer = useRef(new THREE.Vector3(9, 9, 9));

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const verts = COUNT * (SEG + 1) * 2;
    const seeds = new Float32Array(verts * 4);
    const ks = new Float32Array(verts);
    const sides = new Float32Array(verts);
    const index = new Uint32Array(COUNT * SEG * 6);
    // fixed pseudo-random sequence: the same stream on the server, the client and every visit
    let s = 1234567;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    let v = 0;
    let ix = 0;
    for (let i = 0; i < COUNT; i++) {
      const seed = [rand(), rand(), rand(), rand()];
      const base = v;
      for (let k = 0; k <= SEG; k++) {
        for (const side of [-1, 1]) {
          seeds.set(seed, v * 4);
          ks[v] = k / SEG;
          sides[v] = side;
          v++;
        }
      }
      for (let k = 0; k < SEG; k++) {
        const a = base + k * 2;
        index.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], ix);
        ix += 6;
      }
    }
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
    g.setAttribute("aK", new THREE.BufferAttribute(ks, 1));
    g.setAttribute("aSide", new THREE.BufferAttribute(sides, 1));
    g.setIndex(new THREE.BufferAttribute(index, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -0.9, 0), 2.2);
    return g;
  }, []);

  const uniforms = useMemo(
    () => ({
      uFlow: { value: 0 },
      uAmount: { value: 0 },
      uWidth: { value: 2 },
      uLen: { value: LEN },
      uSwing: { value: 0 },
      uHist: { value: new Float32Array(HIST) },
      uHistBase: { value: 0 },
      uHalfRes: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: new THREE.Vector3(9, 9, 9) },
      uColor: { value: new THREE.Color("#8fd3ff") },
      uWarm: { value: new THREE.Color("#ffb285") },
      uHeat: { value: 0 },
    }),
    [],
  );

  useFrame((state, dt) => {
    const m = mesh.current;
    if (!m) return;
    const r = rig;
    m.visible = r.air > 0.01 && !r.reducedMotion;
    if (!m.visible) return;

    flow.current += dt * 0.55 * r.gust;
    const u = (m.material as THREE.ShaderMaterial).uniforms;
    // record the louvre angle as the air leaves, newest first
    const hist = u.uHist.value as Float32Array;
    while (flow.current - u.uHistBase.value >= HIST_STEP) {
      u.uHistBase.value += HIST_STEP;
      hist.copyWithin(1, 0, HIST - 1);
      hist[0] = r.swingAngle;
    }
    u.uFlow.value = flow.current;
    u.uAmount.value = r.air * (0.6 + 0.2 * Math.min(2, r.gust));
    u.uWidth.value = 1.4 + 1.1 * Math.min(1.4, r.scale);
    u.uSwing.value = r.swingAngle;
    u.uHeat.value = r.heat;
    (u.uHalfRes.value as THREE.Vector2).set(state.size.width / 2, state.size.height / 2);

    // where the cursor is, in the unit's own space
    pointer.current.set(
      (stage.pointer.x * state.viewport.width) / 2,
      state.camera.position.y - (stage.pointer.y * state.viewport.height) / 2,
      0,
    );
    m.worldToLocal(pointer.current);
    (u.uPointer.value as THREE.Vector3).copy(pointer.current);
  });

  return (
    <mesh ref={mesh} geometry={geometry} visible={false} renderOrder={5} frustumCulled={false}>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
