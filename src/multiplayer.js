const el=id=>document.getElementById(id);
export const PLAYER_COLORS=['#f9c867','#72d9ff','#caa0ff','#89edb5'];
export function setupMultiplayer({prepare,showPanel,setHud,getEngine,getLoadout}){
  let socket=null,id=null,room=null,busy=false,generation=0,lobbyKey=null,resultCode=null;
  let assetsReady=false,loadingStarted=false,assetStatus='Preparing game files…';
  const send=m=>{if(socket?.readyState===1)socket.send(JSON.stringify(m));};
  const error=text=>{el('roomError').textContent=text;};
  const row=(p,text)=>{const li=document.createElement('li');li.textContent=text;li.style.color=PLAYER_COLORS[p.slot];return li;};
  const sorted=players=>[...players].sort((a,b)=>(a.finish??Infinity)-(b.finish??Infinity)||(b.distance||0)-(a.distance||0)||a.slot-b.slot);
  function cleanup(){
    generation++;busy=false;lobbyKey=null;resultCode=null;assetsReady=false;loadingStarted=false;assetStatus='Preparing game files…';el('createRoom').disabled=el('joinRoom').disabled=false;
    if(socket){socket.onclose=null;socket.close();socket=null;}room=null;id=null;
    getEngine()?.stopNetwork();setHud(false);showPanel('menu');
    el('raceBoard').classList.add('hidden');el('countdown').classList.add('hidden');
  }
  async function prepareInLobby(attempt){
    if(loadingStarted)return;
    loadingStarted=true;
    try{
      await prepare(status=>{
        if(attempt!==generation)return;
        assetStatus=status;
        if(room?.phase==='lobby')el('roomHint').textContent=status;
      });
      if(attempt!==generation)return;
      assetsReady=true;lobbyKey=null;if(room?.phase==='lobby')snapshot(room);
    }catch(e){
      if(attempt!==generation)return;
      assetStatus='Game files could not load. Leave the room and try again.';
      el('roomHint').textContent=assetStatus;
      error(e.message||'Failed to load game files.');
      console.error('Multiplayer assets failed:',e);
    }
  }
  function snapshot(r){
    room=r;const me=r.players.find(p=>p.id===id);if(!me)return;
    if(r.phase==='lobby'){
      const key=JSON.stringify(r);if(key===lobbyKey)return;lobbyKey=key;
      showPanel('rooms');el('roomEntry').classList.add('hidden');el('roomLobby').classList.remove('hidden');
      el('roomCode').textContent=r.code;
      el('roomPlayers').replaceChildren(...r.players.map(p=>row(p,`${p.name}${p.id===id?' (you)':''}${p.id===r.host?' · HOST':''} · ${p.ready?'READY':'waiting'}`)));
      el('readyBtn').textContent=me.ready?'NOT READY':assetsReady?"I'M READY":'LOADING GAME…';
      el('readyBtn').disabled=!assetsReady;
      el('startRace').classList.toggle('hidden',r.host!==id);
      el('startRace').disabled=!assetsReady||r.players.length<2||r.players.some(p=>!p.ready);
      el('roomHint').textContent=!assetsReady?assetStatus:r.host===id?'Start when at least two runners are ready.':'Waiting for the host to start.';
      return;
    }
    if(r.phase==='results'&&resultCode===r.code)return;
    const engine=getEngine();
    if(!engine.network){engine.startNetwork(r,id,action=>send({type:'input',action}));showPanel(null);setHud(true);el('pauseBtn').classList.add('hidden');}
    engine.receiveRoom(r);
    el('raceBoard').classList.remove('hidden');
    el('racePlayers').replaceChildren(...sorted(r.players).map(p=>row(p,`${p.name}${p.id===id?' (you)':''} · ${!p.connected?'LEFT':p.finish!==null?'FINISHED':`${Math.floor(p.distance)}m`}`)));
    el('countdown').classList.toggle('hidden',r.phase!=='countdown'&&me.finish===null);
    el('countdown').textContent=r.phase==='countdown'?Math.ceil(r.countdown):'FINISHED';
    if(r.phase==='results'){
      resultCode=r.code;for(const remote of engine.network.remotes.values())remote.label.style.display='none';
      const showResults=()=>{
        engine.isPlaying=false;setHud(false);el('raceBoard').classList.add('hidden');el('countdown').classList.add('hidden');
        el('finishOrder').replaceChildren(...sorted(r.players).map(p=>row(p,`${p.name} · ${p.finish!==null?p.finish.toFixed(2)+'s':'DNF'}`)));
        showPanel('raceResults');
      };
      const podium=()=>engine.startPodium(sorted(r.players).filter(p=>p.finish!==null),showResults);
      if(engine.celebrating)engine.finishCallback=podium;
      else podium();
    }
  }
  function connect(type){
    if(busy||room)return;const code=el('roomCodeInput').value.trim().toUpperCase();
    if(type==='join'&&!/^[A-F0-9]{6}$/.test(code)){error('Enter the six-character room code.');return;}
    const attempt=++generation;busy=true;error('Connecting to race server…');el('createRoom').disabled=el('joinRoom').disabled=true;
    try{
      if(socket){socket.onclose=null;socket.close();}
      socket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/race`);
      const active=socket;
      const timeout=setTimeout(()=>{if(active.readyState!==1)active.close();},12000);
      socket.onopen=()=>{clearTimeout(timeout);error('Opening room…');const loadout=getLoadout?.()||{board:'standard',dance:'random'};send({type,name:el('runnerName').value,code,skin:el('skinPicker').value,boardStyle:loadout.board,danceStyle:loadout.dance});busy=false;el('createRoom').disabled=el('joinRoom').disabled=false;};
      socket.onmessage=event=>{const m=JSON.parse(event.data);if(m.type==='welcome')id=m.id;else if(m.type==='room'){error('');snapshot(m);if(m.phase==='lobby')prepareInLobby(attempt);}else if(m.type==='error')error(m.message);};
      socket.onclose=()=>{clearTimeout(timeout);cleanup();showPanel('rooms');resetEntry();error('Connection lost. Create or join a new room.');busy=false;el('createRoom').disabled=el('joinRoom').disabled=false;};
      socket.onerror=()=>error('Cannot reach the race server. Check your connection and retry.');
    }catch(e){error(e.message);busy=false;el('createRoom').disabled=el('joinRoom').disabled=false;}
  }
  function resetEntry(){el('roomEntry').classList.remove('hidden');el('roomLobby').classList.add('hidden');error('');}
  el('multiplayerBtn').onclick=()=>{resetEntry();showPanel('rooms');};
  el('createRoom').onclick=()=>connect('create');el('joinRoom').onclick=()=>connect('join');
  el('readyBtn').onclick=()=>{error('');send({type:'ready',ready:!room?.players.find(p=>p.id===id)?.ready});};
  el('startRace').onclick=()=>send({type:'start'});
  for(const button of ['leaveRoom','leaveRace','raceHome'])el(button).onclick=cleanup;
}
