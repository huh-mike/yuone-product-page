import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Archivo is variable on wght + wdth. */
export const vf = (wght: number, wdth: number) => ({
  fontVariationSettings: `"wght" ${wght}, "wdth" ${wdth}`,
  fontWeight: wght,
});

export const EYEBROW = {
  fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
  letterSpacing: "0.42em",
};

export const TITLE = {
  ...vf(200, 100),
  fontSize: "clamp(2rem, 4vw, 4.2rem)",
  lineHeight: 1.02,
};

export const BODY = {
  fontSize: "clamp(0.95rem, 1.1vw, 1.15rem)",
  fontWeight: 300,
  lineHeight: 1.5,
};

/**
 * A scrubbed timeline for one section, one unit long, so positions read as
 * the section's progress: the same number the 3D choreography is keyed on.
 * Progress runs from the section entering the viewport to its end, which
 * means the pinned part starts at 100 / (section height in svh).
 */
export function sectionTimeline(el: HTMLElement, reduced: boolean) {
  const q = gsap.utils.selector(el);
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: { trigger: el, start: "top bottom", end: "bottom bottom", scrub: reduced ? true : 0.5 },
  });
  tl.set({}, {}, 1);

  // reduced motion: beats still swap, but nothing travels
  const rise = reduced ? 0 : 44;
  const show = (sel: string, at: number, dur = 0.04) =>
    tl.fromTo(q(sel), { autoAlpha: 0, y: rise }, { autoAlpha: 1, y: 0, duration: dur }, at);
  const hide = (sel: string, at: number, dur = 0.035) => tl.to(q(sel), { autoAlpha: 0, y: -rise * 0.8, duration: dur }, at);
  /** Bring a list item to full strength and back, like the hero's module steps. */
  const lift = (sel: string, from: number, to: number) =>
    tl.fromTo(q(sel), { opacity: 0.25 }, { opacity: 1, duration: 0.015 }, from).to(q(sel), { opacity: 0.25, duration: 0.015 }, to);

  return { tl, q, show, hide, lift };
}
