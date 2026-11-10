import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGroundMaterials,addGroundDetailMap} from '../src/ground.js';

test('the race can start with HD color maps and receive ground detail later',()=>{
  const image=new Uint8Array([128,128,128,255]);
  const texture=()=>new THREE.DataTexture(image,1,1);
  const materials=createGroundMaterials({asphalt_02_diff:texture(),concrete_pavement_02_diff:texture()});
  assert.equal(materials.road.normalMap,null);
  assert.equal(materials.sidewalk.roughnessMap,null);
  addGroundDetailMap(materials,'asphalt_02_normal',texture());
  addGroundDetailMap(materials,'concrete_pavement_02_rough',texture());
  assert.deepEqual(materials.road.normalMap.repeat.toArray(),[4,1]);
  assert.deepEqual(materials.city.normalMap.repeat.toArray(),[12,5]);
  assert.deepEqual(materials.sidewalk.roughnessMap.repeat.toArray(),[1.2,1.2]);
});
