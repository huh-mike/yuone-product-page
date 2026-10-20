/**
 * Thin out the rack and the scissor lifts, the parts that cost the most to draw.
 *
 *   node simplify-models.mjs <in.glb> <out.glb> <error mm> [root names…]
 *
 * Every mesh under the named roots (all meshes when none are named) is welded
 * and simplified with meshoptimizer, moving no surface by more than `error`
 * millimetres in the assembled model. The tolerance is absolute on purpose:
 * the hero's modules are split into dozens of small meshes, and a tolerance
 * relative to each mesh's own size would leave the small ones untouched.
 * The base, shell, light ring, Flow and UV Glow are never touched: the shell
 * and ring show wedges when decimated.
 * Writes with Draco, like the other model scripts.
 *
 * Hero:  node simplify-models.mjs yu-one.glb out.glb 1 Rack Lift
 * Kit:   node simplify-models.mjs yu-one-kit.glb out.glb 1
 *
 * Needs @gltf-transform/core, /extensions, /functions, draco3dgltf and
 * meshoptimizer, which are not project dependencies: run it from a folder
 * that has them installed.
 */
import { NodeIO, getBounds } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { simplifyPrimitive, weldPrimitive } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";
import { MeshoptSimplifier } from "meshoptimizer";

const [inPath, outPath, errorArg, ...roots] = process.argv.slice(2);
const errorM = Number(errorArg) / 1000;
if (!inPath || !outPath || !(errorM > 0)) {
  console.error("usage: node simplify-models.mjs <in.glb> <out.glb> <error mm> [root names…]");
  process.exit(1);
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "draco3d.decoder": await draco3d.createDecoderModule(),
  "draco3d.encoder": await draco3d.createEncoderModule(),
});
await MeshoptSimplifier.ready;

const doc = await io.read(inPath);
const root = doc.getRoot();

const triangles = (prim) => (prim.getIndices() ?? prim.getAttribute("POSITION")).getCount() / 3;

// the meshes to thin: under the named roots, and used nowhere else
const inside = new Set();
const outside = new Set();
/** Each mesh's size in the assembled model, metres: the smallest it is drawn at. */
const extent = new Map();
for (const scene of root.listScenes()) {
  const walk = (node, under) => {
    const here = under || roots.length === 0 || roots.includes(node.getName());
    const mesh = node.getMesh();
    if (mesh) {
      (here ? inside : outside).add(mesh);
      const { min, max } = getBounds(node);
      const size = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
      extent.set(mesh, Math.min(extent.get(mesh) ?? Infinity, size));
    }
    for (const child of node.listChildren()) walk(child, here);
  };
  for (const node of scene.listChildren()) walk(node, false);
}

let before = 0;
let after = 0;
for (const mesh of inside) {
  if (outside.has(mesh)) {
    console.warn(`skipping ${mesh.getName()}: also used outside ${roots.join(", ")}`);
    continue;
  }
  // meshoptimizer takes the tolerance relative to the mesh's own size
  const error = Math.min(1, errorM / Math.max(extent.get(mesh), 1e-6));
  for (const prim of mesh.listPrimitives()) {
    before += triangles(prim);
    weldPrimitive(prim);
    simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: 0, error, lockBorder: false });
    after += triangles(prim);
  }
}

await io.write(outPath, doc);
console.log(JSON.stringify({ meshes: inside.size, before: Math.round(before), after: Math.round(after) }));
