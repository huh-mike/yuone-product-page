# YU ONE on yuhome.com.sg

How the YU ONE experience is embedded in the Shopify theme, for whoever
maintains the theme.

## Why not the usual iframe height snippet

The experience is driven by scrolling. Grown to its full height (the usual
`postMessage` height snippet), the iframe would never scroll, so the animation
would never start. Its sections are also sized in screen heights, so growing
the frame would grow them again, without end.

Instead, the store page owns the scroll and the experience follows it:

- The iframe is one screen tall and pinned (`position: sticky`) inside a
  wrapper as tall as the whole experience.
- Visitors scroll the store page as normal, so the header hides on the way down
  and comes back on the way up, and the footer follows the experience.
- A small script tells the experience how far into the wrapper the visitor is,
  and the experience scrolls itself to match. The experience reports its height,
  so the wrapper always fits it.

## Setting it up

1. Copy [`sections/yu-one-experience.liquid`](sections/yu-one-experience.liquid)
   into the theme's `sections/` folder.
2. On the YU ONE page template, add the **YU ONE experience** section between
   the header and the footer, and remove the old iframe.
3. Leave **Experience address** as `https://yuone-product-page.vercel.app/`
   unless the experience moves.

It works in a theme preview (`?preview_theme_id=…` on yuhome.com.sg, or the
`*.myshopify.com` domain); other domains are ignored by the experience.

## Things to check

- **No clipping parents.** `position: sticky` stops working when an element
  around the section has `overflow: hidden`, `auto` or `scroll`. If the
  experience scrolls away instead of staying pinned, look for that on
  `main` or the page wrapper (`overflow-x: clip` is a safe replacement).
- **Header on top.** The header sits over the top of the experience while it is
  showing, as on any page with a sticky header.
- **Share links.** "Copy link to this build" now copies the store page's
  address with `?rack=…#build`; opening it shows that build. The section passes
  both through to the experience.
- **Buy now** opens the product page in the same tab, outside the frame.

## If the section is not added

The experience still works in a plain iframe: it then scrolls inside the frame
as before, and the header will not react to it.
