import test from 'node:test';
import assert from 'node:assert/strict';
import {setupMultiplayer} from '../src/multiplayer.js';

test('a public room opens before large runner assets finish loading',async()=>{
  const elements=new Map(),sent=[];
  const element=()=>({
    classList:{add(){},remove(){},toggle(){}},style:{},textContent:'',value:'',disabled:false,
    replaceChildren(){},onclick:null
  });
  global.document={getElementById:id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);},createElement:()=>element()};
  global.location={protocol:'https:',host:'rush.example.test'};
  let socket;
  global.WebSocket=class{
    constructor(url){this.url=url;this.readyState=1;socket=this;}
    send(value){sent.push(JSON.parse(value));}
    close(){this.readyState=3;}
  };
  let finishLoading,reportProgress,prepareStarted=false;
  const prepare=report=>{prepareStarted=true;reportProgress=report;return new Promise(resolve=>finishLoading=resolve);};
  const engine={network:null,stopNetwork(){}};
  setupMultiplayer({prepare,showPanel(){},setHud(){},getEngine:()=>engine});
  document.getElementById('skinPicker').value='urban';
  document.getElementById('runnerName').value='Tester';
  document.getElementById('createRoom').onclick();
  assert.equal(socket.url,'wss://rush.example.test/race');
  assert.equal(prepareStarted,false,'asset loading must not block the connection');
  socket.onopen();
  assert.equal(sent[0].type,'create');
  socket.onmessage({data:JSON.stringify({type:'welcome',id:'me'})});
  const room={type:'room',code:'ABC123',phase:'lobby',host:'me',players:[{id:'me',name:'Tester',slot:0,ready:false}]};
  socket.onmessage({data:JSON.stringify(room)});
  assert.equal(prepareStarted,true);
  assert.equal(document.getElementById('roomCode').textContent,'ABC123');
  assert.equal(document.getElementById('readyBtn').disabled,true);
  reportProgress('Loading finish dances…');
  assert.equal(document.getElementById('roomHint').textContent,'Loading finish dances…');
  finishLoading();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(document.getElementById('readyBtn').disabled,false);
  assert.equal(document.getElementById('readyBtn').textContent,"I'M READY");
});
