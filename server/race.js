import {requestJump,consumeJumpBuffer} from '../src/controls.js';
import {createCoins,collectCoins} from '../src/coins.js';
import {createPowerups,collectPowerups,tickPowerups,jumpSpeed} from '../src/powerups.js';
import {randomBytes,randomUUID} from 'node:crypto';
import {WebSocketServer} from 'ws';
import {DEFAULT_SPEED,MAX_DISTANCE,ROLL_DURATION,TRAIN_HIT_DISTANCE,createObstacles,runStep,updateTrainRoof,nextLane,hitsObstacle,resolveObstacleHit} from '../src/logic.js';

export class RaceRooms {
  constructor(){this.rooms=new Map();}
  join(client,code,name,skin='classic',boardStyle='standard',danceStyle='random'){
    if(client.room)throw Error('Leave your current room first.');
    let room;
    if(code){room=this.rooms.get(code);if(!room)throw Error('Room not found. Check the code.');}
    else {
      if(this.rooms.size>=100)throw Error('Server full. Try again later.');
      do{code=randomBytes(3).toString('hex').toUpperCase();}while(this.rooms.has(code));
      room={code,host:client.id,phase:'lobby',players:new Map(),seed:0,elapsed:0};this.rooms.set(code,room);
    }
    if(room.phase!=='lobby')throw Error('That race has already started.');
    if(room.players.size>=4)throw Error('Room full (4 runners maximum).');
    const slots=new Set([...room.players.values()].map(p=>p.slot));let slot=0;while(slots.has(slot))slot++;
    room.players.set(client.id,{id:client.id,name:String(name||'Runner').trim().slice(0,18)||'Runner',skin:['classic','street','urban'].includes(skin)?skin:'classic',boardStyle:boardStyle==='pulse-board'?'pulse-board':'standard',danceStyle:['hip-hop','twist','silly'].includes(danceStyle)?danceStyle:'random',slot,ready:false,connected:true});
    client.room=room;return room;
  }
  start(client){
    const room=client.room;
    if(!room||room.host!==client.id)throw Error('Only the host can start the race.');
    if(room.phase!=='lobby'||room.players.size<2||[...room.players.values()].some(p=>!p.ready))throw Error('At least two runners must be ready.');
    room.phase='countdown';room.countdown=3;room.seed=randomBytes(4).readUInt32LE();room.elapsed=0;
    for(const p of room.players.values())Object.assign(p,{lane:p.slot%3,z:0,distance:0,speed:DEFAULT_SPEED,recovery:0,airborneHeight:0,verticalSpeed:0,platform:null,jumpBuffer:0,slide:0,cooldown:0,finish:null,collectedCoins:[],collectedPowerups:[],hoverboardTime:0,magnetTime:0,highJumpTime:0,doubleCoinsTime:0,shieldCharges:0,bonusCoins:0,obstacles:createObstacles(room.seed,95)});
    room.powerups=createPowerups(createObstacles(room.seed,95),room.seed);
    room.coins=createCoins(createObstacles(room.seed,95),MAX_DISTANCE,room.powerups);
  }
  input(client,action){
    const r=client.room,p=r?.players.get(client.id);if(r?.phase!=='racing'||!p||p.finish!==null)return;
    if(action==='left'||action==='right')p.lane=nextLane(p.lane,action==='left'?-1:1);
    if(action==='jump')requestJump(p,jumpSpeed(p));
    if(action==='slide'&&p.airborneHeight<=.05&&p.slide===0)p.slide=ROLL_DURATION;
  }
  leave(client){
    const r=client.room;if(!r)return;client.room=null;
    if(r.phase==='lobby')r.players.delete(client.id);
    else {const p=r.players.get(client.id);if(p)p.connected=false;}
    const live=[...r.players.values()].filter(p=>p.connected);
    if(!live.length)this.rooms.delete(r.code);
    else if(r.host===client.id)r.host=live[0].id;
  }
  tick(dt){
    for(const r of this.rooms.values()){
      if(r.phase==='countdown'){r.countdown-=dt;if(r.countdown<=0)r.phase='racing';continue;}
      if(r.phase!=='racing')continue;
      r.elapsed+=dt;
      for(const p of r.players.values()){
        if(!p.connected||p.finish!==null)continue;
        Object.assign(p,runStep(p,dt));updateTrainRoof(p,p.obstacles);consumeJumpBuffer(p,dt,jumpSpeed(p));p.slide=Math.max(0,p.slide-dt);p.cooldown=Math.max(0,p.cooldown-dt);
        for(const o of p.obstacles){if(o.distance<p.distance-TRAIN_HIT_DISTANCE-1)continue;if(o.distance>p.distance+TRAIN_HIT_DISTANCE+1)break;
          if(!p.cooldown&&hitsObstacle(p,o)){const outcome=resolveObstacleHit(p,o);p.cooldown=outcome==='shield' ? .8 : 1.5;}
        }
        tickPowerups(p,dt);
        collectPowerups(p,r.powerups,p.collectedPowerups);
        const gained=collectCoins(p,r.coins,p.collectedCoins);
        if(p.doubleCoinsTime>0)p.bonusCoins+=gained.length;
        if(p.distance>=MAX_DISTANCE){p.distance=MAX_DISTANCE;p.z=-MAX_DISTANCE;p.finish=r.elapsed;}
      }
      if([...r.players.values()].every(p=>!p.connected||p.finish!==null)||r.elapsed>240)r.phase='results';
    }
  }
  snapshot(r){return {type:'room',code:r.code,host:r.host,phase:r.phase,seed:r.seed,countdown:Math.max(0,r.countdown||0),elapsed:r.elapsed,players:[...r.players.values()].map(({obstacles,...p})=>p)};}
}

export function attachRaceServer(server){
  const rooms=new RaceRooms(),wss=new WebSocketServer({noServer:true,maxPayload:2048});
  const upgrade=(req,socket,head)=>{if(req.url==='/race')wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));};
  server.on('upgrade',upgrade);
  const send=(ws,value)=>{if(ws.readyState===1)ws.send(JSON.stringify(value));};
  wss.on('connection',ws=>{
    const client={id:randomUUID(),room:null};ws.client=client;ws.alive=true;ws.on('pong',()=>ws.alive=true);
    send(ws,{type:'welcome',id:client.id});let windowStart=Date.now(),count=0;
    ws.on('message',data=>{try{
      if(Date.now()-windowStart>1000){windowStart=Date.now();count=0;}if(++count>40)throw Error('Too many commands.');
      const m=JSON.parse(data);if(!m||typeof m!=='object')return;
      if(m.type==='create'||m.type==='join')rooms.join(client,m.type==='join'?String(m.code||'').toUpperCase():null,m.name,m.skin,m.boardStyle,m.danceStyle);
      else if(m.type==='ready'&&client.room?.phase==='lobby')client.room.players.get(client.id).ready=m.ready===true;
      else if(m.type==='start')rooms.start(client);
      else if(m.type==='input')rooms.input(client,m.action);
      else if(m.type==='leave'){rooms.leave(client);send(ws,{type:'left'});}
    }catch(e){send(ws,{type:'error',message:e.message});}});
    ws.on('error',()=>{});ws.on('close',()=>rooms.leave(client));
  });
  const tick=setInterval(()=>{rooms.tick(.05);for(const ws of wss.clients)if(ws.client.room)send(ws,rooms.snapshot(ws.client.room));},50);
  const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},15000);
  const close=()=>{clearInterval(tick);clearInterval(heartbeat);server.off('upgrade',upgrade);for(const ws of wss.clients)ws.terminate();wss.close();};
  server.once('close',close);return {rooms,wss,close};
}
