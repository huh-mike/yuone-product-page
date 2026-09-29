"""
Rebuild the YU ONE scissor lifts from Base.fbx and bake their motion.

    blender -b --factory-startup --python scripts/build-lift.py -- <Base.fbx> <out dir>

Base.fbx carries the lifts as live Cinema 4D cloners and instances: the lift
on -X is complete, the one on +X has lost one arm of every stage but the
first, the parents carry mirrored and non-uniform scale, and nothing is
animated. This keeps the complete lift arm for arm, bakes every transform
into the mesh, mirrors it to +X, and keys the mechanism:

  - the top pin P is fixed to the base;
  - each stage is two arms crossing on a centre pin, stages share end pins;
  - two short links hang the first stage from P.

One clip, "Lift", runs from the rack fully up (frame 0) to TRAVEL metres
lower (last frame), linear in rack height, so a rack height maps straight to
a clip time.

Writes lift.glb (merged into the hero model by scripts/merge-lift.mjs),
lift.fbx (for Cinema 4D) and lift.blend into <out dir>.
"""
import bpy, bmesh, json, math, os, sys
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SRC = argv[0] if argv else os.path.expanduser("~/Downloads/Yu One 3D Files 2/Base.fbx")
OUT = argv[1] if len(argv) > 1 else os.getcwd()

TRAVEL = 0.9   # metres of rack travel the clip covers
FRAMES = 45    # one key every 2 cm
FPS = 24
STAGES = 7

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=SRC)
bpy.context.view_layer.update()
src = bpy.data.objects


def meshes_of(o):
    return [c for c in [o, *o.children_recursive] if c.type == "MESH"]


def origin(o):
    return o.matrix_world.translation.copy()


# ---------------------------------------------------------------- measure

def stage_groups(cloner):
    """The seven clones of one cloner, top stage first."""
    groups = [g for g in src[cloner].children if meshes_of(g)]
    assert len(groups) == STAGES, (cloner, len(groups))
    return sorted(groups, key=lambda g: -origin(g).z)


def measure_arm(group):
    """Centre pin, and the end pin that carries this arm's screw."""
    arm = max(meshes_of(group), key=lambda m: len(m.data.vertices))
    centre = origin(arm)
    screws = [m for m in meshes_of(group) if m is not arm]
    end = max(screws, key=lambda s: (origin(s) - centre).length)
    return centre, origin(end) - centre


layers = {"A": stage_groups("Cloner_2"), "B": stage_groups("Cloner_Instance")}
arms = []  # (layer, stage, group, centre, to_end)
for layer, groups in layers.items():
    for k, g in enumerate(groups):
        c, e = measure_arm(g)
        arms.append((layer, k, g, c, e))

HALF = sum(Vector((e.y, e.z)).length for *_, e in arms) / len(arms)  # centre pin to end pin
centres = sorted({round(c.z, 5) for *_, c, _ in arms}, reverse=True)
PITCH = (centres[0] - centres[-1]) / (STAGES - 1)                    # centre pin to centre pin
C0_REST = centres[0]
THETA_REST = math.asin(PITCH / 2 / HALF)

link_src = src["Net_4"]
link_parts = meshes_of(link_src)
Q_REST = origin(link_src)
P = origin(max((m for m in link_parts if m is not link_src), key=lambda s: origin(s).z))
P = Vector((P.x, 0.0, P.z))
LINK = Vector((Q_REST.y - P.y, Q_REST.z - P.z)).length
q = Vector((Q_REST.y, Q_REST.z - C0_REST))
Q_DIST = q.length
# the link pin sits a little off the arm's centre line; keep that offset
Q_LEAD = math.atan2(q.y, -q.x) - THETA_REST
LINK_B_DX = origin(src["Net_1_instance_2"]).x - Q_REST.x

cables = sorted((m for m in meshes_of(src["Line"]) if len(m.data.vertices) > 40), key=lambda m: origin(m).x)


def c0(theta):
    """Height of the first centre pin: the links hold it under P."""
    u = Q_DIST * math.cos(theta + Q_LEAD)
    v = Q_DIST * math.sin(theta + Q_LEAD)
    return P.z - v - math.sqrt(LINK * LINK - u * u)


def bottom(theta):
    """Height of the lowest end pins, where the rack hangs."""
    return c0(theta) - (2 * STAGES - 1) * HALF * math.sin(theta)


BOTTOM_REST = bottom(THETA_REST)


def solve(extension):
    lo, hi = THETA_REST, math.radians(89)
    for _ in range(60):
        mid = (lo + hi) / 2
        if bottom(mid) > BOTTOM_REST - extension:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


# ------------------------------------------------------------------ build

scene = bpy.data.scenes.new("Lift")
bpy.context.window.scene = scene
scene.render.fps = FPS
scene.frame_start, scene.frame_end = 0, FRAMES
dark = bpy.data.materials.new("Dark")
dark.use_nodes = True
next(n for n in dark.node_tree.nodes if n.type == "BSDF_PRINCIPLED").inputs["Base Color"].default_value = (0.02, 0.02, 0.025, 1)


def empty(name, parent=None):
    o = bpy.data.objects.new(name, None)
    scene.collection.objects.link(o)
    o.parent = parent
    return o


def bake(name, parts, pivot, parent, pre=Matrix.Identity(4)):
    """Join `parts` into one mesh in world space, origin on `pivot`."""
    bm = bmesh.new()
    for part in parts:
        m = pre @ part.matrix_world
        tmp = part.data.copy()
        tmp.transform(m)
        if m.determinant() < 0:
            tmp.flip_normals()
        bm.from_mesh(tmp)
        bpy.data.meshes.remove(tmp)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.translate(bm, verts=bm.verts, vec=-pivot)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    for attr in [a for a in mesh.attributes if a.name == "custom_normal"]:
        mesh.attributes.remove(attr)
    while mesh.uv_layers:  # one flat material, no textures
        mesh.uv_layers.remove(mesh.uv_layers[0])
    for poly in mesh.polygons:
        poly.use_smooth = True
    mesh.set_sharp_from_angle(angle=math.radians(35))
    mesh.materials.append(dark)
    o = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(o)
    o.parent = parent
    o.location = pivot
    o.rotation_mode = "XYZ"
    return o


root = empty("Lift")
MIRROR_X = Matrix.Scale(-1, 4, (1, 0, 0))
MIRROR_Y = Matrix.Scale(-1, 4, (0, 1, 0))

rig = []  # (object, kind, data)
for side, flip in (("L", Matrix.Identity(4)), ("R", MIRROR_X)):
    side_root = empty(f"Lift_{side}", root)
    for layer, k, g, centre, to_end in arms:
        o = bake(f"Lift_{side}_Arm_{k + 1}{layer}", meshes_of(g), flip @ centre, side_root, flip)
        lean = 1 if to_end.y > 0 else -1          # which way the screwed end points
        angle = math.atan2(to_end.z, abs(to_end.y))  # as modelled
        rig.append((o, "arm", (k, lean, angle)))
    a = bake(f"Lift_{side}_Link_A", link_parts, flip @ P, side_root, flip)
    shift = Matrix.Translation((LINK_B_DX, 0, 0))
    b = bake(f"Lift_{side}_Link_B", link_parts, flip @ P, side_root, flip @ shift @ MIRROR_Y)
    rest = math.atan2(P.z - Q_REST.z, abs(Q_REST.y))
    rig.append((a, "link", (1 if Q_REST.y > 0 else -1, rest)))
    rig.append((b, "link", (-1 if Q_REST.y > 0 else 1, rest)))

for i, cable in enumerate(cables):
    mn = min((cable.matrix_world @ v.co).z for v in cable.data.vertices)
    mx = max((cable.matrix_world @ v.co).z for v in cable.data.vertices)
    top = Vector((origin(cable).x, 0, mx))
    o = bake(f"Lift_Cable_{'LR'[i]}", [cable], top, root)
    rig.append((o, "cable", mx - mn))

# ---------------------------------------------------------------- animate


def pose(extension):
    theta = solve(extension)
    z0 = c0(theta)
    rise = HALF * math.sin(theta)
    qy = Q_DIST * math.cos(theta + Q_LEAD)
    qz = z0 + Q_DIST * math.sin(theta + Q_LEAD)
    link = math.atan2(P.z - qz, qy)
    for o, kind, data in rig:
        if kind == "arm":
            k, lean, modelled = data
            o.location.z = z0 - 2 * k * rise
            # +X rotation lifts the +Y end
            o.rotation_euler.x = lean * (theta - modelled)
        elif kind == "link":
            lean, rest = data
            o.rotation_euler.x = -lean * (link - rest)
        else:
            o.scale.z = (data + extension) / data
    return theta


for f in range(FRAMES + 1):
    pose(TRAVEL * f / FRAMES)
    for o, kind, _ in rig:
        if kind == "cable":
            o.keyframe_insert("scale", frame=f)
        else:
            o.keyframe_insert("rotation_euler", frame=f)
            if kind == "arm":
                o.keyframe_insert("location", frame=f)

for action in bpy.data.actions:
    for layer in getattr(action, "layers", []):
        for strip in layer.strips:
            for bag in strip.channelbags:
                for fc in bag.fcurves:
                    for kp in fc.keyframe_points:
                        kp.interpolation = "LINEAR"

scene.frame_set(0)

# ----------------------------------------------------------------- export

for o in list(bpy.data.objects):
    if scene not in o.users_scene:
        bpy.data.objects.remove(o)
for s in list(bpy.data.scenes):
    if s is not scene:
        bpy.data.scenes.remove(s)
bpy.ops.outliner.orphans_purge(do_recursive=True)

os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "lift.blend"))

bpy.ops.export_scene.gltf(
    filepath=os.path.join(OUT, "lift.glb"),
    export_format="GLB",
    export_animations=True,
    export_animation_mode="SCENE",
    export_anim_scene_split_object=False,
    export_force_sampling=True,
    export_frame_range=True,
    export_optimize_animation_size=False,
    export_draco_mesh_compression_enable=False,
    export_yup=True,
)
bpy.ops.export_scene.fbx(
    filepath=os.path.join(OUT, "lift.fbx"),
    bake_anim=True,
    bake_anim_use_all_bones=False,
    bake_anim_use_nla_strips=False,
    bake_anim_use_all_actions=False,
    bake_anim_step=1,
    bake_anim_simplify_factor=0,
    add_leaf_bones=False,
)

theta_drop = solve(0.24)
print("LIFT " + json.dumps({
    "half_arm": round(HALF, 5),
    "pitch": round(PITCH, 5),
    "theta_rest_deg": round(math.degrees(THETA_REST), 3),
    "theta_at_0.24_deg": round(math.degrees(theta_drop), 3),
    "theta_at_travel_deg": round(math.degrees(solve(TRAVEL)), 3),
    "top_pin": [round(v, 5) for v in P],
    "link": round(LINK, 5),
    "link_pin_dist": round(Q_DIST, 5),
    "link_pin_lead_deg": round(math.degrees(Q_LEAD), 3),
    "bottom_rest": round(BOTTOM_REST, 5),
    "travel": TRAVEL,
    "frames": FRAMES,
    "fps": FPS,
    "objects": len(rig),
    "actions": [a.name for a in bpy.data.actions],
}))
