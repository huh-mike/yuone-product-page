"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { Pointer } from "./yu-one-model";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const HeroScene = dynamic(() => import("./hero-scene").then((m) => m.HeroScene), {
  ssr: false,
});

/** Archivo is variable on wght + wdth. */
const vf = (wght: number, wdth: number) => ({
  fontVariationSettings: `"wght" ${wght}, "wdth" ${wdth}`,
  fontWeight: wght,
});

const EYEBROW = {
  fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
  letterSpacing: "0.42em",
};

/**
 * Pinned, scroll-driven hero.
 *
 * On load only the product is on screen: it fades and settles into place, then
 * a scroll hint appears. Everything else is revealed by scrolling. The section
 * is 320vh tall with a sticky inner frame; one ScrollTrigger reports 0→1
 * progress to the WebGL scene (half-turn spin, then the rack lowers) and a
 * scrubbed timeline brings the wordmark and three copy beats in and out.
 */
export function ScrollHero() {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const pointer = useRef<Pointer>({ x: 0, y: 0 });
  const revealed = useRef(false);

  /** Called once the GLB is decoded and mounted in the canvas. */
  const onSceneReady = useCallback(() => {
    if (revealed.current || !section.current) return;
    revealed.current = true;
    const q = gsap.utils.selector(section.current);
    const tl = gsap
      .timeline({ defaults: { ease: "power2.out" } })
      .to(q("[data-canvas]"), { autoAlpha: 1, duration: 1.6 }, 0);
    // the hint belongs to the untouched first frame only: if the reader has
    // already scrolled while the model was decoding, the scroll timeline owns it
    tl.add(() => {
      if (progress.current < 0.01) {
        gsap.fromTo(q("[data-hint]"), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: "power2.out" });
      }
    }, 1.1);
  }, []);

  useGSAP(
    () => {
      const el = section.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // cursor drift: the wordmark floats against the product's own tilt
        const wmX = gsap.quickTo(q("[data-wordmark-drift]"), "x", { duration: 1.1, ease: "power3.out" });
        const wmY = gsap.quickTo(q("[data-wordmark-drift]"), "y", { duration: 1.1, ease: "power3.out" });
        const onMove = (e: PointerEvent) => {
          const x = (e.clientX / window.innerWidth) * 2 - 1;
          const y = (e.clientY / window.innerHeight) * 2 - 1;
          pointer.current.x = x;
          pointer.current.y = y;
          wmX(x * -22);
          wmY(y * -12);
        };
        const onLeave = () => {
          pointer.current.x = 0;
          pointer.current.y = 0;
          wmX(0);
          wmY(0);
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        document.documentElement.addEventListener("pointerleave", onLeave);

        ScrollTrigger.create({
          trigger: el,
          start: "top top",
          end: "bottom bottom",
          onUpdate: (self) => {
            progress.current = self.progress;
          },
        });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: 0.5 },
        });

        // normalise timeline length to 1 so positions below read as progress
        tl.set({}, {}, 1);

        const show = (sel: string, at: number, dur = 0.12) =>
          tl.fromTo(q(sel), { autoAlpha: 0, y: 44 }, { autoAlpha: 1, y: 0, duration: dur }, at);
        const hide = (sel: string, at: number, dur = 0.1) =>
          tl.to(q(sel), { autoAlpha: 0, y: -36, duration: dur }, at);

        // hint leaves as soon as the user commits to scrolling
        tl.to(q("[data-hint]"), { autoAlpha: 0, duration: 0.05 }, 0.02);

        // wordmark rises in behind the product, then recedes for the later beats
        tl.fromTo(
          q("[data-wordmark]"),
          { autoAlpha: 0, y: 60, scale: 0.96 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.14 },
          0.02,
        ).to(q("[data-wordmark]"), { opacity: 0.28, scale: 1.06, duration: 0.5 }, 0.34);

        show("[data-beat='1']", 0.06, 0.12);
        hide("[data-beat='1']", 0.2);

        // modules detach → click in one by one (matches BEATS.attach in the model)
        show("[data-beat='2']", 0.27);
        tl.fromTo(q("[data-step='1']"), { opacity: 0.25 }, { opacity: 1, duration: 0.04 }, 0.4)
          .fromTo(q("[data-step='2']"), { opacity: 0.25 }, { opacity: 1, duration: 0.04 }, 0.49)
          .fromTo(q("[data-step='3']"), { opacity: 0.25 }, { opacity: 1, duration: 0.04 }, 0.58);
        hide("[data-beat='2']", 0.68);

        show("[data-beat='3']", 0.8, 0.14);

        tl.to(q("[data-plate]"), { scale: 1.06, duration: 1 }, 0).to(
          q("[data-dim]"),
          { opacity: 0.55, duration: 1 },
          0,
        );

        return () => {
          window.removeEventListener("pointermove", onMove);
          document.documentElement.removeEventListener("pointerleave", onLeave);
        };
      });

      // reduced motion: product + first beat visible, nothing scroll-bound
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(q("[data-canvas], [data-wordmark], [data-beat='1']"), { autoAlpha: 1 });
        gsap.set(q("[data-beat='2'], [data-beat='3'], [data-hint]"), { autoAlpha: 0 });
      });
    },
    { scope: section },
  );

  return (
    <section
      ref={section}
      className="relative h-[420svh] bg-[#0a0b0e] text-white"
      aria-label="YU ONE automated laundry system"
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* ---------- room plate ---------- */}
        <div data-plate className="absolute inset-0 will-change-transform">
          <Image
            src="/hero-room.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[58%_38%]"
          />
        </div>
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,9,12,0.62) 0%, rgba(8,9,12,0.28) 38%, rgba(8,9,12,0.18) 62%, rgba(8,9,12,0.86) 100%)",
          }}
        />
        <div aria-hidden data-dim className="absolute inset-0 opacity-0" style={{ background: "rgba(8,9,12,1)" }} />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 78% 62%, rgba(240,118,90,0.22) 0%, rgba(240,118,90,0) 70%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 100% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)",
          }}
        />

        {/* ---------- wordmark (behind the product; revealed on scroll) ---------- */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[8svh] z-10 flex justify-center md:top-[9svh]"
        >
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

        {/* ---------- 3D product (fades in once the model is decoded) ---------- */}
        <div data-canvas className="invisible pointer-events-none absolute inset-0 z-20 opacity-0">
          <HeroScene progress={progress} pointer={pointer} onReady={onSceneReady} />
        </div>

        {/* ---------- copy beats ---------- */}
        <h1 className="sr-only">YU ONE. Start with YU ONE. Add what you need, when you need it.</h1>

        <div
          data-beat="1"
          className="invisible absolute left-[6vw] top-[60svh] z-30 max-w-[34rem] opacity-0 md:top-[46svh]"
        >
          <p className="font-display uppercase text-white/85" style={{ ...vf(400, 110), ...EYEBROW }}>
            YU ONE
          </p>
          <span aria-hidden className="mt-4 block h-px w-12 bg-white/60" />
          <p
            className="mt-8 font-brand text-white/90"
            style={{ fontSize: "clamp(1.1rem, 1.6vw, 1.7rem)", lineHeight: 1.45, fontWeight: 300 }}
          >
            Start with YU ONE.
            <br />
            Add what you need, when you need it.
          </p>
        </div>

        <div
          data-beat="2"
          className="invisible absolute right-[6vw] top-[56svh] z-30 max-w-[30rem] text-right opacity-0 md:top-[40svh]"
        >
          <p className="font-display uppercase text-white/85" style={{ ...vf(400, 110), ...EYEBROW }}>
            Modular by design
          </p>
          <p
            className="mt-6 font-display text-[#efe7da]"
            style={{ ...vf(200, 100), fontSize: "clamp(2rem, 4vw, 4.2rem)", lineHeight: 1.02 }}
          >
            Start with one.
            <br />
            Add as you go.
          </p>
          <p
            className="mt-6 font-brand text-white/75"
            style={{ fontSize: "clamp(0.95rem, 1.1vw, 1.15rem)", fontWeight: 300 }}
          >
            Each drying module clicks into the frame in seconds.
            <br />
            No tools. No installer. Grow from one row to four.
          </p>
          <ol
            className="mt-7 flex justify-end gap-6 font-display uppercase text-white"
            style={{ ...vf(400, 105), fontSize: "clamp(0.62rem, 0.8vw, 0.85rem)", letterSpacing: "0.28em" }}
          >
            {["Module 01", "Module 02", "Module 03"].map((label, i) => (
              <li key={label} data-step={i + 1} className="flex items-center gap-2 opacity-25">
                <span aria-hidden className="size-1.5 rounded-full bg-[#F0765A]" />
                {label}
              </li>
            ))}
          </ol>
        </div>

        <div
          data-beat="3"
          className="invisible absolute inset-x-0 bottom-[6svh] z-30 flex flex-col items-center text-center opacity-0"
        >
          <p
            className="font-display text-[#efe7da]"
            style={{ ...vf(200, 100), fontSize: "clamp(2rem, 4.4vw, 4.6rem)", lineHeight: 1.02 }}
          >
            It comes down to you.
          </p>
          <p
            className="mt-4 font-brand text-white/75"
            style={{ fontSize: "clamp(0.95rem, 1.1vw, 1.15rem)", fontWeight: 300 }}
          >
            Quiet motor. Lowers to hand height. Rises out of the way.
          </p>
          <a
            href="#build"
            className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#F0765A] px-7 py-3 font-brand text-[14px] font-600 text-white transition hover:bg-[#ff8a6e]"
          >
            Build yours
            <span aria-hidden>→</span>
          </a>
        </div>

        {/* ---------- scroll hint (the only text on load) ---------- */}
        <div
          data-hint
          className="invisible absolute bottom-[7svh] left-[6vw] z-30 flex items-stretch gap-4 font-display uppercase text-white/80 opacity-0"
          style={{ ...vf(400, 105), fontSize: "clamp(0.65rem, 0.85vw, 0.9rem)", letterSpacing: "0.3em" }}
        >
          <span aria-hidden className="w-px bg-white/50" />
          <p className="leading-[1.9]">
            Scroll
            <br />
            to explore
          </p>
        </div>
      </div>
    </section>
  );
}
