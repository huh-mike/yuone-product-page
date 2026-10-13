"use client";

import { Html, Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, type ComponentRef } from "react";
import * as THREE from "three";

type Reading = {
  from: [number, number, number];
  to: [number, number, number];
  /** 0 hides the line and the label. */
  opacity: number;
  /** The big figure, e.g. "1.3 m". */
  value: string;
  /** What the figure measures. */
  note: string;
  /** Which side of the line the label sits on, for a vertical line: after is to the right on screen. */
  side?: "before" | "after";
};

type Props = {
  /** Called every frame; returns where the line runs and what it says. */
  read: () => Reading;
  /** Direction of the end ticks, perpendicular to the line. */
  tick: [number, number, number];
  color: string;
  /** Where the label sits relative to the line's midpoint, model units. A centred label hangs below that point. */
  labelOffset?: [number, number, number];
  align?: "left" | "center";
};

const TICK = 0.045;
const ZERO: [number, number, number] = [0, 0, 0];
const STATIC = [ZERO, ZERO, ZERO, ZERO, ZERO, ZERO];

/**
 * A dimension line, as on a drawing: the span, a tick at each end and the
 * figure beside it. Lives in the unit's own space so it turns with the unit.
 */
export function Dimension({ read, tick, color, labelOffset = [0, 0, 0], align = "left" }: Props) {
  const line = useRef<ComponentRef<typeof Line>>(null);
  const anchor = useRef<THREE.Group>(null);
  const tag = useRef<HTMLDivElement>(null);
  const big = useRef<HTMLSpanElement>(null);
  const small = useRef<HTMLSpanElement>(null);
  const buffer = useRef(new Float32Array(18));

  useFrame(() => {
    const r = read();
    const shown = r.opacity > 0.01;
    const l = line.current;
    if (l) {
      l.visible = shown;
      l.material.transparent = true;
      l.material.depthWrite = false;
      if (shown) {
        const b = buffer.current;
        const [ax, ay, az] = r.from;
        const [bx, by, bz] = r.to;
        const [tx, ty, tz] = tick;
        const pts = [
          ax, ay, az, bx, by, bz,
          ax - tx * TICK, ay - ty * TICK, az - tz * TICK, ax + tx * TICK, ay + ty * TICK, az + tz * TICK,
          bx - tx * TICK, by - ty * TICK, bz - tz * TICK, bx + tx * TICK, by + ty * TICK, bz + tz * TICK,
        ];
        for (let i = 0; i < 18; i++) b[i] = pts[i];
        l.geometry.setPositions(b);
        l.material.opacity = 0.8 * r.opacity;
      }
    }
    if (anchor.current) {
      anchor.current.visible = shown;
      anchor.current.position.set(
        (r.from[0] + r.to[0]) / 2 + labelOffset[0],
        (r.from[1] + r.to[1]) / 2 + labelOffset[1],
        (r.from[2] + r.to[2]) / 2 + labelOffset[2],
      );
    }
    if (tag.current) {
      tag.current.style.opacity = shown ? String(r.opacity) : "0";
      if (align === "left") {
        const before = r.side === "before";
        tag.current.style.transform = `translate(${before ? "-100%" : "0"}, -50%)`;
        tag.current.style.textAlign = before ? "right" : "left";
        tag.current.style.padding = before ? "0 0.75rem 0 0" : "0 0 0 0.75rem";
      }
    }
    if (big.current && big.current.textContent !== r.value) big.current.textContent = r.value;
    if (small.current && small.current.textContent !== r.note) small.current.textContent = r.note;
  });

  return (
    <>
      {/* props here reach the material too, so visibility and blending are set from the frame loop */}
      <Line ref={line} points={STATIC} segments color={color} lineWidth={1.25} depthTest={false} renderOrder={6} />
      <group ref={anchor} visible={false}>
        <Html center={align === "center"} zIndexRange={[30, 20]} style={{ pointerEvents: "none" }}>
          <div
            ref={tag}
            className={`whitespace-nowrap opacity-0 ${align === "center" ? "pt-2 text-center" : "-translate-y-1/2"}`}
            style={{ color }}
          >
            <span ref={big} className="block font-display" style={{ fontSize: "clamp(1.1rem, 1.8vw, 1.9rem)", fontWeight: 200, lineHeight: 1 }} />
            <span
              ref={small}
              className="mt-1 block font-display uppercase opacity-70"
              style={{ fontSize: "clamp(0.56rem, 0.68vw, 0.72rem)", letterSpacing: "0.26em" }}
            />
          </div>
        </Html>
      </group>
    </>
  );
}
