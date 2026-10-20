"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { EXPLODE } from "./explode";
import { RACK_Y, rig } from "./rig";

/**
 * Call-outs for the exploded view. Each one is pinned to a point on its part
 * in model space, so it travels with the part as the unit comes apart.
 * `x` is negative because the unit faces away at this point in the story.
 */
const PARTS: { name: string; note: string; x: number; y: number; travel: number }[] = [
  { name: "Shell", note: "Satin black housing", x: -0.5, y: -0.05, travel: EXPLODE.shell },
  { name: "Chassis", note: "Motor and drive", x: -0.49, y: -0.01, travel: EXPLODE.plate },
  { name: "Light panel", note: "Frosted acrylic, lights the room", x: -0.5, y: -0.07, travel: EXPLODE.panel },
  { name: "Flow", note: "Airflow, in a base slot", x: -0.27, y: -0.11, travel: EXPLODE.flow },
  { name: "UV Glow", note: "UV light, in a base slot", x: -0.26, y: -0.07, travel: EXPLODE.uv },
  { name: "Scissor lifts", note: "Raise and lower the rack", x: -0.33, y: -0.3, travel: EXPLODE.rack * 0.62 },
  { name: "Frame", note: "Core, Plus or Max", x: -0.59, y: RACK_Y + 0.02, travel: EXPLODE.rack },
  { name: "Modules", note: "Solo, Duo or Flex", x: -0.59, y: RACK_Y, travel: EXPLODE.rack + EXPLODE.modules },
];

export function Labels() {
  const anchors = useRef<(THREE.Group | null)[]>([]);
  const tags = useRef<(HTMLDivElement | null)[]>([]);

  useFrame(() => {
    const r = rig;
    const shown = r.labels > 0.01 && !r.narrow;
    PARTS.forEach((part, i) => {
      const anchor = anchors.current[i];
      const tag = tags.current[i];
      if (anchor) {
        anchor.visible = shown;
        anchor.position.set(part.x, part.y + part.travel * r.explode, 0);
      }
      if (tag) {
        // one after another, top to bottom
        const a = Math.min(1, Math.max(0, r.labels * 2.2 - i * 0.15));
        tag.style.opacity = shown ? String(a) : "0";
        tag.style.transform = `translate3d(${(1 - a) * 18}px, -50%, 0)`;
      }
    });
  });

  return (
    <>
      {PARTS.map((part, i) => (
        <group
          key={part.name}
          ref={(node) => {
            anchors.current[i] = node;
          }}
          visible={false}
        >
          <Html zIndexRange={[30, 20]} style={{ pointerEvents: "none" }}>
            <div
              ref={(node) => {
                tags.current[i] = node;
              }}
              className="flex items-center gap-3 whitespace-nowrap text-[#222] opacity-0"
            >
              <span aria-hidden className="block h-px w-[clamp(1.5rem,4vw,4rem)] bg-[#222]/45" />
              <span className="font-display text-[10px] tracking-[0.3em] text-[#F0765A]">{String(i + 1).padStart(2, "0")}</span>
              <span>
                <span
                  className="block font-display uppercase"
                  style={{ fontSize: "clamp(0.62rem, 0.78vw, 0.82rem)", letterSpacing: "0.26em" }}
                >
                  {part.name}
                </span>
                <span className="block font-brand text-[#222]/60" style={{ fontSize: "clamp(0.62rem, 0.72vw, 0.78rem)" }}>
                  {part.note}
                </span>
              </span>
            </div>
          </Html>
        </group>
      ))}
    </>
  );
}
