"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Airflow } from "./airflow";
import { EXPLODE } from "./explode";
import { KitRack, kitState } from "./kit-rack";
import { Labels } from "./labels";
import { glow, HERO_FLOW_GLOW, HERO_UV_GLOW, restyle } from "./materials";
import { seg, rig } from "./rig";
import { Room } from "./room";
import { sfx } from "./sound";

export const MODEL_URL = "/models/yu-one.glb";
export const DRACO_PATH = "/draco/";

useGLTF.preload(MODEL_URL, DRACO_PATH);

/** Points in the baked clip where a module seats in the frame. */
const SEATED = [54 / 120, 80 / 120, 106 / 120];

/**
 * The scissor lifts are keyed in the model as one clip that runs from the rack
 * fully up to LIFT_TRAVEL metres lower, linear in rack height
 * (scripts/build-lift.py).
 */
const LIFT_CLIP = "Lift";
const LIFT_TRAVEL = 0.9;

type Assembly = {
  mixer: THREE.AnimationMixer;
  actions: THREE.AnimationAction[];
  duration: number;
  liftAction: THREE.AnimationAction | null;
  shell: THREE.Group;
  plate: THREE.Group;
  panel: THREE.Group;
  flow: THREE.Group;
  uv: THREE.Group;
  lift: THREE.Group;
  rack: THREE.Group;
  vane: THREE.Group;
};

/**
 * Regroup the model into the parts the story moves: everything is re-parented
 * into plain groups that sit in model space, so an offset of 0.1 is 10 cm
 * whatever units the exported hierarchy used.
 */
function assemble(model: THREE.Object3D, animations: THREE.AnimationClip[]): Assembly {
  model.updateWorldMatrix(true, true);

  const group = (name: string, y = 0) => {
    const g = new THREE.Group();
    g.name = `part:${name}`;
    g.position.y = y;
    model.add(g);
    return g;
  };
  const take = (g: THREE.Group, ...names: string[]) => {
    for (const name of names) {
      const node = model.getObjectByName(name);
      if (node) g.attach(node);
    }
    return g;
  };

  const shell = take(group("shell"), "dengkuang_stp", "Logos");
  const plate = take(group("plate"), "Extrude_2", "Inner_Base");
  const panel = take(group("panel"), "deng_zhao_stp");
  const flow = take(group("flow"), "Flow");
  const uv = take(group("uv"), "UV_Glow");
  const lift = take(group("lift"), "Lift");
  const rack = take(group("rack"), "Rack");

  // Flow's outlet vane swings about its own long axis
  const vane = new THREE.Group();
  const blade = model.getObjectByName("FanBlade");
  if (blade) {
    flow.add(vane);
    flow.updateWorldMatrix(true, false);
    flow.worldToLocal(new THREE.Box3().setFromObject(blade).getCenter(vane.position));
    vane.attach(blade);
  }

  const mixer = new THREE.AnimationMixer(model);
  const scrubbed = (clip: THREE.AnimationClip) => {
    const action = mixer.clipAction(clip);
    action.play();
    action.paused = true; // scrubbed by hand, never played
    return action;
  };
  const liftClip = animations.find((clip) => clip.name === LIFT_CLIP);
  const moduleClips = animations.filter((clip) => clip !== liftClip);
  const actions = moduleClips.map(scrubbed);
  const duration = moduleClips.reduce((m, c) => Math.max(m, c.duration), 0);
  const liftAction = liftClip ? scrubbed(liftClip) : null;

  return { mixer, actions, duration, liftAction, shell, plate, panel, flow, uv, lift, rack, vane };
}

/** Parts that the configurator can take off slide away below and hide. */
function fit(part: THREE.Object3D, present: number, baseY: number) {
  part.visible = present > 0.02;
  part.position.y = baseY - (1 - present) * 0.22;
}

type Props = { onReady?: () => void };

export function Unit({ onReady }: Props) {
  const { scene, animations } = useGLTF(MODEL_URL, DRACO_PATH);

  const root = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const offset = useRef<THREE.Group>(null);
  const uvLight = useRef<THREE.PointLight>(null);
  const sweepLight = useRef<THREE.PointLight>(null);
  const panelLight = useRef<THREE.PointLight>(null);
  const present = useRef({ flow: 1, uv: 1 });
  const attached = useRef(0);

  // model is decoded and mounted: let the page start its entrance
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  /** Own copy of the scene (the loader's is cached and shared), restyled by material name. */
  const model = useMemo(() => restyle(scene.clone(true)), [scene]);

  // The assembly (mixer, actions, part groups) is mutated every frame, so it
  // lives in a ref and is created lazily inside the frame loop, never during render.
  const assembly = useRef<Assembly | null>(null);
  useEffect(
    () => () => {
      assembly.current?.mixer.stopAllAction();
      assembly.current = null;
    },
    [],
  );

  useFrame((state, dt) => {
    const unit = (assembly.current ??= assemble(model, animations));
    const r = rig;
    const t = state.clock.elapsedTime;

    if (root.current && spin.current && offset.current) {
      root.current.position.copy(r.pos);
      root.current.scale.setScalar(r.scale);
      spin.current.rotation.copy(r.rot);
      offset.current.position.copy(r.pivot).negate();
    }

    // hero: scrub the baked clip, modules detach then click in one by one
    const kit = r.useKit && kitState.ready;
    unit.rack.visible = !kit;
    if (!kit && unit.actions.length) {
      const time = r.attach * (unit.duration - 1e-4);
      for (const action of unit.actions) action.time = time;
      if (SEATED.some((at) => attached.current < at && r.attach >= at)) sfx.click();
    }
    attached.current = r.attach;

    const e = r.explode;
    unit.shell.position.y = EXPLODE.shell * e;
    unit.plate.position.y = EXPLODE.plate * e;
    unit.panel.position.y = EXPLODE.panel * e;

    const k = Math.min(1, dt * 5);
    present.current.flow += ((r.hasFlow ? 1 : 0) - present.current.flow) * k;
    present.current.uv += ((r.hasUv ? 1 : 0) - present.current.uv) * k;
    fit(unit.flow, present.current.flow, EXPLODE.flow * e);
    fit(unit.uv, present.current.uv, EXPLODE.uv * e);

    const rackY = -r.drop + EXPLODE.rack * e;
    unit.rack.position.y = rackY;
    // the lifts open as far as the rack has come down
    if (unit.liftAction) {
      const open = THREE.MathUtils.clamp(-rackY / LIFT_TRAVEL, 0, 1);
      unit.liftAction.time = open * (unit.liftAction.getClip().duration - 1e-4);
    }
    unit.mixer.update(0);

    unit.vane.rotation.x = Math.sin(t * 1.4) * 0.5 * r.fan;

    // after the hero the LEDs follow what is actually running
    const w = seg(r.T, 1, 1.1);
    glow.flow().emissiveIntensity = (HERO_FLOW_GLOW * (1 - w) + (0.5 + 3 * r.fan) * w) * r.power;
    glow.uv().emissiveIntensity = (HERO_UV_GLOW * (1 - w) + (0.25 + 5 * r.uv) * w) * r.power;
    glow.panel().emissiveIntensity = 2.4 * r.light;

    if (uvLight.current) uvLight.current.intensity = 5 * r.uv * present.current.uv;
    if (sweepLight.current) {
      sweepLight.current.intensity = 7 * r.uv * present.current.uv;
      sweepLight.current.position.set((r.sweep * 2 - 1) * 0.7, rackY - 0.62, 0.35);
    }
    if (panelLight.current) panelLight.current.intensity = 2.2 * r.light;
  });

  return (
    <group ref={root}>
      <group ref={spin}>
        <group ref={offset}>
          <primitive object={model} />
          <Suspense fallback={null}>
            <KitRack />
          </Suspense>
          <Airflow />
          <Labels />
          <Room />
          <pointLight ref={uvLight} color="#7a3dff" position={[0, -0.12, 0.08]} intensity={0} distance={2.4} decay={1.6} />
          <pointLight ref={sweepLight} color="#9a6bff" intensity={0} distance={1.6} decay={1.4} />
          <pointLight ref={panelLight} color="#ffdcb4" position={[0, -0.3, 0]} intensity={0} distance={3} decay={1.5} />
        </group>
      </group>
    </group>
  );
}
