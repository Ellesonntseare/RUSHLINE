import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {WebSocket} from 'ws';
import {RaceRooms,attachRaceServer} from '../server/race.js';
import {MAX_DISTANCE,COLLISION_RECOVERY_SECONDS} from '../src/logic.js';

function lobby(){const service=new RaceRooms(),a={id:'a'},b={id:'b'};const room=service.join(a,null,'Alice');service.join(b,room.code,'Bob');return {service,a,b,room};}
function start(ctx){for(const p of ctx.room.players.values())p.ready=true;ctx.service.start(ctx.a);for(let i=0;i<61;i++)ctx.service.tick(.05);}
test('rooms enforce capacity, valid codes, readiness and host ownership',()=>{
 const c=lobby();assert.throws(()=>c.service.join({id:'x'},'000000','x'),/not found/);
 assert.throws(()=>c.service.start(c.b),/host/);assert.throws(()=>c.service.start(c.a),/ready/);
 c.service.join({id:'c'},c.room.code,'C');c.service.join({id:'d'},c.room.code,'D');
 assert.throws(()=>c.service.join({id:'e'},c.room.code,'E'),/full/);start(c);
 assert.throws(()=>c.service.join({id:'f'},c.room.code,'F'),/started/);
});
test('the third character choice survives room creation',()=>{
 const service=new RaceRooms(),player={id:'city'};
 const room=service.join(player,null,'City Player','urban');
 assert.equal(room.players.get('city').skin,'urban');
});
test('equipped shop looks travel with the room snapshot',()=>{
 const service=new RaceRooms(),player={id:'shopper'};
 const room=service.join(player,null,'Shopper','urban','pulse-board','hip-hop');
 const entrant=service.snapshot(room).players[0];
 assert.equal(entrant.boardStyle,'pulse-board');
 assert.equal(entrant.danceStyle,'hip-hop');
 const stranger={id:'stranger'};
 service.join(stranger,room.code,'Stranger','classic','unlisted','unknown');
 assert.equal(room.players.get('stranger').boardStyle,'standard');
 assert.equal(room.players.get('stranger').danceStyle,'random');
});
test('countdown prevents movement; all players share deterministic obstacles',()=>{
 const c=lobby();for(const p of c.room.players.values())p.ready=true;c.service.start(c.a);
 c.service.input(c.a,'jump');c.service.tick(.05);
 assert.equal(c.room.players.get('a').distance,0);assert.equal(c.room.players.get('a').verticalSpeed,0);
 assert.deepEqual(c.room.players.get('a').obstacles,c.room.players.get('b').obstacles);
 assert.notEqual(c.room.players.get('a').obstacles,c.room.players.get('b').obstacles);
});
test('server owns movement, jump, collision slowdown and finish time',()=>{
 const c=lobby();start(c);const p=c.room.players.get('a');
 c.service.input(c.a,'right');assert.equal(p.lane,1);c.service.input(c.a,'jump');c.service.tick(.05);assert.ok(p.airborneHeight>0);
 p.airborneHeight=0;p.verticalSpeed=0;p.obstacles=[{id:0,lane:p.lane,z:p.z-.7,distance:p.distance+.7,type:'train',hit:false}];
 c.service.tick(.05);assert.equal(p.recovery,COLLISION_RECOVERY_SECONDS);const before=p.distance;c.service.tick(.05);assert.ok(p.distance-before<.4);
 p.distance=MAX_DISTANCE-.1;p.z=-p.distance;p.recovery=0;c.service.tick(.05);assert.equal(p.distance,MAX_DISTANCE);assert.ok(p.finish>0);
 const finish=p.finish;c.service.input(c.a,'left');c.service.tick(.05);assert.equal(p.finish,finish);
 c.service.leave(c.b);c.service.tick(.05);assert.equal(c.room.phase,'results');
});
test('server accepts a timed roll under overhead obstacles',()=>{
 const c=lobby();start(c);const p=c.room.players.get('a');
 p.obstacles=[{id:0,lane:p.lane,z:p.z-.7,distance:p.distance+.7,type:'overhead',hit:false}];
 c.service.input(c.a,'slide');c.service.tick(.05);
 assert.equal(p.recovery,0);assert.ok(p.slide>0);
 p.slide=0;p.obstacles=[{id:1,lane:p.lane,z:p.z-.7,distance:p.distance+.7,type:'overhead',hit:false}];
 c.service.tick(.05);assert.equal(p.recovery,COLLISION_RECOVERY_SECONDS);
});
test('server awards magnet pickups and nearby coins to the collecting runner only',()=>{
 const c=lobby();start(c);
 const item=c.room.powerups.find(x=>x.type==='magnet');
 const a=c.room.players.get('a'),b=c.room.players.get('b');
 a.lane=item.lane;a.distance=item.distance-.7;a.z=-a.distance;
 b.distance=0;b.z=0;
 c.service.tick(.05);
 assert.ok(a.collectedPowerups.includes(item.id));assert.ok(a.magnetTime>0);
 assert.equal(b.collectedPowerups.length,0);
 const adjacentCoin=c.room.coins.find(x=>x.distance>item.distance+9&&x.lane!==a.lane);
 a.distance=adjacentCoin.distance-.7;a.z=-a.distance;c.service.tick(.05);
 assert.ok(a.collectedCoins.includes(adjacentCoin.id));
});
test('server doubles only coins collected while active and consumes shield on impact',()=>{
 const c=lobby();start(c);const p=c.room.players.get('a');
 p.doubleCoinsTime=4;p.lane=1;p.distance=11.5;p.z=-11.5;p.obstacles=[];
 const before=p.collectedCoins.length;c.service.tick(.05);
 const gained=p.collectedCoins.length-before;
 assert.ok(gained>0);assert.equal(p.bonusCoins,gained);
 p.shieldCharges=1;p.cooldown=0;p.obstacles=[{id:100,lane:p.lane,z:p.z-.7,distance:p.distance+.7,type:'train',hit:false}];
 c.service.tick(.05);assert.equal(p.shieldCharges,0);assert.equal(p.recovery,0);
});
test('host transfers in lobby and disconnected racers are DNF; empty rooms expire',()=>{
 const c=lobby();c.service.leave(c.a);assert.equal(c.room.host,'b');assert.equal(c.room.players.size,1);
 c.service.join(c.a,c.room.code,'Alice');for(const p of c.room.players.values())p.ready=true;c.service.start(c.b);
 c.service.leave(c.a);assert.equal(c.room.players.get('a').connected,false);
 c.service.leave(c.b);assert.equal(c.service.rooms.size,0);
});
test('a complete sprint reaches results with server times for every runner',()=>{
 const c=lobby();start(c);
 for(let i=0;i<4801&&c.room.phase!=='results';i++)c.service.tick(.05);
 assert.equal(c.room.phase,'results');
 for(const p of c.room.players.values()){assert.equal(p.distance,MAX_DISTANCE);assert.ok(p.finish>35&&p.finish<120);}
});
test('real websocket clients create, join, ready and receive synchronized race snapshots',async()=>{
 const http=createServer(),server=attachRaceServer(http);await new Promise(resolve=>http.listen(0,'127.0.0.1',resolve));
 const clients=[];
 const connect=async()=>{const ws=new WebSocket(`ws://127.0.0.1:${http.address().port}/race`);clients.push(ws);ws.messages=[];ws.on('message',m=>ws.messages.push(JSON.parse(m)));await new Promise(resolve=>ws.on('open',resolve));return ws;};
 const wait=async(ws,predicate)=>{const end=Date.now()+3000;while(Date.now()<end){const found=ws.messages.find(predicate);if(found)return found;await new Promise(r=>setTimeout(r,20));}throw Error('Snapshot timeout');};
 try{
  const a=await connect(),b=await connect();a.send('invalid json');await wait(a,m=>m.type==='error');a.send(JSON.stringify({type:'create',name:'A'}));const room=await wait(a,m=>m.type==='room');
  b.send(JSON.stringify({type:'join',code:room.code,name:'B'}));await wait(a,m=>m.players?.length===2);
  a.send(JSON.stringify({type:'ready',ready:true}));b.send(JSON.stringify({type:'ready',ready:true}));await wait(a,m=>m.players?.length===2&&m.players.every(p=>p.ready));
  a.send(JSON.stringify({type:'start'}));const one=await wait(a,m=>m.phase==='countdown'),two=await wait(b,m=>m.phase==='countdown');assert.equal(one.seed,two.seed);assert.equal(one.code,two.code);
 }finally{for(const ws of clients)ws.terminate();server.close();await new Promise(resolve=>http.close(resolve));}
});
