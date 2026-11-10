import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import * as THREE from 'three';
import {swipeAction,requestJump,consumeJumpBuffer} from '../src/controls.js';
import {routeSection,createSectionStructure,createFinishLine} from '../src/route-sections.js';
import {MAX_DISTANCE} from '../src/logic.js';

test('phone swipes separate lane changes, jumps and rolls and ignore shaky taps',()=>{
  assert.equal(swipeAction(8,-7,390),null);
  assert.equal(swipeAction(-55,8,390),'left');
  assert.equal(swipeAction(55,8,390),'right');
  assert.equal(swipeAction(8,-55,390),'jump');
  assert.equal(swipeAction(8,55,390),'slide');
});

test('late jump input buffers until landing but cannot double jump',()=>{
  const state={airborneHeight:.2,verticalSpeed:-2,platform:null,slide:0,jumpBuffer:0};
  assert.equal(requestJump(state,8),false);
  assert.equal(consumeJumpBuffer(state,.05,8),false);
  state.airborneHeight=0;state.verticalSpeed=0;
  assert.equal(consumeJumpBuffer(state,.05,8),true);
  assert.equal(state.verticalSpeed,8);
  assert.equal(state.jumpBuffer,0);
  assert.equal(requestJump(state,8),false);
});

test('the route has distinct sections and a finish marker at the shared goal',()=>{
  assert.deepEqual([0,MAX_DISTANCE*.275,MAX_DISTANCE*.55,MAX_DISTANCE*.7875].map(routeSection),['boulevard','station','tunnel','downtown']);
  const pavement=new THREE.MeshStandardMaterial(),materials={sidewalk:pavement};
  for(const section of ['station','tunnel']){
    const group=createSectionStructure(section,materials);
    assert.ok(group.children.length>=4);
    const bounds=new THREE.Box3().setFromObject(group);
    assert.ok(bounds.min.x<=-6&&bounds.max.x>=6);
  }
  assert.equal(createFinishLine().position.z,-MAX_DISTANCE);
});

test('every scanned route prop is installed locally',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../public/assets/manifest.json',import.meta.url)));
  assert.deepEqual(Object.keys(manifest.routeProps).sort(),['concreteBarrier','stationBench','stationLamp','tunnelPipes']);
  for(const path of Object.values(manifest.routeProps)){
    const file=new URL('../public'+path,import.meta.url);
    assert.ok(statSync(file).size>100_000,path);
    assert.equal(readFileSync(file).toString('ascii',0,4),'glTF');
  }
});
