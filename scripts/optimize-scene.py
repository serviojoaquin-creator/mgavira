"""Blender 4.5: compress the existing model without simplifying its geometry."""
import bpy
from pathlib import Path
import shutil
root=Path(__file__).resolve().parent.parent
masters=root/'work'/'asset-masters'
out=root/'public'/'media'/'v20'
out.mkdir(parents=True,exist_ok=True)
for name,width in [('daylight-sky.hdr',1024),('urban-street.hdr',512)]:
    source=masters/'environments'/name
    source.parent.mkdir(parents=True,exist_ok=True)
    if not source.exists():shutil.copy2(root/'public'/'environments'/name,source)
    image=bpy.data.images.load(str(source),check_existing=False)
    image.scale(width,width//2)
    image.file_format='HDR'
    image.filepath_raw=str(out/name)
    image.save()
    bpy.data.images.remove(image)
    print(name,(out/name).stat().st_size)
# The current vehicle exporter is separate from environment conversion.
import runpy
runpy.run_path(str(root/'scripts/optimize-cronos-v23.py'),run_name='__main__')
