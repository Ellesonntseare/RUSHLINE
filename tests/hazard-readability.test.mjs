import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHazardMarkers,collectibleGlint} from '../src/hazard-markers.js';
import {runStep,updateTrainRoof,hitsObstacle,TRAIN_HIT_DISTANCE,TRAIN_RAMP_LENGTH,TRAIN_ROOF_HEIGHT,createObstacles} from '../src/logic.js';
import {createPowerups} from '../src/powerups.js';
import {createCoins} from '../src/coins.js';
test('hazard markings have bounded draw calls and ramp geometry matches physics',()=>{
 for(const type of ['barrier','overhead','train']){const markers=createHazardMarkers(type);assert.ok(markers.children.length<=4);markers.traverse(o=>{if(o.isMesh)assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));});
 if(type==='train'){const bounds=new THREE.Box3().setFromObject(markers);assert.ok(Math.abs(bounds.max.z-(TRAIN_HIT_DISTANCE+TRAIN_RAMP_LENGTH))<.1);assert.ok(Math.abs(bounds.max.y-TRAIN_ROOF_HEIGHT)<.1);}}
});
test('a grounded runner climbs the visible ramp gradually without colliding',()=>{
 const train={id:0,type:'train',lane:1,distance:50,z:-50,hit:false};
 let s={lane:1,distance:50-TRAIN_HIT_DISTANCE-TRAIN_RAMP_LENGTH-.1,z:0,speed:14,recovery:0,airborneHeight:0,verticalSpeed:0,platform:null};s.z=-s.distance;
 let previous=0;
 for(let i=0;i<12;i++){s=runStep(s,.05);updateTrainRoof(s,[train]);assert.ok(s.airborneHeight>=previous);assert.ok(s.airborneHeight-previous<.5);assert.equal(hitsObstacle(s,train),false);previous=s.airborneHeight;}
 assert.equal(s.airborneHeight,TRAIN_ROOF_HEIGHT);
});
test('collectibles leave a clear hazard band and train ramps do not overlap previous obstacles',()=>{
 for(const seed of [123,21032026,42]){
 const obstacles=createObstacles(seed,95),powers=createPowerups(obstacles,seed),coins=createCoins(obstacles,undefined,powers);
 for(const p of powers)assert.ok(obstacles.every(o=>Math.abs(o.distance-p.distance)>=8));
 for(const c of coins)assert.ok(obstacles.every(o=>Math.abs(o.distance-c.distance)>=7));
 for(let i=0;i<obstacles.length;i++){const current=obstacles[i],previous=obstacles.slice(0,i).findLast(o=>o.lane===current.lane);if(current.type==='train'&&previous)assert.ok(current.distance-TRAIN_HIT_DISTANCE-TRAIN_RAMP_LENGTH>previous.distance+(previous.type==='train'?TRAIN_HIT_DISTANCE:1.7));}
 }
 assert.ok(collectibleGlint(45,[{type:'train',distance:50}])<collectibleGlint(10,[{type:'train',distance:50}]));
});

test('jumping above a train roof does not collide with the carriage',()=>{
 const train={id:0,type:'train',lane:1,distance:50,z:-50,hit:false};
 assert.equal(hitsObstacle({lane:1,z:-50,platform:null,airborneHeight:TRAIN_ROOF_HEIGHT+.5},train),false);
 assert.equal(hitsObstacle({lane:1,z:-50,platform:null,airborneHeight:1},train),true);
});
