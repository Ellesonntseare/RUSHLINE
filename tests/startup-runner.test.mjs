import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {AnimationClip,AnimationMixer,Box3,Group,Vector3} from 'three';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {normalizeRunner} from '../src/runner-model.js';

test('fast classic model keeps the playable rig and accepts the supplied jump and roll clips',async()=>{
  const manifest=JSON.parse(readFileSync('public/assets/manifest.json','utf8'));
  assert.equal(manifest.runner,manifest.runnerClips.Run);
  assert.ok(statSync(`public${manifest.runner}`).size<700000);
  const originalSelf=globalThis.self,originalBitmap=globalThis.createImageBitmap;
  globalThis.self={URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}}};
  globalThis.createImageBitmap=async()=>({width:2,height:2,close(){}});
  try{
    const bytes=readFileSync(`public${manifest.runner}`);
    const {scene,animations}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
      .parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
    scene.rotation.x=-Math.PI/2;
    const visual=new Group(),rig=cloneSkeleton(scene);visual.add(rig);
    const scale=normalizeRunner(rig,visual);
    assert.ok(scale>.9&&scale<1.1);
    assert.ok(rig.getObjectByName('mixamorigHips')?.isBone);
    const run=animations[0];
    assert.ok(run.tracks.some(track=>track.name==='mixamorigHips.position'));
    const mixer=new AnimationMixer(rig);
    for(const file of [manifest.runnerClips.Jump,manifest.runnerClips.Roll]){
      const clip=AnimationClip.parse(JSON.parse(readFileSync(`public${file}`,'utf8')));
      assert.ok(clip.tracks.length>20);
      const action=mixer.clipAction(clip);action.play();mixer.update(.15);
      visual.updateMatrixWorld(true);
      const height=new Box3().setFromObject(visual,true).getSize(new Vector3()).y;
      assert.ok(height>.9&&height<2.5,`${file} created an invalid pose: ${height}`);
      action.stop();
    }
  }finally{
    globalThis.self=originalSelf;globalThis.createImageBitmap=originalBitmap;
  }
});
