"""
Swap the base, Flow and UV Glow in the AR model for the ones rebuilt from the
designer's file, and give it the product's finishes.

    blender -b --factory-startup --python scripts/patch-usdz-base.py -- <in.usdz> <base.glb> <out.usdz>

The AR model is one joined mesh. The old base is found as loose pieces: every
piece in a base-only material (shell, fan, LEDs), and every dark or pole piece
that sits wholly in the base outside the two lift columns (inner plates, logos,
UV Glow's housing). Those are removed and the parts from scripts/build-base.py
put in their place, in the same materials as the site:

  - Shell, ShellUnder: satin black;
  - Panel: the light ring, frosted white acrylic (磨砂), no shine;
  - Logo: the yuhome marks, a gloss finish on the black.
"""
import bpy, bmesh, json, sys
from mathutils import Matrix, Vector

SRC, BASE, OUT = sys.argv[sys.argv.index("--") + 1:]

# the base, in the source model's own space (metres, base top at z = 0)
BASE_BOTTOM = -0.16
# the lift columns, which keep their pieces
COL_X_MIN, COL_X_MAX, COL_Y_MAX = 0.295, 0.335, 0.115
BASE_ONLY = ("Shell", "ShellUnder", "Fan", "AccentLED", "UVLED")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.usd_import(filepath=SRC)
unit = next(o for o in bpy.data.objects if o.type == "MESH")
mesh = unit.data
slot = {m.name.removeprefix("K_"): i for i, m in enumerate(mesh.materials) if m}

# the model was lifted to stand on z = 0: the top of the shell is the top of the base
shell_top = max(
    (unit.matrix_world @ mesh.vertices[v].co).z
    for p in mesh.polygons if p.material_index == slot["Shell"] for v in p.vertices
)
UP = shell_top - 0.0001

bm = bmesh.new()
bm.from_mesh(mesh)
bm.verts.ensure_lookup_table()

seen, islands = set(), []
for v in bm.verts:
    if v.index in seen:
        continue
    stack, island = [v], []
    seen.add(v.index)
    while stack:
        a = stack.pop()
        island.append(a)
        for e in a.link_edges:
            b = e.other_vert(a)
            if b.index not in seen:
                seen.add(b.index)
                stack.append(b)
    islands.append(island)

base_only = {slot[n] for n in BASE_ONLY if n in slot}
stale = []
for island in islands:
    mats = {f.material_index for v in island for f in v.link_faces}
    xs, ys, zs = zip(*(v.co for v in island))
    lo, hi = Vector((min(xs), min(ys), min(zs) - UP)), Vector((max(xs), max(ys), max(zs) - UP))
    in_column = (
        lo.x * hi.x > 0 and min(abs(lo.x), abs(hi.x)) >= COL_X_MIN and max(abs(lo.x), abs(hi.x)) <= COL_X_MAX
        and max(abs(lo.y), abs(hi.y)) <= COL_Y_MAX
    )
    if mats & base_only or (lo.z >= BASE_BOTTOM and not in_column):
        stale.append(island)

removed = sum(len(i) for i in stale)
bmesh.ops.delete(bm, geom=[v for i in stale for v in i], context="VERTS")

# ---------------------------------------------------------- new base


def material(name):
    """The slot for a site material name, adding one to the unit if it is new."""
    if name not in slot:
        m = bpy.data.materials.new("K_" + name)
        m.use_nodes = True
        mesh.materials.append(m)
        slot[name] = len(mesh.materials) - 1
    return slot[name]


before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=BASE)
added = 0
for o in set(bpy.data.objects) - before:
    if o.type != "MESH":
        continue
    tmp = o.data.copy()
    tmp.transform(Matrix.Translation((0, 0, UP)) @ o.matrix_world)
    names = [o.material_slots[p.material_index].material.name.split(".")[0] for p in tmp.polygons]
    smooth = [p.use_smooth for p in tmp.polygons]
    first = len(bm.faces)
    bm.from_mesh(tmp)
    bm.faces.ensure_lookup_table()
    for f, name, s in zip(bm.faces[first:], names, smooth):
        f.material_index = material(name)
        f.smooth = s
    added += len(tmp.vertices)
    bpy.data.meshes.remove(tmp)
for o in set(bpy.data.objects) - before:
    bpy.data.objects.remove(o)

bm.to_mesh(mesh)
bm.free()
mesh.update()

# ------------------------------------------------------------ finishes


def srgb(hex_):
    c = [int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1.0]


FINISH = {
    "Shell": dict(color="#16171b", roughness=0.42, metallic=0.15),
    "ShellUnder": dict(color="#16171b", roughness=0.42, metallic=0.15),
    "Panel": dict(color="#f2f0eb", roughness=1.0, metallic=0.0),
    "Logo": dict(color="#3a3b41", roughness=0.12, metallic=0.85),
}
for name, f in FINISH.items():
    m = mesh.materials[material(name)]
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = srgb(f["color"])
    b.inputs["Roughness"].default_value = f["roughness"]
    b.inputs["Metallic"].default_value = f["metallic"]
    b.inputs["Emission Strength"].default_value = 0.0
    if name == "Panel":
        b.inputs["Specular IOR Level"].default_value = 0.0  # frosted: no shine

bpy.ops.wm.usd_export(filepath=OUT, export_animation=False, export_materials=True, selected_objects_only=False)
print("USDZ " + json.dumps({
    "islands": len(islands), "removed_pieces": len(stale), "removed_verts": removed, "added_verts": added,
    "up": round(UP, 4), "verts": len(mesh.vertices), "materials": [m.name for m in mesh.materials],
}))
