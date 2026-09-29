"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { rig } from "./rig";

const HEIGHT = 2.6; // ceiling to floor, metres
const DEPTH = 1.5;
const PERSON = 1.7;

/** A standing figure as a flat pictogram, feet at the origin. */
function figureShape() {
  const s = new THREE.Shape();
  // legs and torso as one silhouette
  s.moveTo(-0.13, 0);
  s.lineTo(-0.16, 0.82);
  s.lineTo(-0.22, 0.86);
  s.lineTo(-0.24, 1.38);
  s.quadraticCurveTo(-0.24, 1.47, -0.13, 1.47);
  s.lineTo(0.13, 1.47);
  s.quadraticCurveTo(0.24, 1.47, 0.24, 1.38);
  s.lineTo(0.22, 0.86);
  s.lineTo(0.16, 0.82);
  s.lineTo(0.13, 0);
  s.lineTo(0.02, 0);
  s.lineTo(0, 0.78);
  s.lineTo(-0.02, 0);
  s.closePath();
  const head = new THREE.Path();
  head.absarc(0, 1.59, 0.105, 0, Math.PI * 2, false);
  const headShape = new THREE.Shape(head.getPoints(32));
  return [s, headShape];
}

/**
 * "In your space": the outline of a room as wide as the visitor typed, the
 * unit on its ceiling and a 1.7 m figure on its floor, for scale.
 */
export function Room() {
  const group = useRef<THREE.Group>(null);
  const box = useRef<THREE.LineSegments>(null);
  const floor = useRef<THREE.Mesh>(null);
  const person = useRef<THREE.Mesh>(null);
  const width = useRef<HTMLSpanElement>(null);
  const tag = useRef<HTMLDivElement>(null);
  const tagAnchor = useRef<THREE.Group>(null);
  const w = useRef(2.4);

  const edges = useMemo(() => {
    const g = new THREE.BoxGeometry(1, HEIGHT, DEPTH);
    g.translate(0, -HEIGHT / 2, 0);
    return new THREE.EdgesGeometry(g);
  }, []);
  const figure = useMemo(() => new THREE.ShapeGeometry(figureShape(), 24), []);

  useFrame((state, dt) => {
    const r = rig;
    if (!group.current) return;
    group.current.visible = r.space > 0.01;
    if (!group.current.visible) {
      if (tag.current) tag.current.style.opacity = "0";
      return;
    }
    w.current += (r.roomWidth - w.current) * Math.min(1, dt * 6);

    if (box.current) {
      box.current.scale.x = w.current;
      (box.current.material as THREE.LineBasicMaterial).opacity = 0.55 * r.space;
    }
    if (floor.current) {
      floor.current.scale.x = w.current;
      (floor.current.material as THREE.MeshBasicMaterial).opacity = 0.07 * r.space;
    }
    if (person.current) {
      // stands beside the rack and keeps facing the viewer as the unit turns
      person.current.position.x = -Math.min(w.current / 2 - 0.3, 0.85);
      person.current.rotation.y = -r.rot.y;
      (person.current.material as THREE.MeshBasicMaterial).opacity = 0.6 * r.space;
    }
    if (tagAnchor.current) tagAnchor.current.position.set(0, -HEIGHT, DEPTH / 2);
    if (tag.current) tag.current.style.opacity = String(r.space);
    if (width.current) width.current.textContent = `${w.current.toFixed(1)} m`;
  });

  return (
    <group ref={group} visible={false}>
      <lineSegments ref={box} geometry={edges}>
        <lineBasicMaterial color="#efe7da" transparent opacity={0} depthWrite={false} />
      </lineSegments>
      <mesh ref={floor} position={[0, -HEIGHT, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1, DEPTH]} />
        <meshBasicMaterial color="#efe7da" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={person} geometry={figure} position={[-0.8, -HEIGHT, 0.2]} scale={PERSON / 1.695}>
        <meshBasicMaterial color="#F0765A" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <group ref={tagAnchor}>
        <Html center zIndexRange={[30, 20]} style={{ pointerEvents: "none" }}>
          <div
            ref={tag}
            className="mt-6 whitespace-nowrap font-display uppercase text-[#efe7da] opacity-0"
            style={{ fontSize: "clamp(0.6rem, 0.75vw, 0.8rem)", letterSpacing: "0.28em" }}
          >
            <span ref={width}>2.4 m</span> wide · 1.7 m figure
          </div>
        </Html>
      </group>
    </group>
  );
}
