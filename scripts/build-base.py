"""
Rebuild the base, Flow and UV Glow of the hero model from the designer's file.

    blender -b --factory-startup --python scripts/build-base.py -- <YUONE_Webpage_Refine_05.fbx> <out dir>

Refine_05 is the reference for the machine. Against the parts the hero was
first built from, it lowers the inner plate, Flow and UV Glow by 4 cm and
redraws Flow's underside. This takes those three parts (not the lifts, which
come from scripts/build-lift.py, nor the rack), bakes every Cinema 4D
transform into the mesh and writes them under plain, unscaled parents, so
the hero keeps its own layout:

  Base > Base___Net > Inner_Base, Lamp > deng_zhao_stp, dengkuang_stp, Extrude_2, Logos
  Flow > ... > FanBlade
  UV_Glow > ...

unit.tsx picks parts out by those names. On the way it:

  - names materials the way the site restyles them (materials.ts): Shell,
    ShellUnder, Panel (the glass light ring), Logo, Dark, Fan, AccentLED,
    UVLED, Poles; the shell's downward faces become ShellUnder;
  - splits Flow's merged `Group_4_5` back into the swinging vane (FanBlade:
    the 0.4 m spindle and the 0.38 m blade), the LED ring and the rest;
  - decimates the heavy meshes as the hero was (base 0.6, Flow 0.5), except the
    shell and the light ring, which keep every face (see below).

Writes base.glb into <out dir>; scripts/merge-base.mjs swaps it into
public/models/yu-one.glb.
"""
import bpy, bmesh, json, os, sys
from mathutils import Matrix

argv = sys.argv[sys.argv.index("--") + 1:]
SRC, OUT = argv[0], argv[1]

PARTS = ("Base", "Flow", "UV_Glow")
SKIP = ("Net", "Line")  # the scissor lifts: built by scripts/build-lift.py
DECIMATE = {"Base": 0.6, "Flow": 0.5}
HEAVY = 1000  # triangles; lighter meshes are left as they are
UNDER = -0.75  # world normal z below which a shell face counts as underside

bpy.ops.import_scene.fbx(filepath=SRC)
bpy.context.view_layer.update()


def root_of(o):
    while o.parent:
        o = o.parent
    return o


def under(o, names):
    while o:
        if o.name in names:
            return True
        o = o.parent
    return False


# ---------------------------------------------------------------- keep

keep = [o for o in bpy.data.objects if root_of(o).name in PARTS and not under(o, SKIP)]
for o in list(bpy.data.objects):
    if o not in keep:
        bpy.data.objects.remove(o)

# bake: every mesh carries its world transform, every object sits at identity
world = {o.name: o.matrix_world.copy() for o in keep}
parent = {o.name: o.parent.name if o.parent else None for o in keep}
for o in keep:
    if o.type == "MESH":
        o.data = o.data.copy()  # cloner instances share data
        o.data.transform(world[o.name])
        if world[o.name].determinant() < 0:
            o.data.flip_normals()
for o in keep:
    o.parent = None
    o.matrix_world = Matrix.Identity(4)
for o in keep:
    if parent[o.name]:
        o.parent = bpy.data.objects[parent[o.name]]
        o.matrix_parent_inverse = Matrix.Identity(4)

# empties with nothing beneath them are Cinema 4D leftovers (splines, nulls)
def has_mesh(o):
    return o.type == "MESH" or any(has_mesh(c) for c in o.children)

for o in list(bpy.data.objects):
    if not has_mesh(o) and o.name not in PARTS:
        bpy.data.objects.remove(o)

# ------------------------------------------------------------ materials

# drop the file's own materials (black placeholders), which would take the names below
for m in list(bpy.data.materials):
    bpy.data.materials.remove(m)
mats = {}


def mat(name):
    if name not in mats:
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        mats[name] = m
    return mats[name]


def assign(o, name):
    o.data.materials.clear()
    o.data.materials.append(mat(name))
    for p in o.data.polygons:
        p.material_index = 0


def meshes(o):
    return [c for c in [o, *o.children_recursive] if c.type == "MESH"]


obj = bpy.data.objects

# ---------------------------------------------------------- Flow's vane

grille = obj["Group_4_5"]
bm = bmesh.new()
bm.from_mesh(grille.data)
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


def size(island):
    xs, ys, _ = zip(*(v.co for v in island))
    return max(xs) - min(xs), max(ys) - min(ys)


def piece(name, wanted):
    """A new mesh object holding the islands `wanted` picks, cut from the grille."""
    picked = [i for i in islands if wanted(*size(i))]
    keep_verts = {v.index for i in picked for v in i}
    copy = bm.copy()
    copy.verts.ensure_lookup_table()
    bmesh.ops.delete(copy, geom=[v for v in copy.verts if v.index not in keep_verts], context="VERTS")
    me = bpy.data.meshes.new(name)
    copy.to_mesh(me)
    copy.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    o.parent = grille.parent
    return o, len(picked)


spindle, n_spindle = piece("Spindle", lambda x, y: 0.39 < x < 0.41 and y < 0.01)
blade, n_blade = piece("Blade", lambda x, y: 0.37 < x < 0.39 and 0.02 < y < 0.04)
led, n_led = piece("LED_2", lambda x, y: x > 0.49 and y > 0.09)
rest, n_rest = piece("Grille", lambda x, y: not (0.39 < x < 0.41 and y < 0.01) and not (0.37 < x < 0.39 and 0.02 < y < 0.04) and not (x > 0.49 and y > 0.09))
assert (n_spindle, n_blade, n_led) == (1, 1, 1), (n_spindle, n_blade, n_led)
bm.free()
bpy.data.objects.remove(grille)

fan_blade = bpy.data.objects.new("FanBlade", None)
bpy.context.scene.collection.objects.link(fan_blade)
fan_blade.parent = spindle.parent
spindle.parent = fan_blade
blade.parent = fan_blade

# -------------------------------------------------------------- assign

for o in meshes(obj["Base"]):
    assign(o, "Dark")
for o in meshes(obj["Flow"]):
    assign(o, "Fan")
assign(led, "AccentLED")
# UV Glow: the housing lost its material in Refine_05; it was the pole finish
for o in meshes(obj["UV_Glow"]):
    assign(o, "Poles")
assign(obj["Extrude_3_3"], "UVLED")
# the glass light ring under the shell, and the yuhome marks, each with a finish of its own
assign(meshes(obj["deng_zhao_stp"])[0], "Panel")
for o in meshes(obj["Logos"]):
    assign(o, "Logo")

# ------------------------------------------------------------- decimate

# the shell and the light ring keep every face: the ring's top edge tucks up behind the
# shell's thin outer wall, so a decimated wall lets the white show through in wedges,
# and the ring's long flat walls ripple once decimated
panel = meshes(obj["deng_zhao_stp"])[0]
shell = meshes(obj["dengkuang_stp"])[0]
tris_before = {}
for part, ratio in DECIMATE.items():
    for o in meshes(obj[part]):
        o.data.calc_loop_triangles()
        n = len(o.data.loop_triangles)
        tris_before[o.name] = n
        if n < HEAVY or o in (panel, shell):
            continue
        mod = o.modifiers.new("decimate", "DECIMATE")
        mod.ratio = ratio
        bpy.context.view_layer.objects.active = o
        with bpy.context.temp_override(object=o, active_object=o):
            bpy.ops.object.modifier_apply(modifier=mod.name)

# the shell's underside, after decimation so the split follows the final faces
shell.data.materials.clear()
shell.data.materials.append(mat("Shell"))
shell.data.materials.append(mat("ShellUnder"))
for p in shell.data.polygons:
    p.material_index = 1 if p.normal.z < UNDER else 0

# one flat material each, no textures
for o in bpy.data.objects:
    if o.type == "MESH":
        while o.data.uv_layers:
            o.data.uv_layers.remove(o.data.uv_layers[0])

# Blender suffixes clashing names with .001; the FBX names are what unit.tsx asks for
for want in ("Extrude_2", "Logos", "Inner_Base", "deng_zhao_stp", "dengkuang_stp", "FanBlade", "Flow", "UV_Glow", "Base"):
    assert want in obj, want

# --------------------------------------------------------------- export

os.makedirs(OUT, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=os.path.join(OUT, "base.glb"),
    export_format="GLB",
    export_animations=False,
    export_draco_mesh_compression_enable=False,
    export_yup=True,
    export_texcoords=False,
    export_apply=True,
)

stats = {}
for part in PARTS:
    ms = meshes(obj[part])
    for o in ms:
        o.data.calc_loop_triangles()
    stats[part] = {"meshes": len(ms), "tris": sum(len(o.data.loop_triangles) for o in ms)}
under_faces = sum(1 for p in shell.data.polygons if p.material_index == 1)
print("BASE " + json.dumps({
    "parts": stats,
    "flow_split": {"spindle": n_spindle, "blade": n_blade, "led": n_led, "rest": n_rest},
    "shell_faces": len(shell.data.polygons),
    "shell_under": under_faces,
    "materials": sorted(mats),
}))
