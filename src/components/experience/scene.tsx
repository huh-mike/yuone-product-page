"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Suspense, useRef, useState } from "react";
import * as THREE from "three";
import { DPR_STEPS, fallBackToStills, initialDprStep } from "./quality";
import { CAMERA, rig } from "./rig";
import { sfx } from "./sound";
import { stage } from "./stage";
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
    state.scene.environmentIntensity = on * (1.25 + 0.2 * paper);
    if (key.current) key.current.intensity = 1.7 * on;
    // the coral cove glow belongs to the room, not the drawing board
    if (cove.current) cove.current.intensity = 0.5 * on * (1 - paper);
    if (fill.current) fill.current.intensity = (1.6 + 0.4 * paper) * on;
    if (ambient.current) ambient.current.intensity = (0.36 + 0.2 * paper) * on;

    sfx.mix({ rain: r.backdrop.rain * (1 - r.backdrop.black), fan: r.fan, gust: r.gust - 1, uv: r.uv, motor: r.travel * 4 });
  });

  return (
    <>
      <directionalLight ref={key} position={[3, 1.4, 2]} intensity={1.7} color="#ffd6b8" />
      <directionalLight ref={cove} position={[-2.2, -1.2, 1.6]} intensity={0.5} color="#f0765a" />
      <directionalLight ref={fill} position={[-1, 2.5, 2]} intensity={1.6} color="#dfe6f2" />
      <ambientLight ref={ambient} intensity={0.36} color="#aab6c8" />
    </>
  );
}

/** Frames per second the canvas aims for before it trades sharpness away. */
const TARGET_FPS = 40;
/** Below this at the lowest density, the page shows stills instead. */
const FLOOR_FPS = 15;
/** Seconds of frames judged at a time. */
const WINDOW = 1.5;

/**
 * Watches how fast frames actually come and steps the pixel density down when
 * they are slow: integrated graphics on a high-resolution screen spend most of
 * their time on pixels. It never steps back up, so it cannot flicker between
 * two densities; the one exception is a step that brought no more frames,
 * which is undone before it stops for good: the frame rate is capped there
 * (battery saver holds Chrome at 30 fps), not held back by pixels. If even the
 * lowest density is far too slow, the page switches to stills (quality.ts).
 */
function AdaptiveQuality({ step: first }: { step: number }) {
  const setDpr = useThree((s) => s.setDpr);
  const m = useRef({ step: first, warm: 0, frames: [] as number[], elapsed: 0, slow: 0, judged: 0, before: 0, settled: false });

  useFrame((_, dt) => {
    const q = m.current;
    // judge only real, visible frames: not the load, a hidden tab or a stall
    if (!stage.ready || document.hidden || dt > 1) {
      q.frames.length = 0;
      q.elapsed = 0;
      return;
    }
    // the first second after load compiles shaders and decodes textures
    if (q.warm < 1) {
      q.warm += dt;
      return;
    }
    q.frames.push(dt);
    q.elapsed += dt;
    if (q.elapsed < WINDOW || q.frames.length < 4) return;

    // the median, so one hitch (a texture upload) does not count as a slow machine
    const sorted = q.frames.sort((a, b) => a - b);
    const fps = 1 / sorted[Math.floor(sorted.length / 2)];
    q.frames.length = 0;
    q.elapsed = 0;
    q.judged++;

    const last = q.step === DPR_STEPS.length - 1;
    if (q.before && fps < q.before * 1.15 && fps >= FLOOR_FPS) {
      // fewer pixels bought no frames: put the sharpness back and stop
      q.step--;
      setDpr(DPR_STEPS[q.step]);
      q.settled = true;
    }
    q.before = 0;
    if (q.settled) {
      if (fps < FLOOR_FPS && ++q.slow >= 2) fallBackToStills();
      else if (fps >= FLOOR_FPS) q.slow = 0;
    } else if (fps < FLOOR_FPS / 2 && q.judged === 1) {
      // hopeless from the first look: no point stepping down four times first
      fallBackToStills();
    } else if (fps < TARGET_FPS && !last) {
      q.before = fps;
      q.step++;
      setDpr(DPR_STEPS[q.step]);
    } else if (fps < FLOOR_FPS && last) {
      if (++q.slow >= 2) fallBackToStills();
    } else {
      q.slow = 0;
    }
  });

  return null;
}

export function Scene({ onReady }: Props) {
  const [step] = useState(initialDprStep);
  return (
    <Canvas
      dpr={DPR_STEPS[step]}
      camera={{ position: CAMERA.position, fov: CAMERA.fov, near: 0.1, far: 30 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.22,
      }}
      style={{ background: "transparent" }}
    >
      <AdaptiveQuality step={step} />
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
