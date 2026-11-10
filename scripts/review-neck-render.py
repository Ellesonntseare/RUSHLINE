import bpy,json,math
from pathlib import Path
from mathutils import Vector
root=Path.cwd();bpy.ops.wm.read_factory_settings(use_empty=True)
meshes=json.loads((root/'.asset-work/neck-review/scene.json').read_text())
focus=None
for item in meshes:
 vertices=[(item['positions'][i]/100,-item['positions'][i+2]/100,item['positions'][i+1]/100) for i in range(0,len(item['positions']),3)]
 faces=[item['indices'][i:i+3] for i in range(0,len(item['indices']),3)]
 mesh=bpy.data.meshes.new(item['name']);mesh.from_pydata(vertices,[],faces);mesh.update()
 obj=bpy.data.objects.new(item['name'],mesh);bpy.context.collection.objects.link(obj)
 for p in mesh.polygons:p.use_smooth=True
 if item['name']=='SerameNeckSkin':focus=Vector((0,sum(v[1] for v in vertices)/len(vertices),sum(v[2] for v in vertices)/len(vertices)-.07))
 mat=bpy.data.materials.new(item['name']);mat.use_nodes=True;nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*item['color'],1);bs.inputs['Roughness'].default_value=.7
 if item['uv']:
  uv=mesh.uv_layers.new()
  for loop in mesh.loops:
   i=loop.vertex_index*2;uv.data[loop.index].uv=item['uv'][i:i+2]
 if item['texture']:
  tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(root/item['texture']),check_existing=True)
  if item['blend']:
   attr=mesh.color_attributes.new(name='blend',type='FLOAT_COLOR',domain='POINT')
   for i,value in enumerate(item['blend']):attr.data[i].color=(value,value,value,1)
   color=nodes.new('ShaderNodeVertexColor');color.layer_name='blend'
   mix=nodes.new('ShaderNodeMixRGB');links.new(color.outputs['Color'],mix.inputs[0]);skin=(.178,.063,.029,1)
   if item['face']:mix.inputs[1].default_value=skin;links.new(tex.outputs['Color'],mix.inputs[2])
   else:links.new(tex.outputs['Color'],mix.inputs[1]);mix.inputs[2].default_value=skin
   links.new(mix.outputs[0],bs.inputs['Base Color'])
  else:links.new(tex.outputs['Color'],bs.inputs['Base Color'])
 obj.data.materials.append(mat)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.resolution_x=700;scene.render.resolution_y=700;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Studio');scene.world.color=(.18,.18,.18)
for loc,power,size in [((2,-3,4),450,3),((-2,1,3),300,2)]:
 bpy.ops.object.light_add(type='AREA',location=loc);bpy.context.object.data.energy=power;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=size
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=.62
for name,offset in [('front',(0,-3,.2)),('side',(3,-.15,.2))]:
 camera.location=focus+Vector(offset);camera.rotation_euler=(focus-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(root/f'.asset-work/neck-review/{name}.png');bpy.ops.render.render(write_still=True)

