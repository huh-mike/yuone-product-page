"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Suspense, useRef } from "react";
import * as THREE from "three";
import { CAMERA, rig } from "./rig";
import { sfx } from "./sound";
import { Unit } from "./unit";

type Props = { onReady?: () => void };

/**
 * Lighting follows the room plate: a warm dusk window on the right, amber cove
 * light rising from below, and a cool soft ceiling fill so the white shell
 * stays clean instead of turning orange. The rig turns it all down for the
 * lights-out beats and evens it out on the drawing-board backdrop.
 */
function Lights() {
  const key = useRef<THREE.DirectionalLight>(null);
  const cove = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);
  const ambient = useRef<THREE.AmbientLight>(null);

  useFrame((state) => {
    const r = rig;
    const on = 1 - 0.97 * r.lightsOut;
    const paper = r.backdrop.paper;
    state.scene.environmentIntensity = on * (1 + 0.25 * paper);
    if (key.current) key.current.intensity = 1.3 * on;
    // the coral cove glow belongs to the room, not the drawing board
    if (cove.current) cove.current.intensity = 0.45 * on * (1 - paper);
    if (fill.current) fill.current.intensity = (1.1 + 0.5 * paper) * on;
    if (ambient.current) ambient.current.intensity = (0.18 + 0.25 * paper) * on;

    sfx.mix({ rain: r.backdrop.rain * (1 - r.backdrop.black), fan: r.fan, gust: r.gust - 1, uv: r.uv, motor: r.travel * 4 });
  });

  return (
    <>
      <directionalLight ref={key} position={[3, 1.4, 2]} intensity={1.3} color="#ffd6b8" />
      <directionalLight ref={cove} position={[-2.2, -1.2, 1.6]} intensity={0.45} color="#f0765a" />
      <directionalLight ref={fill} position={[-1, 2.5, 2]} intensity={1.1} color="#dfe6f2" />
      <ambientLight ref={ambient} intensity={0.18} color="#98a6bc" />
    </>
  );
}

export function Scene({ onReady }: Props) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: CAMERA.position, fov: CAMERA.fov, near: 0.1, far: 30 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      style={{ background: "transparent" }}
    >
      <Suspense fallback={null}>
        <Unit onReady={onReady} />

        <Environment resolution={256} frames={1}>
          {/* dusk window, camera-right */}
          <Lightformer
            form="rect"
            intensity={2.6}
            color="#ffcfae"
            position={[3.2, 0.4, 1.2]}
            rotation-y={-Math.PI / 2}
            scale={[3.5, 2.2, 1]}
          />
          {/* cool ceiling bounce */}
          <Lightformer
            form="rect"
            intensity={0.9}
            color="#a9b8d2"
            position={[0, 3, 0]}
            rotation-x={Math.PI / 2}
            scale={[5, 5, 1]}
          />
          {/* amber cove glow from the floor/left */}
          <Lightformer form="ring" intensity={1.6} color="#f0765a" position={[-2.4, -2.2, 1]} scale={2.4} />
          {/* thin rim behind, so the pole silhouettes separate from the ceiling */}
          <Lightformer form="rect" intensity={1.2} color="#ffd8b8" position={[0, 0.6, -3]} scale={[4, 0.6, 1]} />
        </Environment>

        <Lights />
      </Suspense>
    </Canvas>
  );
}
