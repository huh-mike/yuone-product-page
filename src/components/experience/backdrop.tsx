"use client";

import Image from "next/image";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { rig, seg } from "./rig";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Bottom to top. Each plate is the same room at a different hour. */
const PLATES = [
  { key: "morning", src: "/plates/room-morning.webp" },
  { key: "rain", src: "/plates/room-rain.webp" },
  { key: "dusk", src: "/hero-room.webp" },
  { key: "night", src: "/plates/room-night.webp" },
] as const;

/**
 * Everything behind the product, fixed to the viewport for the whole page:
 * the room at four times of day, the drawing-board paper, the dark for the
 * UV beat, and the hero's wordmark. The 3D rig decides what shows; this only
 * paints it.
 */
export function Backdrop() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const layer = (name: string) => q(`[data-layer='${name}']`)[0] as HTMLElement | undefined;
      const plates = PLATES.map((p) => layer(p.key));
      const room = layer("room");
      const veil = layer("veil");
      const paper = layer("paper");
      const black = layer("black");
      const violet = layer("violet");
      const wordmark = layer("wordmark");

      const paint = () => {
        const b = rig.backdrop;
        PLATES.forEach((p, i) => {
          const node = plates[i];
          if (node) node.style.opacity = String(b[p.key]);
        });
        if (room) room.style.transform = `scale(${b.plateScale})`;
        if (veil) veil.style.opacity = String(b.dim);
        if (paper) paper.style.opacity = String(b.paper);
        if (black) black.style.opacity = String(b.black);
        if (violet) violet.style.opacity = String(rig.uv * b.black);
        // the wordmark belongs to the hero: gone before the paper is up
        if (wordmark) wordmark.style.opacity = String(1 - seg(rig.T, 1, 1.08));
      };
      gsap.ticker.add(paint);

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // cursor drift: the wordmark floats against the product's own tilt
        const wmX = gsap.quickTo(q("[data-wordmark-drift]"), "x", { duration: 1.1, ease: "power3.out" });
        const wmY = gsap.quickTo(q("[data-wordmark-drift]"), "y", { duration: 1.1, ease: "power3.out" });
        const onMove = (e: PointerEvent) => {
          wmX(((e.clientX / window.innerWidth) * 2 - 1) * -22);
          wmY(((e.clientY / window.innerHeight) * 2 - 1) * -12);
        };
        const onLeave = () => {
          wmX(0);
          wmY(0);
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        document.documentElement.addEventListener("pointerleave", onLeave);

        // wordmark rises in behind the product, then recedes for the later beats
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          // looked up on the document: selector strings here are scoped to the backdrop
          scrollTrigger: { trigger: document.getElementById("hero"), start: "top top", end: "bottom bottom", scrub: 0.5 },
        });
        tl.set({}, {}, 1);
        tl.fromTo(
          q("[data-wordmark]"),
          { autoAlpha: 0, y: 60, scale: 0.96 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.14 },
          0.02,
        ).to(q("[data-wordmark]"), { opacity: 0.28, scale: 1.06, duration: 0.5 }, 0.34);

        return () => {
          window.removeEventListener("pointermove", onMove);
          document.documentElement.removeEventListener("pointerleave", onLeave);
        };
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(q("[data-wordmark]"), { autoAlpha: 1 });
      });

      return () => gsap.ticker.remove(paint);
    },
    { scope: root },
  );

  return (
    <div ref={root} aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0a0b0e]">
      {/* ---------- room plates ---------- */}
      <div data-layer="room" className="absolute inset-0 will-change-transform">
        {PLATES.map((p) => (
          <div
            key={p.key}
            data-layer={p.key}
            className="absolute inset-0"
            style={{ opacity: p.key === "dusk" ? 1 : 0 }}
          >
            <Image
              src={p.src}
              alt=""
              fill
              priority={p.key === "dusk"}
              sizes="100vw"
              className="object-cover object-[58%_38%]"
            />
          </div>
        ))}
      </div>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(8,9,12,0.62) 0%, rgba(8,9,12,0.28) 38%, rgba(8,9,12,0.18) 62%, rgba(8,9,12,0.86) 100%)",
        }}
      />
      <div data-layer="veil" className="absolute inset-0 opacity-0" style={{ background: "rgba(8,9,12,1)" }} />
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(60% 50% at 78% 62%, rgba(240,118,90,0.22) 0%, rgba(240,118,90,0) 70%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(120% 100% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)",
        }}
      />

      {/* ---------- wordmark (behind the product; revealed on scroll) ---------- */}
      <div data-layer="wordmark" className="absolute inset-x-0 top-[8svh] flex justify-center md:top-[9svh]">
        <span data-wordmark className="invisible block w-[92vw] origin-center opacity-0 will-change-transform">
          {/*
            Hairline wordmark. SVG text so the letters can be stretched to an
            exact width (like the reference's edge-to-edge lettering) while
            Raleway's 100 weight keeps every stroke a thread.
          */}
          <svg
            data-wordmark-drift
            viewBox="0 0 1000 200"
            className="block h-auto w-full overflow-visible will-change-transform"
          >
            <defs>
              <linearGradient id="wm-grad" x1="0" y1="0" x2="0.12" y2="1">
                <stop offset="0" stopColor="#f7f4ed" />
                <stop offset="0.42" stopColor="#d3d3d6" />
                <stop offset="0.72" stopColor="#8f9298" />
                <stop offset="1" stopColor="#4c5058" />
              </linearGradient>
            </defs>
            <text
              x="0"
              y="186"
              textLength="1000"
              lengthAdjust="spacingAndGlyphs"
              fontSize="236"
              fill="url(#wm-grad)"
              style={{ fontFamily: "var(--font-wordmark)", fontWeight: 100, letterSpacing: "0.1em" }}
            >
              YU ONE
            </text>
          </svg>
        </span>
      </div>

      {/* ---------- drawing board ---------- */}
      <div
        data-layer="paper"
        className="absolute inset-0 opacity-0"
        style={{
          backgroundColor: "#efe7da",
          backgroundImage:
            "linear-gradient(rgba(34,34,34,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(34,34,34,0.05) 1px, transparent 1px), radial-gradient(90% 80% at 60% 45%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0) 70%)",
          backgroundSize: "56px 56px, 56px 56px, 100% 100%",
        }}
      />

      {/* ---------- lights out ---------- */}
      <div data-layer="black" className="absolute inset-0 opacity-0" style={{ background: "#040407" }} />
      <div
        data-layer="violet"
        className="absolute inset-0 opacity-0"
        style={{
          background: "radial-gradient(55% 60% at 62% 58%, rgba(122,61,255,0.2) 0%, rgba(122,61,255,0) 70%)",
        }}
      />
    </div>
  );
}
