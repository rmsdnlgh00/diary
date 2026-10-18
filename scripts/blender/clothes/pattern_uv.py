"""UVs for a top with an all-over repeating pattern (clouds, checks…), rest pose, object space.
Torso: wrapped round the body, a whole number of repeats (REPEATS) so the back seam doesn't cut a
motif. Sleeves (faces past |x| SLEEVE_X): wrapped round the arm, seam under the arm, the same tile size.
Set TOP (object name) before exec()."""
import bpy, math
TOP = bpy.data.objects[globals()['TOP']]
REPEATS = globals().get('REPEATS', 12)
SLEEVE_X = 21.5
TILE_V = 11.0
me = TOP.data
uvl = me.uv_layers.active
tile_u = 2 * math.pi * 19.0 / REPEATS            # the tile's width on a torso of radius ~19


def arm_axis(x):
    ax = abs(x)
    return -1.2, 91.0 - (ax - 17.5) * 0.047        # along the upper arm and forearm bones


for p in me.polygons:
    cos = [me.vertices[me.loops[li].vertex_index].co for li in p.loop_indices]
    cx = sum(c.x for c in cos) / len(cos)
    if abs(cx) > SLEEVE_X:
        cy, cz = arm_axis(cx)
        us = []
        for c in cos:
            a = math.atan2(c.y - cy, c.z - cz)       # wraps under the arm
            r = math.hypot(c.y - cy, c.z - cz)
            us.append([a * 10.0 / tile_u, abs(c.x) / TILE_V])
        span = 2 * math.pi * 10.0 / tile_u
    else:
        us = [[math.atan2(c.x, -(c.y + 4)) * REPEATS / (2 * math.pi), c.z / TILE_V] for c in cos]
        span = REPEATS
    if max(u for u, _ in us) - min(u for u, _ in us) > span / 2:
        us = [[u + span if u < 0 else u, v] for u, v in us]
    for li, uv in zip(p.loop_indices, us): uvl.data[li].uv = uv
me.update()
print('pattern UVs', TOP.name)
