"""Reimport the generated GLB and validate the exported geometry and rig."""
import bpy
import json
import sys
from pathlib import Path
from mathutils import Vector

base=Path(__file__).resolve().parent.parent
out=base/'work'/'model-v19'
path=out/'fiat-cronos.glb'
if '--optimized' in sys.argv:
    out=base/'work'/'model-v20'
    out.mkdir(parents=True,exist_ok=True)
    path=base/'public'/'media'/'v20'/'cronos.glb'
if '--v23' in sys.argv:
    out=base/'work'/'model-v23'
    out.mkdir(parents=True,exist_ok=True)
    path=base/'public'/'media'/'v23'/'cronos.glb'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(path))
bpy.context.view_layer.update()
objects=list(bpy.context.scene.objects)
assert not any(o.type in ('CAMERA','LIGHT') for o in objects)
assert not any('Review' in o.name or 'Studio floor' in o.name for o in objects)
for code in ('FL','FR','RL','RR'):
    spin=bpy.data.objects[f'Wheel_{code}_Spin']
    assert spin.parent.name==f'Wheel_{code}_Pivot'
    assert abs(spin.parent.location.z-.31)<.001
front=bpy.data.objects['Wheel_FL_Pivot'].matrix_world.translation
rear=bpy.data.objects['Wheel_RL_Pivot'].matrix_world.translation
assert abs((front-rear).length-2.521)<.001

def bounds(selected):
    # Joined lamp batches retain a rotated local frame. Rotating their local
    # bounding boxes overestimates dimensions; measure the exported vertices.
    points=[o.matrix_world@v.co for o in selected if o.type=='MESH' for v in o.data.vertices]
    low=Vector([min(p[i] for p in points) for i in range(3)])
    high=Vector([max(p[i] for p in points) for i in range(3)])
    return [round(x,4) for x in high-low]

meshes=[o for o in objects if o.type=='MESH']
overall=bounds(objects)
assert abs(overall[0]-4.364)<.01, overall
assert 1.7<overall[1]<2.0 and 1.5<overall[2]<1.7, overall
triangles=0
for ob in meshes:
    ob.data.calc_loop_triangles()
    triangles+=len(ob.data.loop_triangles)
    invalid=[list(v.co) for v in ob.data.vertices if any(not (-10<c<10) for c in ob.matrix_world@v.co)]
    assert not invalid, (ob.name,invalid[:3])
report={
    'revision': 'v23' if '--v23' in sys.argv else 'v20' if '--optimized' in sys.argv else 'v19',
    'glb_bytes':path.stat().st_size,
    'triangles':triangles,
    'mesh_batches':len(meshes),
    'materials':len({m.name for o in meshes for m in o.data.materials}),
    'dimensions_with_mirrors_and_antenna_xyz_m':bounds(objects),
    'painted_body_xyz_m':bounds([o for o in meshes if any('Pearl white' in m.name for m in o.data.materials)]),
    'wheelbase_m':round((front-rear).length,4),
    'four_wheel_hierarchies_valid':True,
    'review_lights_and_stage_excluded':True,
    'reference':'Three user supplied photographs, pre-MY26 white Cronos',
    'fidelity':'Photo-guided reconstruction; not manufacturer CAD or a scan',
}
(out/'validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
