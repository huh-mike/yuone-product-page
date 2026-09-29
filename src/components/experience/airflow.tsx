"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { rig } from "./rig";
import { stage } from "./stage";

const COUNT = 1500;

const vertexShader = /* glsl */ `
  attribute vec4 aSeed;
  uniform float uFlow;
  uniform float uAmount;
  uniform float uSize;
  uniform vec3 uPointer;
  varying float vAlpha;

  void main() {
    // each mote falls from the outlet to well below the laundry, then starts over
    float t = fract(aSeed.x + uFlow * (0.3 + 0.4 * aSeed.y));
    vec3 p = vec3((aSeed.z - 0.5) * 1.1, -0.1 - t * 1.55, (aSeed.w - 0.5) * 0.56);
    p.x += sin(t * 6.0 + aSeed.y * 20.0) * 0.035 * t;
    p.z += cos(t * 5.0 + aSeed.x * 20.0) * 0.035 * t;
    p.xz *= 1.0 + t * 0.3;

    // the cursor parts the stream
    vec2 away = p.xy - uPointer.xy;
    float push = smoothstep(0.32, 0.0, length(away));
    p.xy += normalize(away + 1e-4) * push * 0.16;

    vAlpha = smoothstep(0.0, 0.1, t) * smoothstep(1.0, 0.55, t) * uAmount * (0.3 + 0.7 * aSeed.y);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.5 + aSeed.x) / -mv.z;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    // a soft mote, slightly taller than wide so it reads as falling
    float a = smoothstep(0.5, 0.0, length(c * vec2(2.4, 1.0)));
    gl_FragColor = vec4(uColor, a * vAlpha);
  }
`;

/** Flow's air, drawn as motes streaming down through the rack. */
export function Airflow() {
  const points = useRef<THREE.Points>(null);
  const flow = useRef(0);
  const pointer = useRef(new THREE.Vector3(9, 9, 9));

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const seeds = new Float32Array(COUNT * 4);
    // fixed pseudo-random sequence: the same stream on the server, the client and every visit
    let s = 1234567;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    for (let i = 0; i < seeds.length; i++) seeds[i] = rand();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -0.8, 0), 2);
    return g;
  }, []);

  const uniforms = useMemo(
    () => ({
      uFlow: { value: 0 },
      uAmount: { value: 0 },
      uSize: { value: 30 },
      uPointer: { value: new THREE.Vector3(9, 9, 9) },
      uColor: { value: new THREE.Color("#ffd9bd") },
    }),
    [],
  );

  useFrame((state, dt) => {
    const mesh = points.current;
    if (!mesh) return;
    const r = rig;
    mesh.visible = r.air > 0.01 && !r.reducedMotion;
    if (!mesh.visible) return;

    flow.current += dt * 0.55 * r.gust;
    const mat = mesh.material as THREE.ShaderMaterial;
    mat.uniforms.uFlow.value = flow.current;
    mat.uniforms.uAmount.value = r.air * (0.55 + 0.2 * Math.min(2, r.gust));
    mat.uniforms.uSize.value = 26 * state.viewport.dpr * r.scale;

    // where the cursor is, in the unit's own space
    pointer.current.set(
      (stage.pointer.x * state.viewport.width) / 2,
      state.camera.position.y - (stage.pointer.y * state.viewport.height) / 2,
      0,
    );
    mesh.worldToLocal(pointer.current);
    (mat.uniforms.uPointer.value as THREE.Vector3).copy(pointer.current);
  });

  return (
    <points ref={points} geometry={geometry} visible={false} renderOrder={5}>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
