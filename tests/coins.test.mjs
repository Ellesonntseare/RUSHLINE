import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCoins,collectCoins} from '../src/coins.js';
import {createObstacles,MAX_DISTANCE} from '../src/logic.js';

test('three-lane coins leave space around obstacles and stay before the finish',()=>{
 const obstacles=createObstacles(123,95),coins=createCoins(obstacles);
 assert.deepEqual([...new Set(coins.map(c=>c.lane))].sort(),[0,1,2]);
 for(const coin of coins){assert.ok(coin.distance<MAX_DISTANCE);assert.ok(!obstacles.some(o=>o.lane===coin.lane&&Math.abs(o.distance-coin.distance)<12));}
});
test('coins collect once, only in the matching lane and within reach',()=>{
 const coins=[{id:0,lane:1,distance:12,z:-12}],collected=[];
 collectCoins({lane:0,distance:12,airborneHeight:0},coins,collected);assert.equal(collected.length,0);
 collectCoins({lane:1,distance:12,airborneHeight:2},coins,collected);assert.equal(collected.length,0);
 collectCoins({lane:1,distance:12,airborneHeight:0},coins,collected);
 collectCoins({lane:1,distance:12.5,airborneHeight:0},coins,collected);assert.deepEqual(collected,[0]);
});
