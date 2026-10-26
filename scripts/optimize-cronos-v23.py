"""Publish the photo-guided Cronos, preserving wheel rigs and geometry."""
import bpy
from pathlib import Path
root=Path(__file__).resolve().parent.parent
out=root/'public/media/v23'
out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(root/'work/model-v23/fiat-cronos.blend'))
car=bpy.data.objects['FiatCronos_ROOT']
bpy.ops.object.select_all(action='DESELECT')
for ob in [car]+list(car.children_recursive):ob.select_set(True)
bpy.context.view_layer.objects.active=car
bpy.ops.export_scene.gltf(filepath=str(out/'cronos.glb'),export_format='GLB',use_selection=True,
    export_apply=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,
    export_draco_position_quantization=16,export_draco_normal_quantization=12,
    export_draco_texcoord_quantization=14,export_draco_generic_quantization=12)
print('COMPRESSED_GLB_BYTES',(out/'cronos.glb').stat().st_size)
