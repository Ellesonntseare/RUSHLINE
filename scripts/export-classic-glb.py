"""Convert the existing classic FBX, keeping the full rig and running clip."""
import bpy
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
arguments = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
source = root / (arguments[0] if arguments else "public/assets/optimized/classic.fbx")
target = root / (arguments[1] if len(arguments) > 1 else ".asset-work/classic-no-yup.glb")
target.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.fbx(filepath=str(source), use_image_search=True)
bpy.ops.export_scene.gltf(
    filepath=str(target), export_format="GLB", export_apply=False,
    export_animations=True, export_skins=True, export_morph=True,
    export_cameras=False, export_lights=False, export_yup=False,
)
print(f"Exported {target} ({target.stat().st_size} bytes)")
