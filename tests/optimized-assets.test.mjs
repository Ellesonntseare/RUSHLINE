import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {NodeIO,getBounds} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

global.window={URL:{createObjectURL:()=>''}};
global.document={createElementNS:()=>({addEventListener(){},removeEventListener(){},set src(v){}})};
function read(file){const b=fs.readFileSync(file);return new FBXLoader().parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
function signature(root){const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push({name:o.name,vertices:Array.from(o.geometry.attributes.position.array),bones:o.skeleton?.bones.map(b=>b.name)});});return {meshes,animations:root.animations.map(a=>({duration:a.duration,tracks:a.tracks.map(t=>({name:t.name,values:Array.from(t.values),times:Array.from(t.times)}))}))};}
test('optimized character textures preserve geometry, skeletons and animation tracks',()=>{
 for(const [source,optimized] of [['user-character/Running.fbx','classic'],['user-skins/Fast Run.fbx','street']]){
  assert.deepEqual(signature(read('public/assets/optimized/'+optimized+'.fbx')),signature(read('public/assets/'+source)));
 }
 assert.ok(fs.statSync('public/assets/optimized/street.fbx').size<10e6);
});
test('compressed train decodes with the browser decoder and preserves bounds and triangle count',async()=>{
 await MeshoptDecoder.ready;
 const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
 const original=await io.read('public/assets/user-train/bombardier_s_train_carriage_-_london_underground.glb');
 const optimized=await io.read('public/assets/optimized/train-meshopt.glb');
 const a=getBounds(original.getRoot().listScenes()[0]),b=getBounds(optimized.getRoot().listScenes()[0]);
 for(const key of ['min','max'])for(let i=0;i<3;i++)assert.ok(Math.abs(a[key][i]-b[key][i])<.005);
 const triangles=doc=>doc.getRoot().listNodes().filter(n=>n.getMesh()).flatMap(n=>n.getMesh().listPrimitives()).reduce((n,p)=>n+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0);
 assert.equal(triangles(original),triangles(optimized));
 assert.ok(fs.statSync('public/assets/optimized/train-meshopt.glb').size<3e6);
});

test('startup train keeps its roof dimensions and full-size textures',async()=>{
 await MeshoptDecoder.ready;
 const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
 const source=(await io.read('public/assets/optimized/train-meshopt.glb')).getRoot();
 const fast=(await io.read('public/assets/optimized/train-fast.glb')).getRoot();
 const a=getBounds(source.listScenes()[0]),b=getBounds(fast.listScenes()[0]);
 for(const key of ['min','max'])for(let i=0;i<3;i++)assert.ok(Math.abs(a[key][i]-b[key][i])<.001);
 assert.deepEqual(fast.listTextures().map(t=>t.getSize()),source.listTextures().map(t=>t.getSize()));
 assert.ok(fs.statSync('public/assets/optimized/train-fast.glb').size<1.7e6);
});

test('HD scene assets keep their geometry, texture resolution and named building modules',async()=>{
 await MeshoptDecoder.ready;
 const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
 for(const [source,optimized,maxBytes] of [
  ['city-real/facade.gltf','facade-hd.glb',6e6],
  ['user-coin/video_game_coin.glb','coin-hd.glb',5e5],
  ['user-mystery/mystery_block.glb','mystery-hd.glb',2e6]
 ]){
  const before=(await io.read('public/assets/'+source)).getRoot();
  const after=(await io.read('public/assets/optimized/'+optimized)).getRoot();
  const triangles=root=>root.listMeshes().flatMap(mesh=>mesh.listPrimitives()).reduce((n,p)=>n+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0);
  assert.equal(triangles(after),triangles(before),optimized);
  assert.deepEqual(after.listTextures().map(t=>t.getSize()),before.listTextures().map(t=>t.getSize()),optimized);
  const a=getBounds(before.listScenes()[0]),b=getBounds(after.listScenes()[0]);
  for(const key of ['min','max'])for(let i=0;i<3;i++)assert.ok(Math.abs(a[key][i]-b[key][i])<.005,`${optimized} ${key}[${i}]`);
  assert.ok(fs.statSync('public/assets/optimized/'+optimized).size<maxBytes,optimized);
  if(optimized==='facade-hd.glb'){
   const names=new Set(after.listNodes().map(node=>node.getName()));
   for(const module of ['wall_door_centered_small_01','wall_window_centered_large_01','wall_window_centered_small_01','door_centered_small_01','window_centered_large_01','window_centered_small_01','cornice_standard_standard_01'])assert.ok(names.has(module),module);
  }
 }
});
