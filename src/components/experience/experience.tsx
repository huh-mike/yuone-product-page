"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { YuhomeLogo } from "../yuhome-logo";
import { Backdrop } from "./backdrop";
import { Hud } from "./hud";
import { BuildSection } from "./sections/build";
import { CareSection } from "./sections/care";
import { ControlSection } from "./sections/control";
import { HeroSection } from "./sections/hero";
import { ModulesSection } from "./sections/modules";
import { tickRig } from "./rig";
import { SECTIONS, stage } from "./stage";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const Scene = dynamic(() => import("./scene").then((m) => m.Scene), { ssr: false });

/**
 * The whole page as one continuous shot.
 *
 * Three fixed layers sit behind the scrolling copy: the backdrop, the WebGL
 * canvas with the one model that never unloads, and the HUD. The sections
 * themselves are only scroll length and words; each reports its progress to
 * the shared stage, and the rig turns that into the next frame.
 */
export function Experience() {
  const root = useRef<HTMLDivElement>(null);
  const revealed = useRef(false);

  /** Called once the GLB is decoded and mounted in the canvas. */
  const onSceneReady = useCallback(() => {
    if (revealed.current || !root.current) return;
    revealed.current = true;
    stage.ready = true;
    const q = gsap.utils.selector(root.current);
    const tl = gsap
      .timeline({ defaults: { ease: "power2.out" } })
      .to(q("[data-canvas]"), { autoAlpha: 1, duration: 1.6 }, 0);
    // the hint belongs to the untouched first frame only: if the reader has
    // already scrolled while the model was decoding, the scroll timeline owns it
    tl.add(() => {
      if (stage.progress[0] < 0.01 && !stage.reduced) {
        gsap.fromTo(q("[data-hint]"), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: "power2.out" });
      }
    }, 1.1);
  }, []);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;

      SECTIONS.forEach((s, i) => {
        const report = (self: ScrollTrigger) => {
          stage.progress[i] = self.progress;
        };
        ScrollTrigger.create({
          trigger: `#${s.id}`,
          // the hero starts pinned; every later section counts from the moment it enters
          start: i === 0 ? "top top" : "top bottom",
          end: "bottom bottom",
          onUpdate: report,
          onRefresh: report,
        });
      });

      let lastY = window.scrollY;
      const tick = (time: number, delta: number) => {
        const dt = Math.min(0.1, Math.max(1, delta) / 1000);
        const y = window.scrollY;
        const v = (y - lastY) / window.innerHeight / dt;
        lastY = y;
        stage.velocity += (v - stage.velocity) * 0.2;
        tickRig(time, dt);
      };
      gsap.ticker.add(tick);

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        stage.reduced = false;
        const onMove = (e: PointerEvent) => {
          stage.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
          stage.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
        };
        const onLeave = () => {
          stage.pointer.x = 0;
          stage.pointer.y = 0;
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        document.documentElement.addEventListener("pointerleave", onLeave);
        return () => {
          window.removeEventListener("pointermove", onMove);
          document.documentElement.removeEventListener("pointerleave", onLeave);
        };
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        stage.reduced = true;
        stage.pointer.x = 0;
        stage.pointer.y = 0;
      });

      return () => gsap.ticker.remove(tick);
    },
    { scope: root },
  );

  return (
    <div ref={root} className="relative">
      <Backdrop />

      {/* ---------- 3D product (fades in once the model is decoded) ---------- */}
      <div data-canvas className="pointer-events-none invisible fixed inset-0 z-10 opacity-0">
        <Scene onReady={onSceneReady} />
      </div>

      <div className="relative z-20">
        <HeroSection />
        <ModulesSection />
        <CareSection />
        <ControlSection />
        <BuildSection />

        <footer className="relative bg-[#040407] px-[6vw] py-[7svh] text-[#efe7da]">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <YuhomeLogo className="h-[38px] w-auto" wordmarkFill="#efe7da" />
              <p className="mt-5 max-w-[26rem] font-brand text-[13px] font-light text-[#efe7da]/60">
                YU ONE is a modular automated laundry system. Start with one module and add what you need, when you
                need it.
              </p>
            </div>
            <a
              href="#hero"
              className="font-display text-[11px] uppercase tracking-[0.3em] text-[#efe7da]/70 transition-colors hover:text-[#F0765A]"
            >
              Back to the top ↑
            </a>
          </div>
        </footer>
      </div>

      <Hud />
    </div>
  );
}
