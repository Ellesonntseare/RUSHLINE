import test from 'node:test';
import assert from 'node:assert/strict';
import {createObstacles,resolveObstacleHit,COLLISION_RECOVERY_SECONDS} from '../src/logic.js';
import {createPowerups,collectPowerups,tickPowerups,jumpSpeed,MAGNET_SECONDS,HIGH_JUMP_SPEED,JUMP_SPEED} from '../src/powerups.js';
import {createCoins,collectCoins} from '../src/coins.js';

test('pickup positions are shared and avoid nearby obstacles',()=>{
  const obstacles=createObstacles(123,95);
  const a=createPowerups(obstacles,123);
  assert.deepEqual(a,createPowerups(obstacles,123));
  assert.ok(a.some(item=>item.type==='magnet'));
  assert.ok(a.some(item=>item.type==='mystery'));
  assert.deepEqual(a.slice(0,6).map(item=>item.type),['hoverboard','magnet','highJump','doubleCoins','shield','mystery']);
  for(const item of a)assert.ok(!obstacles.some(o=>o.lane===item.lane&&Math.abs(o.distance-item.distance)<13));
  for(let i=1;i<a.length;i++)assert.ok(a[i].distance-a[i-1].distance>=40);
  const coins=createCoins(obstacles,undefined,a);
  for(const coin of coins)assert.ok(!a.some(item=>Math.abs(item.distance-coin.distance)<9));
});

test('new pickups raise jump, double coins and protect one collision',()=>{
  const state={lane:1,distance:10,magnetTime:0,highJumpTime:0,doubleCoinsTime:0,shieldCharges:0,recovery:0};
  const items=[{id:1,type:'highJump',lane:1,distance:10},{id:2,type:'doubleCoins',lane:1,distance:20},{id:3,type:'shield',lane:1,distance:30}];
  const collected=[];
  assert.deepEqual(collectPowerups(state,items,collected),['highJump']);
  assert.equal(jumpSpeed(state),HIGH_JUMP_SPEED);
  tickPowerups(state,9);
  assert.equal(jumpSpeed(state),JUMP_SPEED);
  state.distance=20;assert.deepEqual(collectPowerups(state,items,collected),['doubleCoins']);
  assert.ok(state.doubleCoinsTime>0);
  state.distance=30;assert.deepEqual(collectPowerups(state,items,collected),['shield']);
  const obstacle={hit:false};
  assert.equal(resolveObstacleHit(state,obstacle),'shield');
  assert.equal(state.shieldCharges,0);assert.equal(state.recovery,0);
  assert.equal(resolveObstacleHit(state,{hit:false}),'hit');assert.equal(state.recovery,COLLISION_RECOVERY_SECONDS);
});

test('magnet and mystery rewards collect once, and magnet reaches adjacent lanes',()=>{
  const state={lane:1,distance:35,airborneHeight:0,magnetTime:0,bonusCoins:0};
  const items=[{id:0,type:'magnet',lane:1,distance:35},{id:3,type:'mystery',lane:1,distance:45}];
  const collected=[];
  assert.deepEqual(collectPowerups(state,items,collected),['magnet']);
  assert.equal(state.magnetTime,MAGNET_SECONDS);
  assert.deepEqual(collectPowerups(state,items,collected),[]);
  const coins=[{id:0,lane:0,distance:37},{id:1,lane:2,distance:39}];
  const taken=[];collectCoins(state,coins,taken);assert.deepEqual(taken,[0,1]);
  state.distance=45;assert.deepEqual(collectPowerups(state,items,collected),['coins']);
  assert.equal(state.bonusCoins,10);
});
