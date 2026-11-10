import test from 'node:test';
import assert from 'node:assert/strict';
import {danceIndexForRunner,danceDuration} from '../src/dances.js';

test('a runner keeps the same finish dance in a race',()=>{
  assert.equal(danceIndexForRunner('player-1',4),danceIndexForRunner('player-1',4));
  assert.ok(danceIndexForRunner('player-1',4)>=0);
  assert.ok(danceIndexForRunner('player-1',4)<4);
  assert.equal(danceIndexForRunner('player-1',0),-1);
});

test('a finish dance has a bounded on-screen duration',()=>{
  assert.equal(danceDuration({duration:0.4}),2);
  assert.equal(danceDuration({duration:5}),5);
  assert.equal(danceDuration({duration:20}),8);
});
