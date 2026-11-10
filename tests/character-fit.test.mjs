import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {buildPersonalHead} from '../src/serame-head.js';
import {attachSerameHead} from '../src/serame-character.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {normalizeRunner} from '../src/runner-model.js';

global.window={URL:{createObjectURL:()=>''}};
global.document={createElementNS:()=>({addEventListener(){},removeEventListener(){},set src(value){}})};
const read=file=>{
  const bytes=fs.readFileSync(file);
  return new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
};

test('all three runners share a playable height and stay fully on screen',async()=>{
  const classic=read('public/assets/optimized/classic.fbx');
  const street=read('public/assets/optimized/street.fbx');
  const city=read('public/assets/optimized/street.fbx');
  const bytes=fs.readFileSync('public/assets/serame/head.glb');
  const donor=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const head=await buildPersonalHead(new THREE.Texture(),null,donor);
  attachSerameHead(city,head);
  assert.ok(city.getObjectByName('SerameHead').parent.isBone);
  assert.equal(city.getObjectByName('Ch31_Hair'),undefined);
  const neckSkin=city.getObjectByName('SerameNeckSkin');
  assert.ok(neckSkin.isSkinnedMesh,'neck must deform with the body skeleton');
  const weights=neckSkin.geometry.attributes.skinWeight;
  const lower=Array.from({length:weights.count},(_,i)=>i).find(i=>weights.getZ(i)>.999);
  const upper=Array.from({length:weights.count},(_,i)=>i).find(i=>weights.getX(i)>.999);
  assert.notEqual(lower,undefined);assert.notEqual(upper,undefined);
  city.updateMatrixWorld(true);neckSkin.skeleton.update();
  const baseBefore=neckSkin.getVertexPosition(lower,new THREE.Vector3());
  const faceBefore=neckSkin.getVertexPosition(upper,new THREE.Vector3());
  const joint=city.getObjectByName('SerameHead').parent,rotation=joint.quaternion.clone();
  joint.rotateX(.6);city.updateMatrixWorld(true);neckSkin.skeleton.update();
  assert.ok(neckSkin.getVertexPosition(lower,new THREE.Vector3()).distanceTo(baseBefore)<.001,'neck base stays on the torso when head tilts');
  assert.ok(neckSkin.getVertexPosition(upper,new THREE.Vector3()).distanceTo(faceBefore)>.1,'face follows the head joint');
  joint.quaternion.copy(rotation);city.updateMatrixWorld(true);neckSkin.skeleton.update();

  const headBounds=new THREE.Box3().setFromObject(city.getObjectByName('SerameNeckSkin'),true);
  const collarBounds=new THREE.Box3().setFromObject(city.getObjectByName('Ch31_Collar'),true);
  assert.ok(headBounds.getSize(new THREE.Vector3()).x<20,'replacement head fits the body width');
  assert.ok(headBounds.min.y<collarBounds.max.y&&headBounds.min.y>collarBounds.min.y,'neck base sits inside the collar');
  // Reproduce switching skins after a run, with an already-scaled visual group.
  const player=new THREE.Group(),reused=new THREE.Group();player.add(reused);
  player.position.set(4,7,-180);reused.position.y=.4;reused.rotation.y=Math.PI;
  for(const model of [classic,street,city,street,classic]){
    reused.clear();const rig=cloneSkeleton(model);reused.add(rig);
    player.updateMatrixWorld(true);normalizeRunner(rig,reused);player.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(reused,true);
    assert.ok(Math.abs(box.getSize(new THREE.Vector3()).y-1.85)<.001,'switching characters must not inherit old scale');
    assert.ok(Math.abs(box.min.y-7.4)<.001,'switching characters must not inherit world height');
  }
  const heights=[];
  for(const [model,motion] of [[classic,classic],[street,street],[city,street]]){
    const visual=new THREE.Group(),rig=cloneSkeleton(model);visual.add(rig);
    normalizeRunner(rig,visual);
    visual.rotation.y=Math.PI;
    const clip=motion.animations.find(a=>a.tracks.length&&a.duration>.1).clone();
    for(const track of clip.tracks)if(/Hips\.position$/.test(track.name))for(let i=0;i<track.values.length;i+=3){track.values[i]=0;track.values[i+2]=0;}
    const mixer=new THREE.AnimationMixer(rig);mixer.clipAction(clip).play();mixer.update(.25);
    if(rig.getObjectByName('SerameHead')){const head=rig.getObjectByName('SerameHead');assert.ok(head.parent.isBone);assert.ok(head.getWorldPosition(new THREE.Vector3()).toArray().every(Number.isFinite));}
    visual.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(visual,true);
    heights.push(bounds.getSize(new THREE.Vector3()).y);
    for(const aspect of [16/9,9/16]){
      const camera=new THREE.PerspectiveCamera(aspect<1?76:61,aspect,.08,240);
      camera.position.set(0,3.15,8.3);camera.lookAt(0,1.2,-8);camera.updateMatrixWorld();
      for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
        const point=new THREE.Vector3(x,y,z).project(camera);
        assert.ok(Math.abs(point.x)<.8&&Math.abs(point.y)<.8,'runner must fit within gameplay view');
      }
    }
    visual.rotation.y=0;visual.updateMatrixWorld(true);
    const previewBounds=new THREE.Box3().setFromObject(visual,true);
    for(const aspect of [340/480,280/230]){
      const camera=new THREE.PerspectiveCamera(29,aspect,.1,30);
      const cityPreview=!!rig.getObjectByName('SerameHead');
      camera.position.set(0,cityPreview?.91:1.05,5.8);camera.lookAt(0,cityPreview?1.1:.93,0);camera.updateMatrixWorld();
      for(const x of [previewBounds.min.x,previewBounds.max.x])for(const y of [previewBounds.min.y,previewBounds.max.y])for(const z of [previewBounds.min.z,previewBounds.max.z]){
        const point=new THREE.Vector3(x,y,z).project(camera);
        assert.ok(Math.abs(point.x)<.85&&Math.abs(point.y)<.85,'full body must fit in selector preview');
      }
    }
  }
  assert.ok(Math.max(...heights)-Math.min(...heights)<.05,`character heights differ: ${heights}`);
});
