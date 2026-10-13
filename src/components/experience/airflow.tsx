"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { rig } from "./rig";
import { stage } from "./stage";

/** Streaks of air, each a short ribbon that follows the stream from the outlet down through the rows. */
const COUNT = 240;
/** Segments per streak. */
const SEG = 10;

const vertexShader = /* glsl */ `
  attribute vec4 aSeed;
  attribute float aK;
  attribute float aSide;
  uniform float uFlow;
  uniform float uAmount;
  uniform float uWidth;
  uniform float uLen;
  uniform float uSwing;
  uniform vec2 uHalfRes;
  uniform vec3 uPointer;
  varying float vAlpha;
  varying float vSide;

  // where a parcel of air is after falling t of the way: out of the outlet,
  // spreading as it goes, leaning with the louvre, parting around the cursor
  vec3 path(float t) {
    vec3 p = vec3((aSeed.z - 0.5) * 1.0, -0.12 - t * 1.6, (aSeed.w - 0.5) * 0.46);
    p.x += sin(t * 6.0 + aSeed.y * 20.0) * 0.03 * t;
    p.z += cos(t * 5.0 + aSeed.x * 20.0) * 0.03 * t;
    p.xz *= 1.0 + t * 0.25;
    p.z += sin(uSwing) * t * 1.4;
    vec2 away = p.xy - uPointer.xy;
    float push = smoothstep(0.32, 0.0, length(away));
    p.xy += normalize(away + 1e-4) * push * 0.16;
    return p;
  }

  void main() {
    float head = fract(aSeed.x + uFlow * (0.3 + 0.4 * aSeed.y));
    float t = head - aK * uLen;
    float t0 = max(t, 0.0);
    vec3 p0 = path(t0);
    vec3 p1 = path(t0 + 0.01);
    vec4 c0 = projectionMatrix * modelViewMatrix * vec4(p0, 1.0);
    vec4 c1 = projectionMatrix * modelViewMatrix * vec4(p1, 1.0);
    // widen the ribbon on screen, perpendicular to where it is heading
    vec2 s0 = c0.xy / c0.w * uHalfRes;
    vec2 s1 = c1.xy / c1.w * uHalfRes;
    vec2 dir = s1 - s0;
    float len = length(dir);
    dir = len > 1e-4 ? dir / len : vec2(0.0, 1.0);
    vec2 n = vec2(-dir.y, dir.x);
    float w = uWidth * (0.3 + 0.7 * (1.0 - aK));
    c0.xy += n * aSide * w / uHalfRes * c0.w;
    gl_Position = c0;
    float vis = smoothstep(0.0, 0.08, t) * smoothstep(1.0, 0.55, head);
    vAlpha = vis * pow(1.0 - aK, 1.4) * uAmount * (0.45 + 0.55 * aSeed.y);
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

/** Flow's air, drawn as blue streamlines sweeping down through the rack; warm once heating is on. */
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
      uLen: { value: 0.12 },
      uSwing: { value: 0 },
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
    u.uFlow.value = flow.current;
    u.uAmount.value = r.air * (0.6 + 0.2 * Math.min(2, r.gust));
    u.uWidth.value = 1.6 + 1.2 * Math.min(1.4, r.scale);
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
