/**
 * Swap the scissor lifts in the hero model for the rebuilt ones.
 *
 *   node merge-lift.mjs <hero.glb> <lift.glb> <out.glb>
 *
 * Removes the old `Net` and `Line` subtrees, adds the `Lift` tree and its
 * "Lift" clip from scripts/build-lift.py, and writes the result with Draco.
 * Everything else in the hero model, including the module clips, is carried
 * over untouched.
 *
 * Needs @gltf-transform/core, /extensions, /functions and draco3dgltf, which
 * are not project dependencies: run it from a folder that has them installed.
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { mergeDocuments, prune, unpartition } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";

const [heroPath, liftPath, outPath] = process.argv.slice(2);
if (!heroPath || !liftPath || !outPath) {
  console.error("usage: node merge-lift.mjs <hero.glb> <lift.glb> <out.glb>");
  process.exit(1);
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "draco3d.decoder": await draco3d.createDecoderModule(),
  "draco3d.encoder": await draco3d.createEncoderModule(),
});

const hero = await io.read(heroPath);
const lift = await io.read(liftPath);
const root = hero.getRoot();

const stale = [];
for (const node of root.listNodes()) {
  if (["Net", "Line", "Lift"].includes(node.getName())) node.traverse((n) => stale.push(n));
}
for (const anim of root.listAnimations()) if (anim.getName() === "Lift") anim.dispose();
for (const node of stale) node.dispose();

const scene = root.getDefaultScene() ?? root.listScenes()[0];
const map = mergeDocuments(hero, lift);

for (const extra of root.listScenes()) {
  if (extra === scene) continue;
  for (const child of extra.listChildren()) scene.addChild(child);
  extra.dispose();
}

// the lift uses the hero's own "Dark", so the site restyles both as one
const dark = root.listMaterials().find((m) => m.getName() === "Dark");
for (const material of lift.getRoot().listMaterials()) {
  const copy = map.get(material);
  if (!dark || copy === dark) continue;
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) if (prim.getMaterial() === copy) prim.setMaterial(dark);
  }
}

await hero.transform(unpartition(), prune({ keepLeaves: true }));
await io.write(outPath, hero);

const meshes = root.listNodes().filter((n) => n.getMesh()).length;
console.log(
  JSON.stringify({
    removed: stale.length,
    nodes: root.listNodes().length,
    meshNodes: meshes,
    materials: root.listMaterials().map((m) => m.getName()),
    animations: root.listAnimations().map((a) => `${a.getName()} (${a.listChannels().length})`),
    scenes: root.listScenes().length,
  }),
);
