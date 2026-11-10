"""Export the credited BlendSwap Hoverboard as a small game-ready GLB.

Run with Blender: blender -b source-assets/shop/hoverboard2.blend --python scripts/export-shop-hoverboard.py
"""
import bpy
from pathlib import Path

root = Path(__file__).resolve().parent.parent
output = root / ".asset-work" / "hoverboard-uncompressed.glb"
output.parent.mkdir(parents=True, exist_ok=True)

mesh_names = {
    "back wheel", "back_fanblades", "Body", "buckle", "buckle.001",
    "front wheel.001", "front_fanblades", "Rubber_stand",
}
palette = {
    "black_rubber": ((0.025, 0.04, 0.055, 1), 0.65, 0.35, None),
    "black_rubber.001": ((0.025, 0.04, 0.055, 1), 0.65, 0.35, None),
    "bluelightbody": ((0.02, 0.18, 0.27, 1), 0.72, 0.21, None),
    "bluelightbottombright": ((0.03, 0.67, 0.85, 1), 0.32, 0.2, (0.01, 0.32, 0.52, 1)),
    "fan_blade": ((0.27, 0.44, 0.52, 1), 0.8, 0.27, None),
    "metal_buckle": ((0.63, 0.76, 0.79, 1), 0.85, 0.18, None),
    "rims": ((0.22, 0.78, 0.92, 1), 0.7, 0.2, None),
    "rubber_buckle": ((0.04, 0.08, 0.11, 1), 0.15, 0.6, None),
    "shaft": ((0.38, 0.49, 0.54, 1), 0.88, 0.29, None),
    "Material": ((0.03, 0.3, 0.44, 1), 0.7, 0.24, None),
}

for material in bpy.data.materials:
    color, metal, rough, emission = palette.get(material.name, palette["Material"])
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf is None:
        material.node_tree.nodes.clear()
        bsdf = material.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
        output_node = material.node_tree.nodes.new("ShaderNodeOutputMaterial")
        material.node_tree.links.new(bsdf.outputs["BSDF"], output_node.inputs["Surface"])
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Emission Color"].default_value = emission or (0, 0, 0, 1)
    bsdf.inputs["Emission Strength"].default_value = 1.4 if emission else 0

bpy.ops.object.select_all(action="DESELECT")
for obj in bpy.data.objects:
    if obj.name not in mesh_names or obj.type != "MESH":
        continue
    world = obj.matrix_world.copy()
    obj.parent = None
    obj.matrix_world = world
    for modifier in list(obj.modifiers):
        if modifier.type == "ARMATURE":
            obj.modifiers.remove(modifier)
        elif modifier.type == "SUBSURF":
            # The original 2-level render mesh is excessive for a 2 m pickup.
            modifier.levels = 1
            modifier.render_levels = 1
    obj.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=str(output), export_format="GLB", use_selection=True,
    export_animations=False, export_skins=False, export_morph=False,
    export_cameras=False, export_lights=False, export_apply=True,
)
print(f"Exported {output} ({output.stat().st_size} bytes)")
