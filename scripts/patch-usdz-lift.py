"""
Swap the scissor lifts in the AR model for the rebuilt ones.

    blender -b --factory-startup --python scripts/patch-usdz-lift.py -- <in.usdz> <lift.blend> <out.usdz>

The AR model is one joined mesh, so the old lifts are found as loose pieces
that sit wholly inside the two lift columns, removed, and replaced with the
rest pose of the lift from scripts/build-lift.py.
"""
import bpy, bmesh, json, sys
from mathutils import Matrix, Vector

SRC, LIFT, OUT = sys.argv[sys.argv.index("--") + 1:]

# the lift columns in the source model's own space (metres, base top at z = 0)
X_MIN, X_MAX = 0.300, 0.330
Y_MAX = 0.110
Z_MIN, Z_MAX = -0.370, -0.005
CABLE_TOP = -0.02

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.usd_import(filepath=SRC)
unit = next(o for o in bpy.data.objects if o.type == "MESH")
mesh = unit.data
dark = next(i for i, m in enumerate(mesh.materials) if m and m.name.endswith("Dark"))

bm = bmesh.new()
bm.from_mesh(mesh)
bm.verts.ensure_lookup_table()

# loose pieces
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


def box(island):
    xs, ys, zs = zip(*(v.co for v in island))
    return Vector((min(xs), min(ys), min(zs))), Vector((max(xs), max(ys), max(zs)))


# the model was lifted to stand on z = 0: find by how much from a cable,
# the only thin full-height piece in a lift column
cable = [
    box(i) for i in islands
    if (box(i)[1].x - box(i)[0].x) < 0.006 and (box(i)[1].y - box(i)[0].y) < 0.006 and (box(i)[1].z - box(i)[0].z) > 0.25
]
assert cable, "no cable found"
UP = cable[0][1].z - CABLE_TOP

stale = []
for island in islands:
    mn, mx = box(island)
    if not all(f.material_index == dark for v in island for f in v.link_faces):
        continue
    side = mn.x if mn.x > 0 else -mx.x
    far = mx.x if mn.x > 0 else -mn.x
    inside = (
        mn.x * mx.x > 0 and side >= X_MIN and far <= X_MAX
        and max(abs(mn.y), abs(mx.y)) <= Y_MAX
        and mn.z - UP >= Z_MIN and mx.z - UP <= Z_MAX
    )
    if inside:
        stale.append(island)

removed = sum(len(i) for i in stale)
bmesh.ops.delete(bm, geom=[v for i in stale for v in i], context="VERTS")

# rebuilt lift, rest pose
with bpy.data.libraries.load(LIFT) as (src, dst):
    dst.objects = list(src.objects)
added = 0
for o in dst.objects:
    if o is None or o.type != "MESH":
        continue
    world = Matrix.Translation((0, 0, UP)) @ Matrix.Translation(o.location)
    tmp = o.data.copy()
    tmp.transform(world)
    first = len(bm.faces)
    bm.from_mesh(tmp)
    bm.faces.ensure_lookup_table()
    for f in bm.faces[first:]:
        f.material_index = dark
        f.smooth = True
    added += len(tmp.vertices)
    bpy.data.meshes.remove(tmp)

bm.to_mesh(mesh)
bm.free()
mesh.update()

for o in list(bpy.data.objects):
    if o.name.startswith("Lift"):
        bpy.data.objects.remove(o)

bpy.ops.wm.usd_export(filepath=OUT, export_animation=False, export_materials=True, selected_objects_only=False)
print("USDZ " + json.dumps({"islands": len(islands), "removed_pieces": len(stale), "removed_verts": removed, "added_verts": added, "up": round(UP, 4), "verts": len(mesh.vertices)}))
