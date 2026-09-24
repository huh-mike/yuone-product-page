"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Suspense, type RefObject } from "react";
import * as THREE from "three";
import { YuOneModel, type Pointer } from "./yu-one-model";

type Props = { progress: RefObject<number>; pointer: RefObject<Pointer>; onReady?: () => void };

/**
 * Lighting follows the room plate: a warm dusk window on the right, amber cove
 * light rising from below, and a cool soft ceiling fill so the white shell
 * stays clean instead of turning orange.
 */
export function HeroScene({ progress, pointer, onReady }: Props) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, -0.18, 2.6], fov: 30, near: 0.1, far: 30 }}
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
        <YuOneModel progress={progress} pointer={pointer} onReady={onReady} />

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

        <directionalLight position={[3, 1.4, 2]} intensity={1.3} color="#ffd6b8" />
        <directionalLight position={[-2.2, -1.2, 1.6]} intensity={0.45} color="#f0765a" />
        <directionalLight position={[-1, 2.5, 2]} intensity={1.1} color="#dfe6f2" />
        <ambientLight intensity={0.18} color="#98a6bc" />
      </Suspense>
    </Canvas>
  );
}
