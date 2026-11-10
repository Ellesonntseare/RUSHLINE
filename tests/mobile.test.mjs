import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHoverboard,createStreetKit,updateHoverboard} from '../src/ride-props.js';
import {readFileSync} from 'node:fs';
test('street details batch to four finite geometry meshes',()=>{const kit=createStreetKit();assert.equal(kit.children.length,4);for(const mesh of kit.children){assert.ok(mesh.geometry.attributes.position.count>0);assert.ok([...mesh.geometry.attributes.position.array].every(Number.isFinite));}});
test('hoverboard fits a lane and yields to rolls and celebrations',()=>{const board=createHoverboard(),visual=new THREE.Group();const size=new THREE.Box3().setFromObject(board).getSize(new THREE.Vector3());assert.ok(size.x<1&&size.z<2.2);updateHoverboard(board,visual,{active:true,lateral:4});assert.ok(board.visible);assert.equal(visual.position.y,.4);assert.ok(Math.abs(board.rotation.z)<=.18);for(const state of [{rolling:true},{finished:true}]){updateHoverboard(board,visual,state);assert.equal(board.visible,false);assert.equal(visual.position.y,0);}});
test('phone manifest supplies standalone scope and correctly sized PNG icons',()=>{const m=JSON.parse(readFileSync(new URL('../public/manifest.webmanifest',import.meta.url),'utf8').replace(/^\uFEFF/,''));assert.equal(m.display,'standalone');assert.equal(m.start_url,'/');for(const i of m.icons){const b=readFileSync(new URL('../public'+i.src,import.meta.url));const size=Number(i.sizes.split('x')[0]);assert.equal(b.readUInt32BE(16),size);assert.equal(b.readUInt32BE(20),size);}});

import {runStep} from '../src/logic.js';
import {collectPowerups,tickPowerups} from '../src/powerups.js';
test('hoverboard collection grants nine seconds of speed then restores normal movement',()=>{const state={lane:1,distance:35,z:-35,speed:14,recovery:0,airborneHeight:0,verticalSpeed:0};collectPowerups(state,[{id:0,type:'hoverboard',distance:35,lane:1}],[]);assert.equal(state.hoverboardTime,9);const fast=runStep(state,.05);assert.ok(Math.abs(fast.distance-state.distance-14*1.35*.05)<1e-9);tickPowerups(state,9);assert.equal(state.hoverboardTime,0);assert.ok(Math.abs(runStep(state,.05).distance-state.distance-14*.05)<1e-9);});
