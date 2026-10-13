/**
 * Swap the base, Flow and UV Glow in the hero model for the ones rebuilt
 * from the designer's file.
 *
 *   node merge-base.mjs <hero.glb> <base.glb> <out.glb>
 *
 * Removes the old `Base`, `Flow` and `UV_Glow` subtrees and adds the ones
 * from scripts/build-base.py. The lifts, the rack and every clip are carried
 * over untouched. Materials that share a name with one the hero already has
 * are folded into it, so the site restyles each name once.
 *
 * Needs @gltf-transform/core, /extensions, /functions and draco3dgltf, which
 * are not project dependencies: run it from a folder that has them installed.
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { mergeDocuments, prune, unpartition } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";

const PARTS = ["Base", "Flow", "UV_Glow"];

const [heroPath, basePath, outPath] = process.argv.slice(2);
if (!heroPath || !basePath || !outPath) {
  console.error("usage: node merge-base.mjs <hero.glb> <base.glb> <out.glb>");
  process.exit(1);
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "draco3d.decoder": await draco3d.createDecoderModule(),
  "draco3d.encoder": await draco3d.createEncoderModule(),
});

const hero = await io.read(heroPath);
const base = await io.read(basePath);
const root = hero.getRoot();
const scene = root.getDefaultScene() ?? root.listScenes()[0];

// the old parts: scene roots by name, with everything beneath them
const stale = [];
for (const node of scene.listChildren()) {
  if (PARTS.includes(node.getName())) node.traverse((n) => stale.push(n));
}
const removed = stale.length;
for (const node of stale) node.dispose();

// materials the hero keeps (the rack and lifts use Dark and Poles)
const kept = new Map(root.listMaterials().map((m) => [m.getName(), m]));

const map = mergeDocuments(hero, base);

// the new parts go first, where the old ones were, so a lookup by name finds them before the rack's
const added = [];
for (const extra of root.listScenes()) {
  if (extra === scene) continue;
  for (const child of extra.listChildren()) added.push(child);
  extra.dispose();
}
const rest = scene.listChildren();
for (const child of rest) scene.removeChild(child);
for (const child of [...added, ...rest]) scene.addChild(child);

for (const material of base.getRoot().listMaterials()) {
  const copy = map.get(material);
  const same = kept.get(material.getName());
  if (!copy || !same || same === copy || same.isDisposed()) continue;
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) if (prim.getMaterial() === copy) prim.setMaterial(same);
  }
}

await hero.transform(unpartition(), prune({ keepLeaves: true }));
await io.write(outPath, hero);

console.log(
  JSON.stringify({
    removed,
    roots: scene.listChildren().map((n) => n.getName()),
    nodes: root.listNodes().length,
    meshNodes: root.listNodes().filter((n) => n.getMesh()).length,
    materials: root.listMaterials().map((m) => m.getName()),
    animations: root.listAnimations().map((a) => `${a.getName()} (${a.listChannels().length})`),
  }),
);
