import Image from "next/image";
import { Starfield } from "./starfield";

/** Archivo is variable on wght + wdth; the display type runs condensed. */
const vf = (wght: number, wdth: number) => ({
  fontVariationSettings: `"wght" ${wght}, "wdth" ${wdth}`,
  fontWeight: wght,
});

const KICKER = "Build the drying rack";
const HEADLINE_A = "THAT FITS";
const HEADLINE_B = "YOU.";
const SUPPORT = ["Start with YU ONE.", "Add as you grow."];

const GRADIENT_TEXT = {
  backgroundImage:
    "linear-gradient(174deg, #dcdde1 0%, #b6b8bc 32%, #85888d 62%, #43474e 100%)",
  WebkitBackgroundClip: "text" as const,
  backgroundClip: "text" as const,
};

const PRODUCT = {
  src: "/yu-one.png",
  width: 1586,
  height: 711,
  alt: "YU ONE automated laundry system with the drying rack extended",
};

/**
 * YU ONE hero.
 *
 * On a wide landscape canvas this reproduces the layered comp — the display
 * headline sits behind the product render, which crops its baseline, while the
 * copy rails the left edge. Narrower or taller viewports stack the same
 * elements into one readable column.
 */
export function Hero() {
  return (
    <section className="relative isolate flex min-h-[max(600px,calc(100svh-3.5rem))] flex-col overflow-hidden bg-[#080a0e] text-white">
      {/* ---------------- backdrop ---------------- */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 82% at 50% -22%, #1a222d 0%, #11161e 40%, #090c11 74%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(72% 58% at 45% 104%, rgba(214,86,42,0.62) 0%, rgba(150,54,28,0.34) 30%, rgba(74,28,18,0.16) 52%, rgba(9,12,17,0) 76%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(42% 36% at 52% 48%, rgba(126,146,178,0.12) 0%, rgba(9,12,17,0) 72%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 110% at 50% 45%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      <Starfield />

      {/* accent specks + scroll rail (desktop comp only) */}
      <span
        aria-hidden
        className="absolute left-[55.7%] top-[26%] hidden size-[9px] rounded-full bg-[#F0765A] comp:block"
        style={{ boxShadow: "0 0 16px 4px rgba(240,118,90,0.5)" }}
      />
      <span
        aria-hidden
        className="absolute left-[86.9%] top-[7.4%] hidden size-[4px] rounded-full bg-[#F0765A]/70 comp:block"
      />
      <div
        aria-hidden
        className="absolute right-[3.9vw] top-[11.8%] bottom-[3.5%] hidden comp:block"
      >
        <span className="absolute left-1/2 top-0 size-[7px] -translate-x-1/2 rounded-full bg-[#F0765A]" />
        <span className="absolute left-1/2 top-[15px] bottom-0 w-px -translate-x-1/2 bg-white/20" />
      </div>

      <h1 className="sr-only">
        {KICKER} {HEADLINE_A} {HEADLINE_B} {SUPPORT.join(" ")}
      </h1>

      {/* ============ wide + landscape: layered comp ============ */}
      <div className="hidden comp:contents">
        {/* display headline — sits behind the product */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10 font-display">
          <span
            className="absolute left-[5.2vw] top-[8.8%] block whitespace-nowrap leading-[0.78] tracking-[0.005em] text-transparent"
            style={{
              ...vf(800, 75),
              fontSize: "clamp(4rem, 17vw, 21rem)",
              ...GRADIENT_TEXT,
            }}
          >
            {HEADLINE_A}
          </span>
          <span
            className="absolute bottom-[6.6%] left-[63.5%] block whitespace-nowrap leading-[0.78] text-[#efe7da]"
            style={{ ...vf(400, 66), fontSize: "clamp(4rem, 17vw, 21rem)" }}
          >
            {HEADLINE_B}
          </span>
        </div>

        {/* product */}
        <div className="pointer-events-none absolute inset-x-0 bottom-[10%] z-20 flex justify-center">
          <Image
            {...PRODUCT}
            priority
            sizes="70vw"
            className="w-[62vw] max-w-[1060px] translate-x-[-1%] rotate-[4deg] drop-shadow-[0_40px_90px_rgba(0,0,0,0.6)]"
          />
        </div>

        {/* copy */}
        <div className="relative z-30 flex flex-1 flex-col justify-between px-[6.3vw] pt-[7svh] pb-[9svh]">
          <p
            aria-hidden
            className="font-display uppercase text-white/90"
            style={{
              ...vf(500, 100),
              fontSize: "clamp(0.6rem, 0.8vw, 0.9rem)",
              letterSpacing: "0.36em",
            }}
          >
            {KICKER}
          </p>
          <div
            aria-hidden
            className="font-display uppercase leading-[2.2] text-white/85"
            style={{
              ...vf(400, 100),
              fontSize: "clamp(0.6rem, 0.8vw, 0.9rem)",
              letterSpacing: "0.3em",
            }}
          >
            {SUPPORT.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      </div>

      {/* ============ everything else: stacked ============ */}
      <div
        aria-hidden
        className="relative z-10 flex flex-1 flex-col px-6 pt-9 pb-10 comp:hidden"
      >
        <p
          className="font-display text-[11px] uppercase tracking-[0.3em] text-white/90"
          style={vf(500, 100)}
        >
          {KICKER}
        </p>

        <div className="mt-5 font-display leading-[0.84]">
          <span
            className="block text-transparent"
            style={{ ...vf(800, 78), fontSize: "clamp(2.75rem, 14vw, 4.5rem)", ...GRADIENT_TEXT }}
          >
            {HEADLINE_A}
          </span>
          <span
            className="block text-[#efe7da]"
            style={{ ...vf(400, 70), fontSize: "clamp(3.5rem, 19vw, 6rem)" }}
          >
            {HEADLINE_B}
          </span>
        </div>

        <div className="relative -mx-6 flex flex-1 items-center justify-center">
          <Image
            {...PRODUCT}
            priority
            sizes="115vw"
            className="w-[115%] max-w-none rotate-[4deg] drop-shadow-[0_24px_54px_rgba(0,0,0,0.6)]"
          />
        </div>

        <div
          className="font-display text-[11px] uppercase leading-[2.2] tracking-[0.26em] text-white/85"
          style={vf(400, 100)}
        >
          {SUPPORT.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
