import test from 'node:test';
import assert from 'node:assert/strict';
import {createDailyChallenges,DAILY_STORAGE_KEY,localDay} from '../src/daily-challenges.js';

function memoryStorage(){
  const values=new Map();
  return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
}

test('daily goals award each bonus once and survive a reload',()=>{
  const storage=memoryStorage(),date=new Date(2026,9,19,10);
  const daily=createDailyChallenges(storage,()=>date);
  const goals=daily.snapshot().challenges;
  assert.equal(daily.record({coins:goals[0].target-1}).length,0);
  assert.deepEqual(daily.record({coins:1}).map(goal=>goal.id),['coins']);
  assert.equal(daily.record({coins:100}).length,0);
  assert.deepEqual(daily.record({meters:goals[1].target,cleanFinish:true}).map(goal=>goal.id),['distance','clean']);
  assert.equal(daily.snapshot().wallet,125);
  assert.equal(createDailyChallenges(storage,()=>date).snapshot().challenges.filter(goal=>goal.complete).length,3);
  assert.ok(storage.getItem(DAILY_STORAGE_KEY));
});

test('a new local day resets goals but keeps the earned balance',()=>{
  const storage=memoryStorage();let date=new Date(2026,9,19,23,59);
  const daily=createDailyChallenges(storage,()=>date);
  const first=daily.snapshot();
  daily.record({cleanFinish:true});
  date=new Date(2026,9,20,0,1);
  const second=daily.snapshot();
  assert.notEqual(second.day,first.day);
  assert.equal(second.day,localDay(date));
  assert.equal(second.wallet,60);
  assert.equal(second.challenges.filter(goal=>goal.complete).length,0);
  assert.equal(daily.record({cleanFinish:true}).length,1);
  assert.equal(daily.snapshot().wallet,120);
});

test('invalid saved data cannot complete goals or grant coins',()=>{
  const storage=memoryStorage();
  storage.setItem(DAILY_STORAGE_KEY,JSON.stringify({day:'2026-10-19',wallet:-10,progress:{coins:'bad',distance:-100},claimed:'coins'}));
  const daily=createDailyChallenges(storage,()=>new Date(2026,9,19));
  assert.equal(daily.snapshot().wallet,0);
  assert.equal(daily.snapshot().challenges.filter(goal=>goal.complete).length,0);
  assert.equal(daily.record({coins:-100,meters:NaN,cleanFinish:false}).length,0);
});

test('collected coins buy real cosmetics once and keep the loadout across days',()=>{
  const storage=memoryStorage();let date=new Date(2026,9,19,12);
  const progress=createDailyChallenges(storage,()=>date);
  assert.equal(progress.purchase('pulse-board').ok,false);
  progress.creditCoins(280);
  assert.deepEqual(progress.purchase('pulse-board').ok,true);
  assert.equal(progress.snapshot().wallet,100);
  assert.equal(progress.snapshot().equipped.board,'pulse-board');
  assert.equal(progress.purchase('pulse-board').ok,false);
  assert.equal(progress.purchase('hip-hop').ok,true);
  assert.equal(progress.snapshot().wallet,0);
  assert.equal(progress.equipDefault('dance'),true);
  assert.equal(progress.equip('hip-hop'),true);
  date=new Date(2026,9,20,12);
  const reloaded=createDailyChallenges(storage,()=>date).snapshot();
  assert.equal(reloaded.wallet,0);
  assert.deepEqual(reloaded.owned,['pulse-board','hip-hop']);
  assert.deepEqual(reloaded.equipped,{board:'pulse-board',dance:'hip-hop'});
});
