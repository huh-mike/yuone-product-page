/**
 * Render the stills the page shows on machines that cannot draw the unit live
 * (src/components/experience/stills.tsx).
 *
 *   node capture-stills.mjs <out dir> [page url]
 *
 * Opens the page in headless Chrome with the GPU, walks to every position in
 * STILL_AT and screenshots the canvas layer alone (the unit with its labels and
 * dimension lines) on a transparent background, once per viewport in
 * STILL_SETS. Writes <out dir>/<set>/<nn>.webp. Point it at `npm run dev`
 * (default http://localhost:3000): it needs the development hook
 * window.__yu, which also supplies the positions and viewports, so the page
 * stays the single source of both.
 *
 * Re-run it whenever the model, the materials, the lighting or the
 * choreography change, or the stills will show the old unit.
 *
 * Needs puppeteer-core and Google Chrome, which are not project dependencies:
 * run it from a folder that has puppeteer-core installed.
 */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const [outDir, base = "http://localhost:3000/"] = process.argv.slice(2);
if (!outDir) {
  console.error("usage: node capture-stills.mjs <out dir> [page url]");
  process.exit(1);
}

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const url = new URL(base);
// live 3D, whatever this machine's GPU would otherwise get
url.searchParams.set("3d", "1");

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--use-angle=metal"] });

/** Jump the damped rig and the scrubbed timelines to where the page is scrolled; repeat while frames are slow. */
const settle = async (page, n) => {
  for (let i = 0; i < n; i++) {
    await page.evaluate(() => window.__yu.settle());
    await sleep(500);
  }
};

const page = await browser.newPage();
await page.goto(url, { waitUntil: "networkidle2", timeout: 180000 });
const { at, sets } = await page.evaluate(() => window.__yu.stills);

for (const [name, view] of Object.entries(sets)) {
  await page.setViewport({ width: view.width, height: view.height, deviceScaleFactor: view.scale });
  await page.goto(url, { waitUntil: "networkidle2", timeout: 180000 });
  // the model decodes, the entrance plays out
  await sleep(6000);
  // nothing but the canvas layer, on transparent
  await page.addStyleTag({
    content: `html, body { background: transparent !important; }
      body * { visibility: hidden !important; }
      [data-canvas], [data-canvas] * { visibility: visible !important; }`,
  });
  fs.mkdirSync(path.join(outDir, name), { recursive: true });

  for (const [i, T] of at.entries()) {
    await page.evaluate((T) => {
      const ids = ["hero", "modules", "care", "control", "build"];
      const k = Math.min(Math.floor(T), ids.length - 1);
      const el = document.getElementById(ids[k]);
      const top = el.getBoundingClientRect().top + window.scrollY;
      const vh = window.innerHeight;
      // the hero counts from the top of the page; every later section from when it enters
      const start = k === 0 ? top : top - vh;
      const end = top + el.offsetHeight - vh;
      window.scrollTo(0, start + (T - k) * (end - start));
    }, T);
    await settle(page, 8);
    const file = path.join(outDir, name, `${String(i).padStart(2, "0")}.webp`);
    await page.screenshot({ path: file, type: "webp", quality: 82, omitBackground: true });
    console.log(name, T, file, `${Math.round(fs.statSync(file).size / 1024)} KB`);
  }
}

await browser.close();
