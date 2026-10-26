"""Secondary traffic LOD; the main Cronos asset and its four wheel rigs stay untouched."""
import bpy
from pathlib import Path
root = Path(__file__).resolve().parent.parent
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(root/'public/media/v23/cronos.glb'))
before = 0
after = 0
for obj in list(bpy.context.scene.objects):
    if obj.type != 'MESH':
        continue
    obj.data.calc_loop_triangles()
    count = len(obj.data.loop_triangles)
    before += count
    if count > 350:
        bpy.context.view_layer.objects.active = obj
        modifier = obj.modifiers.new('Secondary traffic LOD', 'DECIMATE')
        modifier.ratio = .20 if count > 1800 else .36
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.data.calc_loop_triangles()
    after += len(obj.data.loop_triangles)
for code in ('FL','FR','RL','RR'):
    assert bpy.data.objects.get(f'Wheel_{code}_Spin')
    assert bpy.data.objects.get(f'Wheel_{code}_Pivot')
path = root/'public/media/v22/traffic-cronos.glb'
bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',
    export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,
    export_draco_position_quantization=14,export_draco_normal_quantization=10,
    export_draco_texcoord_quantization=12)
print('TRAFFIC_LOD', {'before':before, 'after':after, 'bytes':path.stat().st_size})
assert after < before * .35

