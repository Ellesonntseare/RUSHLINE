import test from 'node:test';
import assert from 'node:assert/strict';
import {LANES,nextLane,createObstacles,hitsObstacle,runStep,updateTrainRoof,MAX_DISTANCE,TRAIN_HIT_DISTANCE,TRAIN_ROOF_HEIGHT,ROLL_DURATION,COLLISION_RECOVERY_SECONDS} from '../src/logic.js';
import {applyCollisionBump,collisionRunRate} from '../src/collision-feedback.js';
test('lane changes remain within three available lanes',()=>{assert.equal(nextLane(0,-1),0);assert.equal(nextLane(2,1),2);assert.equal(nextLane(1,-1),0);assert.equal(LANES.length,3);});
test('shared-seed obstacles are deterministic and sorted',()=>{const a=createObstacles(123,40), b=createObstacles(123,40);assert.deepEqual(a,b);assert.ok(a.every((o,i)=>i===0||o.distance>a[i-1].distance));assert.ok(a.every(o=>o.lane>=0&&o.lane<=2));});
test('jumping clears barriers but not full-height trains',()=>{const runner={lane:1,z:-50,airborneHeight:1.4};assert.equal(hitsObstacle(runner,{type:'barrier',lane:1,z:-50,hit:false}),false);assert.equal(hitsObstacle(runner,{type:'train',lane:1,z:-50,hit:false}),true);});
test('other lane does not collide',()=>{assert.equal(hitsObstacle({lane:0,z:-20,airborneHeight:0},{lane:1,z:-20,type:'train',hit:false}),false);});
test('roll clears overhead gates, while standing and jumping collide',()=>{
 const gate={type:'overhead',lane:1,z:-50,hit:false};
 assert.equal(hitsObstacle({lane:1,z:-50,airborneHeight:0,slide:ROLL_DURATION},gate),false);
 assert.equal(hitsObstacle({lane:1,z:-50,airborneHeight:0,slide:0},gate),true);
 assert.equal(hitsObstacle({lane:1,z:-50,airborneHeight:1,slide:ROLL_DURATION},gate),true);
});
test('train collision covers its full modelled length, with room between obstacle groups',()=>{
 const train={type:'train',lane:1,z:-50,hit:false};
 assert.equal(hitsObstacle({lane:1,z:-50+TRAIN_HIT_DISTANCE-.1,airborneHeight:2},train),true);
 assert.equal(hitsObstacle({lane:1,z:-50+TRAIN_HIT_DISTANCE+.1,airborneHeight:0},train),false);
 const obstacles=createObstacles(42,95);
 assert.deepEqual([...new Set(obstacles.map(o=>o.type))].sort(),['barrier','overhead','train']);
 assert.ok(obstacles.every((o,i)=>i===0||o.distance-obstacles[i-1].distance>=15));
});
test('a jump reaches the train roof, runs its length, then drops from the back',()=>{
 const train={id:7,type:'train',lane:1,z:-50,distance:50,hit:false};
 let s={lane:1,z:-(50-TRAIN_HIT_DISTANCE)-.1,distance:50-TRAIN_HIT_DISTANCE+.1,speed:14,recovery:0,airborneHeight:1,verticalSpeed:0,platform:null};
 updateTrainRoof(s,[train]);
 assert.equal(s.platform,7);
 assert.equal(s.airborneHeight,TRAIN_ROOF_HEIGHT);
 assert.equal(hitsObstacle(s,train),false);
 for(let i=0;i<18;i++){s=runStep(s,.05);updateTrainRoof(s,[train]);}
 assert.equal(s.platform,7);
 assert.equal(s.airborneHeight,TRAIN_ROOF_HEIGHT);
 for(let i=0;i<3;i++){s=runStep(s,.05);updateTrainRoof(s,[train]);}
 assert.equal(s.platform,null);
 s=runStep(s,.05);
 assert.ok(s.airborneHeight<TRAIN_ROOF_HEIGHT);
});
test('switching lanes leaves the roof',()=>{
 const train={id:2,type:'train',lane:1,z:-50,distance:50,hit:false};
 const s={lane:0,z:-50,distance:50,speed:14,recovery:0,airborneHeight:TRAIN_ROOF_HEIGHT,verticalSpeed:0,platform:2};
 updateTrainRoof(s,[train]);
 assert.equal(s.platform,null);
});
test('the longer race keeps a runner slow for three seconds after a collision',()=>{
 assert.equal(MAX_DISTANCE,600);
 let s={z:0,distance:0,speed:10,recovery:COLLISION_RECOVERY_SECONDS,airborneHeight:0,verticalSpeed:0};
 for(let i=0;i<61;i++){const before=s.distance;s=runStep(s,.05);assert.ok(Math.abs(s.distance-before-.21)<1e-9);}
 assert.ok(s.recovery<.0001);
 const normal=runStep(s,.05);assert.ok(Math.abs(normal.distance-s.distance-.5)<1e-9);
});

test('collision shows a brief bump and restores the normal running pose',()=>{
 const visual={rotation:{x:0,z:0},position:{y:0}};
 applyCollisionBump(visual,COLLISION_RECOVERY_SECONDS-.2);
 assert.ok(visual.rotation.x<-.1&&visual.rotation.z>0&&visual.position.y<0);
 assert.equal(collisionRunRate(2),.68);
 visual.position.y=0;applyCollisionBump(visual,1);
 assert.equal(visual.rotation.x,0);assert.equal(visual.rotation.z,0);
 assert.equal(collisionRunRate(0),1);
});

test('jumping lands and stops vertically instead of sinking into the track',()=>{
  let s={z:0,distance:0,speed:14,recovery:0,airborneHeight:0,verticalSpeed:8.25};
  let peaked=false;
  for(let i=0;i<150;i++){
    s=runStep(s,1/60);
    if(s.airborneHeight>1.3)peaked=true;
  }
  assert.equal(peaked,true);
  assert.equal(s.airborneHeight,0);
  assert.equal(s.verticalSpeed,0);
});
test('invalid or negative time steps do not move player',()=>{
  const s={z:0,distance:0,speed:14,recovery:0,airborneHeight:0,verticalSpeed:0};
  assert.equal(runStep(s,-1),s);assert.equal(runStep(s,NaN),s);
});

