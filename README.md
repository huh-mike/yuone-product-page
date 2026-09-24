# YU ONE — product page hero

Next.js 16 (App Router) + Tailwind v4 reproduction of the YU ONE hero comp.

```bash
npm run dev    # http://localhost:3000
npm run build
```

## Structure

| File | What it does |
| --- | --- |
| [`src/components/hero.tsx`](src/components/hero.tsx) | The hero. Two layouts in one component (see below). |
| [`src/components/site-header.tsx`](src/components/site-header.tsx) | White nav bar — logo, centred links, icon cluster. |
| [`src/components/yuhome-logo.tsx`](src/components/yuhome-logo.tsx) | The lockup, inlined verbatim from `logoweb.svg`. |
| [`src/components/starfield.tsx`](src/components/starfield.tsx) | Seeded speck field (deterministic, so SSR and client agree). |
| [`scripts/prepare-product-image.py`](scripts/prepare-product-image.py) | Knocks the white studio backdrop out of a product render. |

### Two layouts, one comp

The layered composition — display headline behind the product, product cropping
its baseline, copy railing the left edge — only reads on a wide landscape
canvas. A `comp:` variant declared in [`globals.css`](src/app/globals.css) gates
it on `min-width: 1024px` **and** `min-aspect-ratio: 5/4`; anything narrower or
taller (phones, tablets in portrait) falls back to a stacked column.

## ⚠️ Swap in the real product render

`public/yu-one.png` is currently a **placeholder** — rendered here from
`Yuhome_Web_A_YuOne_01_G18.glb`, which has the rack retracted, so the pose does
not match the comp. To drop in the real hero render:

```bash
python3 scripts/prepare-product-image.py ~/path/to/yu-one-render.png
```

That flood-fills the white backdrop to transparent from the image border inward
(so the product's own white shell survives), trims the empty margin, and writes
`public/yu-one.png`. Then update `PRODUCT.width` / `PRODUCT.height` in
`hero.tsx` to the printed dimensions.

Because the script trims to the product's bounding box, the same `w-[62vw]`
sizing holds for any render — no re-tuning needed.

## Type

The brand's own faces weren't supplied, so these stand in:

- **Archivo** (variable `wght` 100–900 + `wdth` 62–125) for display type. The
  comp's headline is a condensed heavy grotesque; the `vf()` helper in
  `hero.tsx` sets both axes — `vf(800, 75)` for *THAT FITS*, `vf(400, 66)` for
  *YOU.*
- **Nunito Sans** for nav and UI — nearest widely available match to the
  `yuhome` wordmark's rounded geometric letterforms.

Swap either in [`src/app/layout.tsx`](src/app/layout.tsx); everything downstream
reads `--font-display` / `--font-brand`.

## Tuning knobs

All in `hero.tsx`, all in one place per element:

- Headline placement — `left`/`top` on *THAT FITS*, `left`/`bottom` on *YOU.*
- Headline size — the `clamp()` on `fontSize` (currently `17vw`)
- Product — `w-[62vw]`, `rotate-[4deg]`, `bottom-[10%]`
- Backdrop — the four `radial-gradient` layers at the top of the section
