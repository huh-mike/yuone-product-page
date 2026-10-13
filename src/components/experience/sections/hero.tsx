"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { EYEBROW, vf } from "../beats";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * The hero's copy. The room, the wordmark and the product now live in the
 * page-wide backdrop and canvas; this section is its scroll length and the
 * three beats that ride on it.
 */
export function HeroSection() {
  const section = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = section.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
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

        // the name first, the line under it a beat later
        show("[data-beat='1']", 0.05, 0.1);
        show("[data-beat='1b']", 0.13, 0.1);
        hide("[data-beat='1']", 0.26);
        hide("[data-beat='1b']", 0.26);

        // modules detach → click in one by one (matches BEATS.attach in the rig)
        show("[data-beat='2']", 0.27);
        tl.fromTo(q("[data-step='1']"), { opacity: 0.25 }, { opacity: 1, duration: 0.04 }, 0.4)
          .fromTo(q("[data-step='2']"), { opacity: 0.25 }, { opacity: 1, duration: 0.04 }, 0.49)
          .fromTo(q("[data-step='3']"), { opacity: 0.25 }, { opacity: 1, duration: 0.04 }, 0.58);
        hide("[data-beat='2']", 0.68);

        show("[data-beat='3']", 0.8, 0.14);

        // the closing beat lets go as the frame scrolls off, so it never crosses the product
        gsap.to(q("[data-frame]"), {
          autoAlpha: 0,
          ease: "none",
          scrollTrigger: { trigger: el, start: "bottom bottom", end: "bottom 62%", scrub: true },
        });
      });

      // reduced motion: product + first beat visible, nothing scroll-bound
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(q("[data-beat='1'], [data-beat='1b']"), { autoAlpha: 1 });
        gsap.set(q("[data-beat='2'], [data-beat='3'], [data-hint]"), { autoAlpha: 0 });
      });
    },
    { scope: section },
  );

  return (
    <section
      ref={section}
      id="hero"
      className="relative h-[420svh] text-white"
      aria-label="YU ONE automated laundry system"
    >
      <div data-frame className="sticky top-0 h-svh overflow-hidden">
        <h1 className="sr-only">YU ONE. Start with YU ONE. Add what you need, when you need it.</h1>

        <div
          data-beat="1"
          className="invisible absolute left-[6vw] top-[60svh] max-w-[34rem] opacity-0 md:top-[46svh]"
        >
          <p className="font-display uppercase text-white/85" style={{ ...vf(400, 110), ...EYEBROW }}>
            YU ONE
          </p>
          <span aria-hidden className="mt-4 block h-px w-12 bg-white/60" />
        </div>
        <div
          data-beat="1b"
          className="invisible absolute left-[6vw] top-[calc(60svh+5.5rem)] max-w-[34rem] opacity-0 md:top-[calc(46svh+5.5rem)]"
        >
          <p
            className="font-brand text-white/90"
            style={{ fontSize: "clamp(1.1rem, 1.6vw, 1.7rem)", lineHeight: 1.45, fontWeight: 300 }}
          >
            Start with YU ONE.
            <br />
            Add what you need, when you need it.
          </p>
        </div>

        <div
          data-beat="2"
          className="invisible absolute right-[6vw] top-[56svh] max-w-[30rem] text-right opacity-0 md:top-[40svh]"
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
          className="invisible absolute inset-x-0 bottom-[6svh] flex flex-col items-center text-center opacity-0 md:inset-x-auto md:bottom-auto md:left-[6vw] md:top-1/2 md:max-w-[44rem] md:-translate-y-1/2 md:items-start md:text-left"
        >
          <p
            className="font-display text-[#efe7da]"
            style={{ ...vf(200, 100), fontSize: "clamp(2rem, 4vw, 4.2rem)", lineHeight: 1.02 }}
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
          className="invisible absolute bottom-[7svh] left-[6vw] flex items-stretch gap-4 font-display uppercase text-white/80 opacity-0"
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
