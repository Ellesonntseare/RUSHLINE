import fs from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as T from 'three';
globalThis.ProgressEvent=class {};
const b=fs.readFileSync('public/assets/runner/quaternius-animated-human.glb'); const len=b.readUInt32LE(12);const j=JSON.parse(b.subarray(20,20+len));j.images=[];j.textures=[];j.materials=[];for(const m of j.meshes)for(const p of m.primitives)delete p.material;j.buffers[0].uri='data:application/octet-stream;base64,'+b.subarray(28+len).toString('base64');const g=await new GLTFLoader().parseAsync(JSON.stringify(j),'');
const {normalizeRunner}=await import('./src/runner-model.js');
const {clone}=await import('three/addons/utils/SkeletonUtils.js');
const assert=(await import('node:assert/strict')).default;
const rig=clone(g.scene);const visual=new T.Group();visual.add(rig);
normalizeRunner(rig,visual);
visual.updateMatrixWorld(true);
const bounds=()=>new T.Box3().setFromObject(visual,true);
assert.ok(Math.abs(bounds().getSize(new T.Vector3()).y-1.85)<.001);
assert.ok(Math.abs(bounds().min.y)<.001);
const mx=new T.AnimationMixer(rig);
for(const name of ['Run','Jump']){
 mx.stopAllAction();const clip=g.animations.find(a=>a.name===name);mx.clipAction(clip).play();
 for(let i=0;i<20;i++){mx.setTime(clip.duration*i/20);visual.updateMatrixWorld(true);const height=bounds().getSize(new T.Vector3()).y;assert.ok(height>.5&&height<2.2,name+' height '+height);}
}
console.log('Installed runner regression passed: grounded 1.85m bind pose; Run and Jump remain human scale.');
