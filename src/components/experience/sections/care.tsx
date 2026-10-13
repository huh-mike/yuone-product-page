"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { BODY, EYEBROW, TITLE, sectionTimeline, vf } from "../beats";
import { rig } from "../rig";

gsap.registerPlugin(useGSAP);

/**
 * 02 — Care, in the room while it rains.
 *   rain   the reason for everything that follows
 *   flow   from underneath, then through the laundry; the moisture reading falls
 *   ride   the view from where a shirt hangs
 *   uv     lights out; the copy is only legible where the UV light falls
 */
export function CareSection() {
  const section = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = section.current;
      if (!el) return;
      const mm = gsap.matchMedia();

      mm.add({ calm: "(prefers-reduced-motion: reduce)", lively: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
        const { show, hide, q } = sectionTimeline(el, !!ctx.conditions?.calm);

        show("[data-beat='rain']", 0.15);
        hide("[data-beat='rain']", 0.29);
        show("[data-beat='flow']", 0.33);
        show("[data-beat='meter']", 0.41);
        hide("[data-beat='flow']", 0.62);
        hide("[data-beat='meter']", 0.62);
        show("[data-beat='ride']", 0.655);
        hide("[data-beat='ride']", 0.74);
        show("[data-beat='uv']", 0.8);

        const reading = q("[data-reading]")[0] as HTMLElement | undefined;
        const bar = q("[data-reading-bar]")[0] as HTMLElement | undefined;
        const lit = q("[data-uv-lit]") as HTMLElement[];
        const paint = () => {
          if (reading) reading.textContent = String(rig.humidity);
          if (bar) bar.style.transform = `scaleX(${rig.humidity / 100})`;
          // the band of UV light crosses the copy in step with the one crossing the rack
          const x = -30 + rig.sweep * 160;
          for (const node of lit) node.style.setProperty("--uv-x", `${x.toFixed(1)}%`);
        };
        gsap.ticker.add(paint);
        return () => gsap.ticker.remove(paint);
      });
    },
    { scope: section },
  );

  return (
    <section ref={section} id="care" className="relative h-[700svh] text-white" aria-label="Care">
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* ---------- rain ---------- */}
        <div
          data-beat="rain"
          className="invisible absolute bottom-[8svh] left-[6vw] max-w-[30rem] opacity-0 md:bottom-auto md:top-[34svh]"
        >
          <p className="font-display uppercase text-white/85" style={{ ...vf(400, 110), ...EYEBROW }}>
            02 — Care
          </p>
          <span aria-hidden className="mt-4 block h-px w-12 bg-white/60" />
          <h2 className="mt-7 font-display text-[#efe7da]" style={TITLE}>
            Rain outside.
            <br />
            Dry indoors.
          </h2>
          <p className="mt-6 font-brand text-white/75" style={BODY}>
            Laundry day should not depend on the forecast. Flow moves air through every row, and UV Glow follows
            with light.
          </p>
        </div>

        {/* ---------- flow ---------- */}
        <div
          data-beat="flow"
          className="invisible absolute bottom-[8svh] left-[6vw] max-w-[28rem] opacity-0 md:bottom-auto md:top-[30svh]"
        >
          <p className="font-display uppercase text-white/85" style={{ ...vf(400, 110), ...EYEBROW }}>
            Flow
          </p>
          <h2 className="mt-6 font-display text-[#efe7da]" style={TITLE}>
            Air from above,
            <br />
            through every layer.
          </h2>
          <p className="mt-6 font-brand text-white/75" style={BODY}>
            Flow’s louvre swings as it blows, so the stream sweeps across every row. Scroll faster and it blows
            harder; run your cursor through it and it parts around you.
          </p>
        </div>

        <div
          data-beat="meter"
          className="invisible absolute right-[6vw] top-[14svh] w-[min(15rem,40vw)] text-right opacity-0 md:bottom-[10svh] md:top-auto"
        >
          <p
            className="font-display text-[#efe7da]"
            style={{ ...vf(200, 100), fontSize: "clamp(3rem, 6vw, 6.5rem)", lineHeight: 0.9 }}
          >
            <span data-reading>86</span>
            <span className="text-[0.4em] text-white/60">%</span>
          </p>
          <div aria-hidden className="mt-4 h-px w-full bg-white/20">
            <div data-reading-bar className="h-px w-full origin-right bg-[#F0765A]" />
          </div>
          <p
            className="mt-3 font-display uppercase text-white/70"
            style={{ ...vf(400, 105), fontSize: "clamp(0.6rem, 0.75vw, 0.8rem)", letterSpacing: "0.28em" }}
          >
            Moisture in the fabric
          </p>
          <p className="mt-1 font-brand text-[11px] text-white/45">Illustration, not a measurement</p>
        </div>

        {/* ---------- the ride ---------- */}
        <div data-beat="ride" className="invisible absolute inset-x-[6vw] bottom-[9svh] opacity-0">
          <p className="font-display uppercase text-white/85" style={{ ...vf(400, 110), ...EYEBROW }}>
            The view from the rail
          </p>
          <h2 className="mt-5 max-w-[34rem] font-display text-[#efe7da]" style={{ ...TITLE, fontSize: "clamp(1.7rem, 3vw, 3.2rem)" }}>
            Where your shirt hangs, the air is already moving.
          </h2>
        </div>

        {/* ---------- uv ---------- */}
        <div
          data-beat="uv"
          className="invisible absolute bottom-[8svh] left-[6vw] max-w-[30rem] opacity-0 md:bottom-auto md:top-[32svh]"
        >
          <p data-uv-lit className="yu-uv-lit font-display uppercase" style={{ ...vf(400, 110), ...EYEBROW }}>
            UV Glow
          </p>
          <h2 data-uv-lit className="yu-uv-lit mt-7 font-display" style={TITLE}>
            Lights out.
            <br />
            Care goes on.
          </h2>
          <p data-uv-lit className="yu-uv-lit mt-6 font-brand" style={BODY}>
            With the rack raised all the way up, a band of UV light passes over the laundry while the room is dark. You can only read this where it falls.
          </p>
        </div>
      </div>
    </section>
  );
}
