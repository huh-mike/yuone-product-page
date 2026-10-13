"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { BODY, EYEBROW, TITLE, sectionTimeline, vf } from "../beats";
import { stage } from "../stage";

gsap.registerPlugin(useGSAP);

const MODULES = [
  {
    key: "solo",
    name: "Solo.",
    lead: "One pole.",
    body: "The everyday line for shirts, tees and trousers. One 1.2 m pole in a single slot, telescoping out to 1.9 m.",
  },
  {
    key: "duo",
    name: "Duo.",
    lead: "Two poles.",
    body: "Twice the line in the same slot: two poles, front and back. 2.4 m of hanging space as standard, 3.8 m extended.",
  },
  {
    key: "flex",
    name: "Flex.",
    lead: "Two poles. One swings out.",
    body: "Open the arm and the poles spread apart, so a bedsheet or duvet hangs with air on both sides. The same 1.2 m poles, out to 1.9 m.",
  },
];

/** A clothes peg, drawn: two jaws and the spring. */
function Peg() {
  return (
    <svg aria-hidden viewBox="0 0 14 30" className="mx-auto block h-[1.6em] w-auto text-[#F0765A]" fill="none">
      <path d="M5 1.5v19l-2.2 8M9 1.5v19l2.2 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3.2 11.5h7.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 01 — Modules, on the drawing board.
 *   anatomy   the unit comes apart into its eight parts
 *   drawer    Solo, Duo and Flex laid out one under the other, each with its load
 *   frame     the frame grows from two slots to four
 */
export function ModulesSection() {
  const section = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = section.current;
      if (!el) return;
      const mm = gsap.matchMedia();

      mm.add({ calm: "(prefers-reduced-motion: reduce)", lively: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
        const { show, hide, lift, tl, q } = sectionTimeline(el, !!ctx.conditions?.calm);

        show("[data-beat='anatomy']", 0.15);
        hide("[data-beat='anatomy']", 0.34);

        show("[data-beat='line']", 0.39);
        MODULES.forEach((m, i) => {
          const from = [0.44, 0.545, 0.645][i];
          const to = [0.53, 0.63, 0.76][i];
          show(`[data-module='${m.key}']`, from, 0.03);
          hide(`[data-module='${m.key}']`, to, 0.02);
          lift(`[data-word='${m.key}']`, from, to);
        });
        hide("[data-beat='line']", 0.77);

        show("[data-beat='frame']", 0.8);
        // matches the frame widths in the rig: three, down to two, then up to four
        tl.set(q("[data-width]"), { opacity: 0.25 }, 0.8)
          .set(q("[data-width='3']"), { opacity: 1 }, 0.8)
          .set(q("[data-width]"), { opacity: 0.25 }, 0.86)
          .set(q("[data-width='2']"), { opacity: 1 }, 0.86)
          .set(q("[data-width]"), { opacity: 0.25 }, 0.9)
          .set(q("[data-width='3']"), { opacity: 1 }, 0.9)
          .set(q("[data-width]"), { opacity: 0.25 }, 0.95)
          .set(q("[data-width='4']"), { opacity: 1 }, 0.95);

        // the hung words catch the draught of a fast scroll
        const line = q("[data-beat='line']")[0] as HTMLElement | undefined;
        const gust = () => {
          if (line) line.style.setProperty("--sway", `${Math.min(7, 1.1 + Math.abs(stage.velocity) * 2.4).toFixed(2)}deg`);
        };
        if (ctx.conditions?.lively) gsap.ticker.add(gust);
        return () => gsap.ticker.remove(gust);
      });
    },
    { scope: section },
  );

  return (
    <section ref={section} id="modules" className="relative h-[700svh] text-[#222]" aria-label="Modules">
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* ---------- anatomy ---------- */}
        <div
          data-beat="anatomy"
          className="invisible absolute bottom-[8svh] left-[6vw] max-w-[28rem] opacity-0 md:bottom-auto md:top-[34svh]"
        >
          <p className="font-display uppercase text-[#222]/80" style={{ ...vf(400, 110), ...EYEBROW }}>
            Inside YU ONE
          </p>
          <span aria-hidden className="mt-4 block h-px w-12 bg-[#222]/50" />
          <h2 className="mt-7 font-display" style={TITLE}>
            Eight parts.
            <br />
            One machine.
          </h2>
          <p className="mt-6 font-brand text-[#222]/70" style={BODY}>
            Light, air, UV and the lift live in the base. The frame hangs below it, and the frame is where your
            modules click in.
          </p>
        </div>

        {/* ---------- the three modules, hung out on a line ---------- */}
        <div data-beat="line" className="invisible absolute inset-x-[6vw] top-[11svh] opacity-0">
          <p className="font-display uppercase text-[#222]/80" style={{ ...vf(400, 110), ...EYEBROW }}>
            01 — Modules
          </p>
          <div aria-hidden className="mt-5 h-px w-full bg-[#222]/35" />
          <h2 className="flex gap-[2.6vw] font-display" style={{ ...TITLE, fontSize: "clamp(2rem, 4.2vw, 4.6rem)" }}>
            {MODULES.map((m, i) => (
              <span
                key={m.key}
                data-word={m.key}
                className="yu-hang block opacity-25"
                style={{ animationDuration: `${3.4 + i * 0.7}s`, animationDelay: `${-i * 1.1}s` }}
              >
                <Peg />
                {m.name}
              </span>
            ))}
          </h2>
        </div>

        {MODULES.map((m) => (
          <div
            key={m.key}
            data-module={m.key}
            className="invisible absolute bottom-[8svh] left-[6vw] max-w-[24rem] opacity-0 md:bottom-auto md:top-[48svh]"
          >
            <p className="font-display text-[#222]" style={{ ...vf(300, 100), fontSize: "clamp(1.3rem, 1.9vw, 2rem)", lineHeight: 1.1 }}>
              {m.lead}
            </p>
            <p className="mt-4 font-brand text-[#222]/70" style={BODY}>
              {m.body}
            </p>
            <p className="mt-3 font-brand text-[12px] text-[#222]/50">Shorter poles, down to 1 m, made to order.</p>
          </div>
        ))}

        {/* ---------- frame widths ---------- */}
        <div
          data-beat="frame"
          className="invisible absolute bottom-[8svh] left-[6vw] max-w-[30rem] opacity-0 md:bottom-auto md:top-[32svh]"
        >
          <p className="font-display uppercase text-[#222]/80" style={{ ...vf(400, 110), ...EYEBROW }}>
            The frame
          </p>
          <span aria-hidden className="mt-4 block h-px w-12 bg-[#222]/50" />
          <h2 className="mt-7 font-display" style={TITLE}>
            Two, three
            <br />
            or four across.
          </h2>
          <p className="mt-6 font-brand text-[#222]/70" style={BODY}>
            Choose a width for the space you have. Every slot takes any module, so the mix is yours and it can
            change later.
          </p>
          <ol
            className="mt-8 flex gap-7 font-display uppercase"
            style={{ ...vf(400, 105), fontSize: "clamp(0.62rem, 0.8vw, 0.85rem)", letterSpacing: "0.28em" }}
          >
            {[2, 3, 4].map((n) => (
              <li key={n} data-width={n} className="flex items-center gap-2 opacity-25">
                <span aria-hidden className="size-1.5 rounded-full bg-[#F0765A]" />
                {n} slots
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
