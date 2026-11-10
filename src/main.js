import {swipeAction,requestJump,consumeJumpBuffer} from './controls.js';
import {createGlideClip} from './glide-animation.js';
import {applyCollisionBump,collisionRunRate} from './collision-feedback.js';
import {createHazardMarkers,collectibleGlint} from './hazard-markers.js';
import './install.js';
import {createStreetKit,createHoverboard,updateHoverboard} from './ride-props.js';
import './style.css';
import './daily-challenges.css';
import './shop.css';
import './dances.css';
import {createDailyChallenges} from './daily-challenges.js';
import {shopItem} from './shop-catalog.js';
import {setupShop} from './shop-ui.js';
import {createBoardStyle,cloneLoadedBoardStyle,loadPulseBoard} from './shop-assets.js';
import {createCoins,collectCoins} from './coins.js';
import {createPowerups,collectPowerups,tickPowerups,jumpSpeed} from './powerups.js';
import {playCoin,playVictory,stopVictory} from './audio.js';
import {setupMultiplayer,PLAYER_COLORS} from './multiplayer.js';
import { normalizeRunner } from './runner-model.js';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { LANES, DEFAULT_SPEED, MAX_DISTANCE, ROLL_DURATION, TRAIN_HIT_DISTANCE, TRAIN_ROOF_HEIGHT, clamp, nextLane, createObstacles, hitsObstacle, resolveObstacleHit, runStep, updateTrainRoof } from './logic.js';
import {createOverheadGate,createMagnetProp,createHighJumpProp,createShieldProp,createDoubleCoinsProp} from './props.js';
import {danceIndexForRunner,danceDuration} from './dances.js';
import {createUrbanBuildingTemplates} from './city.js';
import {createGroundMaterials,addGroundDetailMap,createGroundTile,createCityGround} from './ground.js';
import {routeSection,createSectionStructure,createFinishLine} from './route-sections.js';
import {createPodium} from './podium.js';
import {createCharacterPreview,loadCharacterSource} from './character-preview.js';
import {applyCityColorway} from './character-looks.js';

const byId=(id)=>document.getElementById(id);
try{createCharacterPreview(byId('characterPreview'),byId('skinPicker'));}
catch(error){byId('previewLabel').textContent='PREVIEW UNAVAILABLE';console.warn('3D preview unavailable:',error);}
function changeCharacter(direction){
  const picker=byId('skinPicker'),options=[...picker.options];
  picker.selectedIndex=(picker.selectedIndex+direction+options.length)%options.length;
  byId('characterName').textContent=options[picker.selectedIndex].textContent;
  picker.dispatchEvent(new Event('change',{bubbles:true}));
}
byId('previousCharacter').addEventListener('click',()=>changeCharacter(-1));
byId('nextCharacter').addEventListener('click',()=>changeCharacter(1));
window.addEventListener('keydown',event=>{
  if(byId('menu').classList.contains('hidden')||event.repeat||!['ArrowLeft','ArrowRight'].includes(event.code))return;
  event.preventDefault();changeCharacter(event.code==='ArrowLeft'?-1:1);
});
const BEST_STORAGE_KEY=`rushline-best-${MAX_DISTANCE}`;
const panels=['menu','loading','setup','pauseScreen','gameover','rooms','raceResults','dailyPanel','shopPanel'];
function showPanel(name){for(const panel of panels)byId(panel).classList.toggle('hidden',panel!==name);}
function setHud(show){byId('hud').classList.toggle('hidden',!show);byId('pauseBtn').classList.toggle('hidden',!show);}
function message(text){byId('loadingMessage').textContent=text;}
let qualityIndex=0;
const qualities=['AUTO','HIGH','PERFORMANCE'];
byId('settingsBtn').addEventListener('click',()=>{qualityIndex=(qualityIndex+1)%3;byId('qualityLabel').textContent=qualities[qualityIndex];if(engine)engine.setQuality(qualityIndex);});

const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const fbxLoader=new FBXLoader();
function assetTimeout(promise,path){
  let timer;
  return Promise.race([
    promise,
    new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`Download stalled: ${path}. Check your connection and press Retry.`)),90000);})
  ]).finally(()=>clearTimeout(timer));
}
let engine=null;
let enginePromise=null;
const daily=createDailyChallenges(localStorage);
function renderDaily(){
  const {wallet,challenges}=daily.snapshot();
  byId('dailySummaryText').textContent=`${challenges.filter(item=>item.complete).length} / ${challenges.length} COMPLETE`;
  byId('dailyWallet').textContent=`${wallet} COINS`;
  byId('dailyBalance').textContent=String(wallet);
  const rows=challenges.map(item=>{
    const row=document.createElement('article');row.className=`daily-challenge${item.complete?' is-complete':''}`;
    const top=document.createElement('div');top.className='daily-challenge-top';
    const title=document.createElement('h3');title.textContent=item.title;
    const reward=document.createElement('span');reward.className='reward';reward.textContent=`+${item.reward} COINS`;
    top.append(title,reward);
    const track=document.createElement('div');track.className='daily-challenge-track';
    const fill=document.createElement('span');fill.style.width=`${Math.round(item.progress/item.target*100)}%`;track.append(fill);
    const foot=document.createElement('div');foot.className='daily-challenge-foot';
    const progress=document.createElement('span');progress.textContent=item.id==='clean'?`${item.progress} / 1 clean finish`:`${Math.floor(item.progress)} / ${item.target} ${item.unit}`;
    const status=document.createElement('strong');status.textContent=item.complete?'COMPLETE':'IN PROGRESS';
    foot.append(progress,status);row.append(top,track,foot);return row;
  });
  byId('dailyChallengeList').replaceChildren(...rows);
}
byId('dailySummaryBtn').addEventListener('click',()=>{renderDaily();showPanel('dailyPanel');});
byId('dailyClose').addEventListener('click',()=>showPanel('menu'));
renderDaily();
const shop=setupShop({progress:daily,showPanel,onEconomyChanged:renderDaily,applyBoard:style=>engine?.setBoardStyle(style)});
async function loadSceneModels(onProgress=()=>{}){
  const report=text=>{message(text);onProgress(text);};
  const response=await fetch(`/assets/manifest.json?bust=${Date.now()}`,{cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('Missing asset manifest. See README.md.');
  const manifest=await response.json();
  const required=['runner','track','train','barrier','building'];
  const missing=required.filter((key)=>!manifest[key]);
  if(missing.length)throw new Error(`Missing real model assets: ${missing.join(', ')}. See README.md for the asset import commands.`);
  const uniqueKeys=['runner','track','train','barrier',...(manifest.coin?['coin']:[]),...(manifest.mystery?['mystery']:[]),...(manifest.animations?['animations']:[])];
  const results={};
  const tasks=uniqueKeys.map(key=>({key,path:manifest[key]}));
  let complete=0;
  await Promise.all(tasks.map(async({key,path})=>{
    if(key==='runner'){
      const source=await assetTimeout(loadCharacterSource('classic'),path);
      const scene=cloneSkeleton(source);scene.animations=source.animations;
      results[key]={scene,animations:source.animations};
    }else if(/\.fbx$/i.test(path)){
      const scene=await assetTimeout(fbxLoader.loadAsync(path),path);results[key]={scene,animations:scene.animations};
    }else results[key]=await assetTimeout(loader.loadAsync(path),path);
    complete++;report(`Preparing game models ${complete}/${tasks.length}…`);
    byId('loadingBar').style.width=`${Math.round(complete/tasks.length*75)}%`;
  }));
  let clips=[...results.runner.animations,...(results.animations?.animations||[])];
  if(manifest.runnerClips){
    clips=[];
    for(const [name,path] of Object.entries(manifest.runnerClips)){
      report('Loading '+name+' animation…');
      let clip;
      if(/\.json$/i.test(path)){const response=await fetch(path,{signal:AbortSignal.timeout(90000)});if(!response.ok)throw new Error('Missing animation: '+name);clip=THREE.AnimationClip.parse(await response.json());}
      else {const source=name==='Run'?results.runner.scene:path===manifest.runner?results.runner.scene:/\.fbx$/i.test(path)?await assetTimeout(fbxLoader.loadAsync(path),path):(await assetTimeout(loader.loadAsync(path),path)).scene;clip=source.animations.find(a=>a.tracks.length&&a.duration>0)?.clone();}
      if(!clip)throw new Error('Missing skeletal animation: '+name);
      clip.name=name;
      for(const track of clip.tracks){
        if(/Hips.position$/.test(track.name))for(let i=0;i<track.values.length;i+=3){
          // Game physics owns translation; keep only the running/rolling vertical pose.
          track.values[i]=0;track.values[i+2]=0;
          if(name==='Jump')track.values[i+1]=74.53;
        }
      }
      clips.push(clip);
    }
  }
  const textureLoader=new THREE.TextureLoader();
  const groundTextures=Object.fromEntries(await Promise.all(Object.entries(manifest.ground||{}).filter(([name])=>name.endsWith('_diff')).map(async([name,path])=>[name,await assetTimeout(textureLoader.loadAsync(path),path)])));
  const names=clips.map((a)=>a.name);
  if(!clips.length || !names.some((s)=>/run|sprint|jog/i.test(s))){
    throw new Error(`The character has no real running animation. Add a Quaternius Universal Animation Library GLB via --animations. Found: ${names.join(', ')||'none'}`);
  }
  byId('loadingBar').style.width='100%';
  const characters={classic:{scene:results.runner.scene,clips,yaw:manifest.runnerYaw??0}};
  return {manifest,models:results,sky:null,groundTextures,clips,danceNames:(manifest.finishDances||[]).map((_,i)=>`Finish Dance ${i+1}`),characters};
}

function getOrCreateEngine(onProgress=()=>{}){
  if(engine)return Promise.resolve(engine);
  enginePromise ||= loadSceneModels(onProgress).then(data=>{engine=new RunnerEngine(data);return engine;}).catch(error=>{enginePromise=null;throw error;});
  return enginePromise;
}

async function ensureCharacters(engine,ids){
  if(ids.every(id=>engine.characters[id]))return;
  const {characters,manifest,clips}=engine;
  if(!characters.street){
    const source=await loadCharacterSource('street');
    const skin={scene:cloneSkeleton(source),animations:source.animations};
    const skinScene=skin.scene;
    skinScene.traverse(o=>{if(o.name)o.name=o.name.replace(/^mixamorig\d+/,'mixamorig');});
    const run=skin.animations.find(a=>a.tracks.length&&a.duration>0)?.clone();
    if(!run)throw new Error('The new skin has no running animation.');
    run.name='Run';
    for(const track of run.tracks){
      track.name=track.name.replace(/^mixamorig\d+/,'mixamorig');
      if(/Hips\.position$/.test(track.name))for(let i=0;i<track.values.length;i+=3){track.values[i]=0;track.values[i+2]=0;}
    }
    const sourceHip=clips.find(c=>c.name==='Run')?.tracks.find(t=>/Hips\.position$/.test(t.name))?.values[1]??74.528839;
    const skinHip=run.tracks.find(t=>/Hips\.position$/.test(t.name))?.values[1]??sourceHip;
    const adapted=clips.filter(c=>c.name!=='Run').map(c=>{
      const copy=c.clone();
      for(const track of copy.tracks)if(/Hips\.position$/.test(track.name))for(let i=1;i<track.values.length;i+=3)track.values[i]+=skinHip-sourceHip;
      return copy;
    });
    characters.street={scene:skinScene,clips:[run,...adapted],yaw:manifest.skinYaw??manifest.runnerYaw??0};
  }
  if(ids.includes('urban')&&!characters.urban){
    const cityScene=cloneSkeleton(await loadCharacterSource('urban'));
    cityScene.traverse(o=>{if(o.name)o.name=o.name.replace(/^mixamorig\d+/,'mixamorig');});
    applyCityColorway(cityScene);
    characters.urban={scene:cityScene,clips:characters.street.clips,yaw:manifest.skinYaw??0};
  }
}

class RunnerEngine {
  constructor({manifest,models,sky,groundTextures,clips,danceNames,characters}){
    this.manifest=manifest;this.models=models;this.clips=clips;this.danceNames=danceNames;this.characters=characters;
    this.clock=new THREE.Clock();this.scene=new THREE.Scene();
    this.scene.background=sky||new THREE.Color('#b5c3d0');
    if(sky){this.scene.environment=sky;this.scene.backgroundBlurriness=.12;this.scene.environmentIntensity=.72;}
    this.scene.fog=new THREE.FogExp2(0xb0bdc7,.0075);
    this.camera=new THREE.PerspectiveCamera(61,innerWidth/innerHeight,.08,240);
    this.renderer=new THREE.WebGLRenderer({antialias:!matchMedia('(pointer: coarse)').matches,powerPreference:'high-performance',alpha:false});
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.2;
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.setSize(innerWidth,innerHeight);
    byId('viewport').appendChild(this.renderer.domElement);
    const ambient=new THREE.HemisphereLight(0xe5efff,0x52606c,1.65);this.scene.add(ambient);
    const sun=new THREE.DirectionalLight(0xffe8c6,2.55);
    sun.position.set(-17,40,-27);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
    sun.shadow.camera.left=-20;sun.shadow.camera.right=20;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-25;
    sun.shadow.camera.near=1;sun.shadow.camera.far=110;sun.shadow.bias=-.0005;
    sun.target.position.set(0,0,-20);this.scene.add(sun,sun.target);this.sun=sun;
    this.world=new THREE.Group();this.scene.add(this.world);
    this.trackGroup=new THREE.Group();this.world.add(this.trackGroup);
    this.cityGroup=new THREE.Group();this.world.add(this.cityGroup);
    this.obstacleGroup=new THREE.Group();this.world.add(this.obstacleGroup);
    this.coinGroup=new THREE.Group();this.world.add(this.coinGroup);this.coinMeshes=new Map();
    this.coinFlightGroup=new THREE.Group();this.world.add(this.coinFlightGroup);this.coinFlights=[];
    this.coinFlightTarget=new THREE.Vector3();
    this.powerupGroup=new THREE.Group();this.world.add(this.powerupGroup);this.powerupMeshes=new Map();
    this.trackTiles=new Map();this.cityTiles=new Map();this.obstacleMeshes=new Map();
    this.player=new THREE.Group();
    this.runnerVisual=new THREE.Group();
    this.player.add(this.runnerVisual);
    this.hoverboard=createHoverboard();this.hoverboard.visible=false;this.player.add(this.hoverboard);
    this.boardStyle='standard';
    this.world.add(this.player);
    this.runnerGround=0;
    this.setSkin('classic');
    this.state=null;this.isPlaying=false;this.paused=false;this.lastAnim=null;this.celebrating=false;this.finishTimer=0;
    this.trackTemplate=this.processModel(models.track.scene,manifest.trackScale||1,2.55,'width');
    this.trainTemplate=this.processModel(models.train.scene,manifest.trainScale||1,2.55,'width');
    this.barrierTemplate=this.processModel(models.barrier.scene,manifest.barrierScale||1,2.30,'width');
    this.overheadTemplate=createOverheadGate();
    const trainBounds=new THREE.Box3().setFromObject(this.trainTemplate).getSize(new THREE.Vector3());
    this.trainTemplate.scale.y=TRAIN_ROOF_HEIGHT/trainBounds.y;
    this.trainTemplate.scale.z=2*TRAIN_HIT_DISTANCE/trainBounds.z;
    const trainGroup=new THREE.Group();trainGroup.add(this.trainTemplate,createHazardMarkers('train'));this.trainTemplate=trainGroup;
    this.barrierTemplate.add(createHazardMarkers('barrier'));
    this.overheadTemplate.add(createHazardMarkers('overhead'));
    this.buildingTemplates=[];
    this.streetKit=createStreetKit();
    this.cityPropTemplates={
      hydrant:null,trash:null,seating:null
    };
    const bounds=new THREE.Box3().setFromObject(this.trackTemplate).getSize(new THREE.Vector3());
    this.coinTemplate=models.coin?this.processModel(models.coin.scene,1,.65,'height'):null;
    this.magnetTemplate=createMagnetProp();
    this.highJumpTemplate=createHighJumpProp();
    this.shieldTemplate=createShieldProp();
    this.mysteryTemplate=models.mystery?this.processModel(models.mystery.scene,1,.88,'height'):null;
    const shieldBubble=new THREE.Mesh(new THREE.SphereGeometry(1.17,24,16),new THREE.MeshPhysicalMaterial({color:0x86e5ff,transparent:true,opacity:.16,metalness:.25,roughness:.1,side:THREE.DoubleSide,depthWrite:false}));
    shieldBubble.position.y=.94;shieldBubble.visible=false;this.player.add(shieldBubble);this.shieldBubble=shieldBubble;
    if(this.coinTemplate){
      const studio=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(this.renderer);
      this.coinReflections=pmrem.fromScene(studio,.04);studio.dispose();pmrem.dispose();
      this.coinTemplate.traverse(o=>{if(!o.isMesh)return;
        const polish=source=>new THREE.MeshPhysicalMaterial({
          map:source.map,normalMap:source.normalMap,color:'#ffd04a',
          metalness:1,roughness:.075,clearcoat:1,clearcoatRoughness:.035,
          envMap:this.coinReflections.texture,envMapIntensity:2.2,
          emissive:'#f7ad22',emissiveIntensity:.08
        });
        o.material=Array.isArray(o.material)?o.material.map(polish):polish(o.material);
        o.castShadow=false;
      });
    }
    this.doubleCoinsTemplate=createDoubleCoinsProp(this.coinTemplate);
    const sparkleCanvas=document.createElement('canvas');sparkleCanvas.width=sparkleCanvas.height=64;
    const ctx=sparkleCanvas.getContext('2d'),glow=ctx.createRadialGradient(32,32,0,32,32,30);
    glow.addColorStop(0,'rgba(255,255,245,1)');glow.addColorStop(.12,'rgba(255,245,190,.9)');glow.addColorStop(.45,'rgba(255,213,99,.2)');glow.addColorStop(1,'rgba(255,213,99,0)');
    ctx.fillStyle=glow;ctx.fillRect(0,0,64,64);ctx.fillStyle='#fff9d9';ctx.beginPath();ctx.moveTo(32,2);ctx.lineTo(35,28);ctx.lineTo(58,32);ctx.lineTo(35,35);ctx.lineTo(32,62);ctx.lineTo(29,35);ctx.lineTo(6,32);ctx.lineTo(29,28);ctx.closePath();ctx.fill();
    this.coinSparkleTexture=new THREE.CanvasTexture(sparkleCanvas);
    this.trackSpacing=bounds.z;
    this.runnerGround=new THREE.Box3().setFromObject(this.trackTemplate,true).max.y;
    this.groundMaterials=createGroundMaterials(groundTextures);
    this.groundTemplate=createGroundTile(this.trackSpacing,this.groundMaterials);
    this.cityGroundTemplate=createCityGround(this.groundMaterials);
    this.routePropTemplates={
      stationBench:null,stationLamp:null,tunnelPipes:null,concreteBarrier:null
    };
    this.sectionTemplates={station:createSectionStructure('station',this.groundMaterials),tunnel:createSectionStructure('tunnel',this.groundMaterials)};
    this.finishLine=createFinishLine();this.world.add(this.finishLine);
    this.installInputs();
    this.setQuality(qualityIndex);
    window.addEventListener('resize',()=>this.resize());
    this.animate=()=>{requestAnimationFrame(this.animate);const delta=this.clock.getDelta();if(document.hidden||(!this.isPlaying&&!this.celebrating&&!this.podium)||this.paused)return;this.tick(delta);this.renderer.render(this.scene,this.camera);};
    this.animate();
  }
  loadFinishDancesLater(){
    if(this.dancesLoading)return;
    this.dancesLoading=true;
    const paths=this.manifest.finishDances||[];
    let cursor=0;
    const loadNext=async()=>{
      while(cursor<paths.length){
        const index=cursor++,path=paths[index];
        try{
          let clip;
          if(/\.json$/i.test(path)){
            const response=await fetch(path);
            if(!response.ok)throw new Error(`Missing finish dance: ${path}`);
            clip=THREE.AnimationClip.parse(await response.json());
          }else{
            const source=/\.fbx$/i.test(path)?await fbxLoader.loadAsync(path):await loader.loadAsync(path);
            clip=source.animations.find(a=>a.tracks.length&&a.duration>0)?.clone();
          }
          if(!clip)throw new Error(`Missing animation in finish dance: ${path}`);
          clip.name=this.danceNames[index];
          for(const track of clip.tracks)if(/Hips\.position$/.test(track.name))for(let i=0;i<track.values.length;i+=3){track.values[i]=0;track.values[i+2]=0;}
          this.clips.push(clip);
          if(this.characters.street){
            const adapted=clip.clone();
            const sourceHip=this.clips.find(c=>c.name==='Run')?.tracks.find(t=>/Hips\.position$/.test(t.name))?.values[1]??74.528839;
            const skinHip=this.characters.street.clips.find(c=>c.name==='Run')?.tracks.find(t=>/Hips\.position$/.test(t.name))?.values[1]??sourceHip;
            for(const track of adapted.tracks)if(/Hips\.position$/.test(track.name))for(let i=1;i<track.values.length;i+=3)track.values[i]+=skinHip-sourceHip;
            this.characters.street.clips.push(adapted);
          }
          const current=this.characters[this.currentSkinId]?.clips.find(c=>c.name===clip.name);
          if(current)this.actions.set(clip.name,this.mixer.clipAction(current));
          for(const remote of this.network?.remotes.values()||[]){
            if(remote.requestedDance!==clip.name)continue;
            const remoteClip=this.characters[remote.skinId]?.clips.find(c=>c.name===clip.name);
            if(remoteClip)remote.dance=remote.mixer.clipAction(remoteClip);
          }
        }catch(error){console.warn('Finish dance unavailable:',error);}
      }
    };
    setTimeout(()=>{void Promise.all([loadNext(),loadNext()]);},400);
  }
  loadSceneryLater(){
    if(this.sceneryLoading)return;
    this.sceneryLoading=true;
    const dimensions={hydrant:[.9,'height'],trash:[1.1,'height'],seating:[.9,'height'],stationBench:[2.05,'width'],stationLamp:[.73,'height'],tunnelPipes:[2.6,'width'],concreteBarrier:[1.05,'height']};
    const textureLoader=new THREE.TextureLoader();
    const jobs=[];
    if(this.manifest.sky)jobs.push(async()=>{
      const sky=await new RGBELoader().loadAsync(this.manifest.sky);
      sky.mapping=THREE.EquirectangularReflectionMapping;
      this.scene.background=sky;this.scene.environment=sky;
      this.scene.backgroundBlurriness=.12;this.scene.environmentIntensity=.72;
    });
    for(const [name,path] of Object.entries(this.manifest.ground||{}))if(!name.endsWith('_diff'))jobs.push(async()=>{
      addGroundDetailMap(this.groundMaterials,name,await textureLoader.loadAsync(path));
    });
    for(const [key,path] of [['building',this.manifest.building],...Object.entries(this.manifest.cityProps||{}),...Object.entries(this.manifest.routeProps||{})])jobs.push(async()=>{
      const model=await loader.loadAsync(path);
      if(key==='building')this.buildingTemplates=createUrbanBuildingTemplates(model.scene);
      else{
        const [size,axis]=dimensions[key];
        const target=Object.hasOwn(this.cityPropTemplates,key)?this.cityPropTemplates:this.routePropTemplates;
        target[key]=this.processModel(model.scene,1,size,axis);
      }
      clearTimeout(this.sceneryRefreshTimer);
      this.sceneryRefreshTimer=setTimeout(()=>{
        if(!this.state)return;
        for(const tile of this.cityTiles.values())this.cityGroup.remove(tile);
        this.cityTiles.clear();this.worldUpdateAt=-Infinity;this.updateWorld();
      },300);
    });
    setTimeout(async()=>{
      let cursor=0;
      await Promise.all(Array.from({length:2},async()=>{
        while(cursor<jobs.length){
          const job=jobs[cursor++];
          try{await job();}catch(error){console.warn('Street detail unavailable:',error);}
        }
      }));
    },1800);
  }
  async setBoardStyle(style){
    const next=style==='pulse-board'?'pulse-board':'standard';
    if(next===this.boardStyle)return;
    const board=await createBoardStyle(next);
    board.visible=this.hoverboard.visible;
    this.player.remove(this.hoverboard);
    this.hoverboard=board;this.player.add(board);this.boardStyle=next;
  }
  startNetwork(room,id,send){
    const me=room.players.find(p=>p.id===id);
    this.start(room.seed,me.skin);this.mixer.update(0);this.network={id,send,room,remotes:new Map()};
    this.player.position.x=LANES[me.lane]+(me.slot===0?-.32:me.slot===3?.32:0);
    for(const p of room.players){
      if(p.id===id)continue;
      const skinId=this.characters[p.skin]?p.skin:'classic',asset=this.characters[skinId];
      const root=new THREE.Group(),visual=new THREE.Group(),rig=cloneSkeleton(asset.scene);
      const board=cloneLoadedBoardStyle(p.boardStyle);root.add(board);root.add(visual);visual.add(rig);normalizeRunner(rig,visual,skinId==='classic'?this.manifest.runnerScale??1:this.manifest.skinScale??1);visual.rotation.y=asset.yaw;
      rig.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.castShadow=true;const copyMaterial=m=>{const copy=m.clone();copy.onBeforeCompile=m.onBeforeCompile;copy.customProgramCacheKey=m.customProgramCacheKey;return copy;};o.material=Array.isArray(o.material)?o.material.map(copyMaterial):copyMaterial(o.material);for(const m of Array.isArray(o.material)?o.material:[o.material]){m.color.lerp(new THREE.Color(PLAYER_COLORS[p.slot]),.35);}}});
      const action=name=>{const clip=asset.clips.find(c=>c.name===name);return clip?mixer.clipAction(clip):null;};
      const mixer=new THREE.AnimationMixer(rig),run=action('Run'),glide=mixer.clipAction(createGlideClip(rig,visual.scale.x));run.play();mixer.update(0);
      const jump=action('Jump'),slide=action('Roll');
      const danceName=shopItem(p.danceStyle)?.clip||this.danceNames[danceIndexForRunner(p.id,this.danceNames.length)];
      const dance=danceName?action(danceName):null;
      const label=document.createElement('div');label.className='runner-label';label.textContent=p.name;label.style.color=PLAYER_COLORS[p.slot];byId('app').appendChild(label);
      root.position.set(LANES[p.lane],this.runnerGround,p.z);this.world.add(root);
      this.network.remotes.set(p.id,{root,visual,board,mixer,run,glide,jump,slide,dance,label,mode:'run',skinId,requestedDance:danceName});
    }
  }
  receiveRoom(room){
    this.network.room=room;const p=room.players.find(p=>p.id===this.network.id);if(!p)return;
    const oldPickups=new Set(this.state.collectedPowerups||[]);
    for(const id of p.collectedPowerups||[])if(!oldPickups.has(id))this.showPowerupToast(this.powerupLabel(this.powerups.find(item=>item.id===id)?.reward));
    if(p.finish!==null&&this.state.finish===null)this.beginFinishDance(this.network.id);
    if(p.platform==null&&p.airborneHeight>.05&&this.state.airborneHeight<=.05)this.playAnimation(this.animNames.jump,true);
    if(p.recovery>this.state.recovery+.1){byId('toast').textContent='COLLISION · SPEED LOST';byId('toast').classList.remove('hidden');setTimeout(()=>byId('toast').classList.add('hidden'),1100);}
    else if(p.shieldCharges<this.state.shieldCharges)this.showPowerupToast('SHIELD SAVED YOU');
    this.state={...p};this.targetX=LANES[p.lane]+(p.slot===0?-.32:p.slot===3?.32:0);this.slideRemaining=p.slide;
    if(!this.celebrating&&p.airborneHeight===0)this.playAnimation(p.slide>0?this.animNames.slide:p.hoverboardTime>0?this.animNames.glide:this.animNames.run,p.slide>0);
  }
  updateNetwork(delta){
    const net=this.network;
    for(const p of net.room.players){const remote=net.remotes.get(p.id);if(!remote)continue;
      remote.root.visible=p.connected&&Math.abs(p.z-this.state.z)<120;
      remote.root.position.x=THREE.MathUtils.damp(remote.root.position.x,LANES[p.lane]+(p.slot===0?-.32:p.slot===3?.32:0),12,delta);
      remote.root.position.y=THREE.MathUtils.damp(remote.root.position.y,this.runnerGround+p.airborneHeight,20,delta);
      remote.root.position.z=THREE.MathUtils.damp(remote.root.position.z,p.z,20,delta);
      const mode=p.finish!==null&&remote.dance?'dance':p.platform==null&&p.airborneHeight>.05&&remote.jump?'jump':p.slide>0&&remote.slide?'slide':p.hoverboardTime>0?'glide':'run';
      if(mode!==remote.mode){const prev=remote[remote.mode],next=remote[mode];next.reset().setLoop(['run','glide'].includes(mode)?THREE.LoopRepeat:THREE.LoopOnce);next.clampWhenFinished=!['run','glide'].includes(mode);if(mode==='run'&&remote.mode==='slide')next.time=Math.min(.2,next.getClip().duration*.3);next.crossFadeFrom(prev,.12,false).play();remote.mode=mode;}
      updateHoverboard(remote.board,remote.visual,{active:p.hoverboardTime>0,rolling:mode==='slide',finished:p.finish!==null,time:p.z/-14,lateral:LANES[p.lane]-remote.root.position.x});
      applyCollisionBump(remote.visual,p.recovery);
      remote.run.setEffectiveTimeScale(collisionRunRate(p.recovery));
      if(remote.root.visible&&(net.room.phase==='racing'||net.room.phase==='results'))remote.mixer.update(delta);
      const pos=remote.root.position.clone();pos.y+=2.2;pos.project(this.camera);
      remote.label.style.display=remote.root.visible&&pos.z<1&&Math.abs(pos.x)<1&&Math.abs(pos.y)<1?'block':'none';
      remote.label.style.left=(pos.x*.5+.5)*innerWidth+'px';remote.label.style.top=(-pos.y*.5+.5)*innerHeight+'px';
    }
  }
  stopNetwork(){
    stopVictory();
    this.clearPodium();
    this.celebrating=false;this.finishCallback=null;byId('finishCelebration').classList.add('hidden');
    if(this.network){for(const r of this.network.remotes.values()){this.world.remove(r.root);r.label.remove();r.mixer.stopAllAction();r.root.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});}this.network=null;}
    this.isPlaying=false;
  }
  findClip(candidates){for(const match of candidates){const name=[...this.actions.keys()].find(n=>new RegExp(`(^|[ _.-])${match}([ _.-]|$)`,'i').test(n))||[...this.actions.keys()].find(n=>n.toLowerCase().includes(match));if(name)return name;}return null;}
  setSkin(id){
    const chosen=this.characters[id]?id:'classic';
    if(this.currentSkinId===chosen)return;
    this.mixer?.stopAllAction();
    if(this.runnerRig)this.runnerVisual.remove(this.runnerRig);
    const asset=this.characters[chosen];
    this.runnerRig=cloneSkeleton(asset.scene);
    this.runnerVisual.add(this.runnerRig);
    this.playerModelScale=normalizeRunner(this.runnerRig,this.runnerVisual,chosen==='classic'?this.manifest.runnerScale??1:this.manifest.skinScale??1);
    this.runnerVisual.rotation.y=asset.yaw;
    this.runnerRig.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
    this.mixer=new THREE.AnimationMixer(this.runnerRig);
    this.actions=new Map();
    for(const clip of asset.clips)if(!this.actions.has(clip.name))this.actions.set(clip.name,this.mixer.clipAction(clip));
    const glideClip=createGlideClip(this.runnerRig,this.playerModelScale);this.actions.set(glideClip.name,this.mixer.clipAction(glideClip));
    this.animNames={glide:glideClip.name,run:this.findClip(['run','sprint','jog']),jump:this.findClip(['jump']),slide:this.findClip(['slide','crouch','roll']),hit:this.findClip(['hit','stumble'])};
    if(!this.animNames.run)throw new Error('Selected character has no running animation.');
    this.currentSkinId=chosen;this.lastAnim=null;
  }
  processModel(scene,extraScale,target,by){
    const root=new THREE.Group();const model=scene.clone(true);root.add(model);
    model.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(model,true),size=box.getSize(new THREE.Vector3());
    const divider=by==='height'?size.y:size.x;
    if(divider<=.0001)throw new Error('An imported 3D model has invalid dimensions. Check selected glTF/GLB files.');
    const scale=target/divider*extraScale;model.scale.multiplyScalar(scale);
    model.position.x-=(box.min.x+size.x/2)*scale;
    model.position.y-=box.min.y*scale;
    model.position.z-=(box.min.z+size.z/2)*scale;
    root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    return root;
  }
  setQuality(index){
    this.lowPower=index===2||(index===0&&(matchMedia('(pointer: coarse)').matches||innerWidth<700));
    this.viewDistance=this.lowPower?72:115;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.lowPower?1:index===1?2:1.5));
    this.renderer.shadowMap.enabled=!this.lowPower;
    this.scene.fog.density=this.lowPower?.014:.0075;
    this.worldUpdateAt=-Infinity;
    this.resize();
  }
  resize(){this.camera.aspect=innerWidth/innerHeight;this.camera.fov=innerWidth<700?76:61;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);}
  playAnimation(name,once=false){
    if(!name || this.lastAnim===name)return;
    const prev=this.lastAnim?this.actions.get(this.lastAnim):null;
    const next=this.actions.get(name);if(!next)return;
    next.reset();next.paused=false;next.enabled=true;next.setEffectiveWeight(1);next.setEffectiveTimeScale(1);
    if(name===this.animNames.run&&this.lastAnim===this.animNames.slide)next.time=Math.min(.2,next.getClip().duration*.3);
    next.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat);next.clampWhenFinished=once;
    if(prev && prev!==next){
      const isRollRecovery=name===this.animNames.run&&this.lastAnim===this.animNames.slide;
      next.crossFadeFrom(prev,isRollRecovery ? 0.12 : 0.2,false);
    }
    next.play();this.lastAnim=name;
  }
  start(seed=21032026,skinId='classic'){
    stopVictory();
    this.clearPodium();
    this.celebrating=false;this.finishTimer=0;this.finishCallback=null;
    byId('finishCelebration').classList.add('hidden');
    this.setSkin(skinId);
    this.soloDanceIdentity=Math.random().toString(36);
    this.state={lane:1,z:0,distance:0,speed:DEFAULT_SPEED,recovery:0,airborneHeight:0,verticalSpeed:0,platform:null,hoverboardTime:0,magnetTime:0,highJumpTime:0,doubleCoinsTime:0,shieldCharges:0,bonusCoins:0};
    this.dailyDistanceReported=0;this.dailyRunCompletions=[];this.runCollisionCount=0;this.creditedBonusCoins=0;
    this.state.jumpBuffer=0;this.slideRemaining=0;this.hitCooldown=0;this.targetX=LANES[1];
    this.pattern=createObstacles(seed,95);
    this.powerups=createPowerups(this.pattern,seed);this.collectedPowerups=[];
    this.coins=createCoins(this.pattern,MAX_DISTANCE,this.powerups);this.collectedCoins=[];
    this.seenCoinIds=new Set();this.coinVisibilityAt=-Infinity;
    this.powerupGroup.clear();this.powerupMeshes.clear();
    for(const mesh of this.coinMeshes.values())mesh.userData.sparkle?.material.dispose();
    this.coinGroup.clear();this.coinMeshes.clear();
    for(const flight of this.coinFlights)flight.mesh.userData.sparkle?.material.dispose();
    this.coinFlightGroup.clear();this.coinFlights=[];
    for(const mesh of this.obstacleMeshes.values())this.obstacleGroup.remove(mesh);
    this.obstacleMeshes.clear();
    for(const t of this.trackTiles.values())this.trackGroup.remove(t);
    this.trackTiles.clear();
    for(const t of this.cityTiles.values())this.cityGroup.remove(t);
    this.cityTiles.clear();
    this.player.position.set(0,this.runnerGround,0);
    this.camera.position.set(0,3.15,8.3);this.camera.lookAt(0,1.2,-8);
    this.playAnimation(this.animNames.run);
    this.isPlaying=true;this.paused=false;
    this.worldUpdateAt=-Infinity;this.hudElapsed=0;this.clock.getDelta();this.updateWorld();this.updateHud();
    this.loadFinishDancesLater();
    this.loadSceneryLater();
  }
  installInputs(){
    window.addEventListener('keydown',(event)=>{
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code))event.preventDefault();
      if(event.repeat)return;
      if(event.code==='Escape'){if(this.isPlaying)this.pause(!this.paused);return;}
      if(!this.isPlaying||this.paused)return;
      if(['ArrowLeft','KeyA'].includes(event.code))this.switchLane(-1);
      if(['ArrowRight','KeyD'].includes(event.code))this.switchLane(1);
      if(['Space','ArrowUp','KeyW'].includes(event.code))this.jump();
      if(['ArrowDown','KeyS'].includes(event.code))this.slide();
    });
    let gesture=null;
    const canvas=this.renderer.domElement;
    const consume=e=>{
      if(!gesture||gesture.id!==e.pointerId||gesture.done||!this.isPlaying||this.paused)return;
      const action=swipeAction(e.clientX-gesture.x,e.clientY-gesture.y,innerWidth);
      if(!action)return;gesture.done=true;
      if(action==='left'||action==='right')this.switchLane(action==='left'?-1:1);
      else if(action==='jump')this.jump();else this.slide();
    };
    canvas.addEventListener('pointerdown',e=>{if(!e.isPrimary||!this.isPlaying||this.paused)return;gesture={id:e.pointerId,x:e.clientX,y:e.clientY,done:false};canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',consume);
    canvas.addEventListener('pointerup',e=>{consume(e);if(gesture?.id===e.pointerId)gesture=null;});
    for(const name of ['pointercancel','lostpointercapture'])canvas.addEventListener(name,()=>gesture=null);
  }
  switchLane(direction){if(this.network){this.network.send(direction<0?'left':'right');return;}this.state.lane=nextLane(this.state.lane,direction);this.targetX=LANES[this.state.lane];}
  jump(){if(this.network){this.network.send('jump');return;}if(requestJump(this.state,jumpSpeed(this.state))){this.slideRemaining=0;if(this.animNames.jump)this.playAnimation(this.animNames.jump,true);}}
  slide(){if(this.network){this.network.send('slide');return;}if(this.state.airborneHeight>.05||this.slideRemaining>0)return;this.slideRemaining=ROLL_DURATION;if(this.animNames.slide)this.playAnimation(this.animNames.slide,true);}
  pause(value){if(this.network)return;this.paused=value;showPanel(value?'pauseScreen':null);this.clock.getDelta();}
  clearPodium(){
    if(!this.podium)return;
    for(const mixer of this.podium.mixers)mixer.stopAllAction();
    this.scene.remove(this.podium.group);this.podium=null;this.world.visible=true;
  }
  startPodium(players,onDone){
    this.clearPodium();this.isPlaying=false;
    this.podium=createPodium(players,this.characters,this.manifest,this.danceNames);
    this.podium.time=4;this.podium.onDone=onDone;
    this.scene.add(this.podium.group);this.world.visible=false;
    this.camera.position.set(.65,3.75,6.3);this.camera.lookAt(.65,1,-3.8);
  }
  beginFinishDance(identity,onDone=null){
    updateHoverboard(this.hoverboard,this.runnerVisual,{finished:true});
    playVictory();
    const style=this.network?this.network.room.players.find(p=>p.id===identity)?.danceStyle:daily.snapshot().equipped.dance;
    const name=shopItem(style)?.clip||this.danceNames[danceIndexForRunner(identity,this.danceNames.length)];
    if(!name){onDone?.();return;}
    this.playAnimation(name,true);
    this.finishTimer=danceDuration(this.actions.get(name)?.getClip());
    this.finishCallback=onDone;
    this.celebrating=true;
    byId('finishCelebration').classList.remove('hidden');
  }
  finish(){
    this.isPlaying=false;
    const meters=Math.floor(this.state.distance);
    this.recordDaily({meters:Math.max(0,meters-this.dailyDistanceReported),cleanFinish:this.runCollisionCount===0});
    this.dailyDistanceReported=meters;
    const rewards=this.dailyRunCompletions.reduce((sum,item)=>sum+item.reward,0);
    byId('dailyRunResult').textContent=rewards?`${this.dailyRunCompletions.length} DAILY ${this.dailyRunCompletions.length===1?'GOAL':'GOALS'} COMPLETE · +${rewards} BONUS COINS`:'DAILY CHALLENGES · KEEP RUNNING FOR BONUS COINS';
    const best=Number(localStorage.getItem(BEST_STORAGE_KEY)||0);
    if(meters>best)localStorage.setItem(BEST_STORAGE_KEY,String(meters));
    byId('resultDistance').textContent=meters.toLocaleString();
    byId('resultBest').textContent=meters>best?'NEW PERSONAL BEST':'KEEP PUSHING YOUR LIMITS';
    this.beginFinishDance(this.soloDanceIdentity,()=>this.startPodium([{id:this.soloDanceIdentity,skin:this.currentSkinId,danceStyle:daily.snapshot().equipped.dance}],()=>{setHud(false);showPanel('gameover');}));
  }
  updateWorld(){
    if(Math.abs(this.state.distance-this.worldUpdateAt)<1)return;
    this.worldUpdateAt=this.state.distance;
    const index=Math.floor(this.state.distance/this.trackSpacing);
    const needed=new Set();
    for(let i=Math.max(0,index-5);i<=index+Math.ceil(this.viewDistance/this.trackSpacing);i++){
      needed.add(i);
      if(!this.trackTiles.has(i)){
        const group=new THREE.Group();
        group.add(this.groundTemplate.clone(true));
        for(const x of LANES){const segment=this.trackTemplate.clone(true);segment.position.x=x;group.add(segment);}
        group.position.z=-i*this.trackSpacing;
        this.trackGroup.add(group);this.trackTiles.set(i,group);
      }
    }
    for(const [i,obj] of this.trackTiles)if(!needed.has(i)){this.trackGroup.remove(obj);this.trackTiles.delete(i);}
    const cityIndex=Math.floor(this.state.distance/16);
    const cityNeeded=new Set();
    for(let i=Math.max(0,cityIndex-(this.lowPower?1:3));i<=cityIndex+(this.lowPower?5:9);i++){
      cityNeeded.add(i);
      if(!this.cityTiles.has(i)){
        const group=new THREE.Group();
        group.add(this.cityGroundTemplate.clone(true));
        const section=routeSection(i*16+12);
        if(this.sectionTemplates[section])group.add(this.sectionTemplates[section].clone(true));
        for(const side of [-1,1]){
          if(section==='station'){
            if(i%2===0){
              if(this.routePropTemplates.stationBench){const bench=this.routePropTemplates.stationBench.clone(true);bench.position.set(side*8.25,.41,1.5);bench.rotation.y=side===1?Math.PI:0;group.add(bench);}
              if(this.routePropTemplates.stationLamp){const lamp=this.routePropTemplates.stationLamp.clone(true);lamp.position.set(side*9.25,2.7,-3);lamp.rotation.y=side===1?Math.PI:0;group.add(lamp);}
            }
            if(this.routePropTemplates.concreteBarrier){const barrier=this.routePropTemplates.concreteBarrier.clone(true);barrier.position.set(side*9.7,.37,-5.4);barrier.rotation.y=Math.PI/2;group.add(barrier);}
            continue;
          }
          if(section==='tunnel'){
            if(i%2===0){
              if(this.routePropTemplates.tunnelPipes){const pipes=this.routePropTemplates.tunnelPipes.clone(true);pipes.position.set(side*6.05,3.8,1.4);pipes.rotation.y=side===1?Math.PI:0;group.add(pipes);}
              if(this.routePropTemplates.stationLamp){const lamp=this.routePropTemplates.stationLamp.clone(true);lamp.position.set(side*6.1,4.6,-3.5);lamp.rotation.y=side===1?Math.PI:0;group.add(lamp);}
            }
            continue;
          }
          if(this.buildingTemplates.length){
            const building=this.buildingTemplates[(i+(side===1?1:0))%this.buildingTemplates.length].clone(true);
            building.position.set(side*(12.5+(i%3)*1.3),0,(i%3-1)*1.25);
            building.rotation.y=side===1?-Math.PI/2:Math.PI/2;
            group.add(building);
          }
          const kit=this.streetKit.clone(true);kit.position.set(side*7.5,0,0);kit.rotation.y=side===1?0:Math.PI;group.add(kit);
          const propName=i%3===0?'hydrant':i%3===1?'seating':'trash';
          const template=this.cityPropTemplates[propName];
          if(template){
            const prop=template.clone(true);
            prop.position.set(side*(propName==='seating'?9.1:8.45),0,side===1?3.1:-3.1);
            prop.rotation.y=side===1?Math.PI:0;
            group.add(prop);
          }
          if(section==='downtown'&&i%3===0){
            if(this.routePropTemplates.concreteBarrier){const barrier=this.routePropTemplates.concreteBarrier.clone(true);barrier.position.set(side*9.6,.14,4.5);barrier.rotation.y=Math.PI/2;group.add(barrier);}
          }
        }
        group.position.z=-i*16-12;this.cityGroup.add(group);this.cityTiles.set(i,group);
      }
    }
    for(const [i,obj] of this.cityTiles)if(!cityNeeded.has(i)){this.cityGroup.remove(obj);this.cityTiles.delete(i);}
    for(const obstacle of this.pattern){
      if(obstacle.distance<this.state.distance-TRAIN_HIT_DISTANCE-1){if(this.obstacleMeshes.has(obstacle.id)){this.obstacleGroup.remove(this.obstacleMeshes.get(obstacle.id));this.obstacleMeshes.delete(obstacle.id);}continue;}
      if(obstacle.distance>this.state.distance+this.viewDistance)break;
      if(!this.obstacleMeshes.has(obstacle.id)){
        const template=obstacle.type==='train'?this.trainTemplate:obstacle.type==='overhead'?this.overheadTemplate:this.barrierTemplate;
        const mesh=template.clone(true);
        mesh.position.set(LANES[obstacle.lane],0,obstacle.z);
        this.obstacleGroup.add(mesh);this.obstacleMeshes.set(obstacle.id,mesh);
      }
    }
  }
  updateCoins(delta){
    if(!this.coinTemplate)return;
    if(this.network)this.collectedCoins=this.state.collectedCoins||[];
    else{
      const gained=collectCoins(this.state,this.coins,this.collectedCoins);
      if(this.state.doubleCoinsTime>0)this.state.bonusCoins+=gained.length;
    }
    const gained=[];
    for(const id of this.collectedCoins)if(!this.seenCoinIds.has(id)){this.seenCoinIds.add(id);gained.push(id);}
    if(gained.length)playCoin();
    if(gained.length)this.recordDaily({coins:gained.length});
    const bonus=Math.max(0,(this.state.bonusCoins||0)-this.creditedBonusCoins);
    const payout=gained.length+bonus;
    if(payout){daily.creditCoins(payout);shop.renderWallet();}
    this.creditedBonusCoins=Math.max(this.creditedBonusCoins,this.state.bonusCoins||0);
    for(const id of gained){
      const coin=this.coins[id];
      if(!coin)continue;
      let mesh=this.coinMeshes.get(id);
      if(mesh){this.coinGroup.remove(mesh);this.coinMeshes.delete(id);}
      if(this.state.magnetTime<=0){mesh?.userData.sparkle?.material.dispose();continue;}
      if(!mesh)mesh=this.coinTemplate.clone(true);
      mesh.position.set(LANES[coin.lane],this.runnerGround+.7,coin.z);
      this.coinFlightGroup.add(mesh);
      this.coinFlights.push({mesh,age:0,duration:.32+Math.random()*.16,origin:mesh.position.clone()});
    }
    // The visible set changes with distance, not with every rendered frame.
    if(Math.abs(this.state.distance-this.coinVisibilityAt)>=.75){
      this.coinVisibilityAt=this.state.distance;
      const near=this.state.distance-5,far=this.state.distance+this.viewDistance*.8;
      for(const [id,mesh] of this.coinMeshes)if(this.coins[id].distance<=near||this.coins[id].distance>=far||this.seenCoinIds.has(id)){
        this.coinGroup.remove(mesh);mesh.userData.sparkle?.material.dispose();this.coinMeshes.delete(id);
      }
      for(const coin of this.coins){
        if(coin.distance<=near)continue;
        if(coin.distance>=far)break;
        if(this.seenCoinIds.has(coin.id)||this.coinMeshes.has(coin.id))continue;
        const mesh=this.coinTemplate.clone(true);mesh.position.set(LANES[coin.lane],this.runnerGround+.7,coin.z);
        const sparkle=new THREE.Sprite(new THREE.SpriteMaterial({map:this.coinSparkleTexture,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
        sparkle.position.set(.14,.48,.08);sparkle.scale.set(.42,.42,.42);mesh.add(sparkle);
        mesh.userData.sparkle=sparkle;mesh.userData.glint=collectibleGlint(coin.distance,this.pattern);
        this.coinGroup.add(mesh);this.coinMeshes.set(coin.id,mesh);
      }
    }
    const now=performance.now();
    for(const [id,mesh] of this.coinMeshes){
      mesh.rotation.y+=delta*2;
      mesh.position.y=this.runnerGround+.7+Math.sin(now*.002+id*.4)*.06;
      mesh.userData.sparkle.material.opacity=mesh.userData.glint*Math.pow(Math.max(0,Math.sin(now*.005+id*1.7)),10);
    }
    const coinText=String(this.collectedCoins.length+(this.state.bonusCoins||0));if(byId('coinCount').textContent!==coinText)byId('coinCount').textContent=coinText;
    for(let i=this.coinFlights.length-1;i>=0;i--){
      const flight=this.coinFlights[i];flight.age+=delta;
      const t=Math.min(1,flight.age/flight.duration),ease=t*t*(3-2*t);
      this.coinFlightTarget.set(this.player.position.x,this.player.position.y+1.1,this.player.position.z);
      flight.mesh.position.copy(flight.origin).lerp(this.coinFlightTarget,ease);
      flight.mesh.position.y+=Math.sin(t*Math.PI)*.5;
      flight.mesh.rotation.y+=delta*14;
      flight.mesh.scale.setScalar(Math.max(.12,1-t*.85));
      if(t>=1){this.coinFlightGroup.remove(flight.mesh);flight.mesh.userData.sparkle?.material.dispose();this.coinFlights.splice(i,1);}
    }
  }
  showPowerupToast(text){
    const toast=byId('toast');toast.textContent=text;toast.classList.remove('hidden');
    clearTimeout(this.powerupToastTimer);this.powerupToastTimer=setTimeout(()=>toast.classList.add('hidden'),1600);
  }
  recordDaily(event){
    if(this.network)return;
    const completed=daily.record(event);
    if(!completed.length)return;
    this.dailyRunCompletions.push(...completed);
    renderDaily();
    this.showPowerupToast(`DAILY GOAL COMPLETE · +${completed.reduce((sum,item)=>sum+item.reward,0)} COINS`);
  }
  powerupLabel(reward){return {hoverboard:'HOVERBOARD · SPEED +35%',magnet:'MAGNET ACTIVE',highJump:'HIGH JUMP ACTIVE',doubleCoins:'DOUBLE COINS ACTIVE',shield:'SHIELD READY',coins:'MYSTERY BOX · +10 COINS'}[reward]||'POWER-UP';}
  updatePowerups(delta){
    if(!this.network){
      tickPowerups(this.state,delta);
      for(const reward of collectPowerups(this.state,this.powerups,this.collectedPowerups))this.showPowerupToast(this.powerupLabel(reward));
    }else this.collectedPowerups=this.state.collectedPowerups||[];
    for(const item of this.powerups){
      const visible=item.distance>this.state.distance-5&&item.distance<this.state.distance+this.viewDistance*.8&&!this.collectedPowerups.includes(item.id);
      let mesh=this.powerupMeshes.get(item.id);
      if(visible&&!mesh){
        mesh=({hoverboard:this.hoverboard,magnet:this.magnetTemplate,highJump:this.highJumpTemplate,doubleCoins:this.doubleCoinsTemplate,shield:this.shieldTemplate,mystery:this.mysteryTemplate}[item.type])?.clone(true);
        if(!mesh)continue;
        mesh.visible=true;
        mesh.position.set(LANES[item.lane],this.runnerGround+1.45,item.z);
        this.powerupGroup.add(mesh);this.powerupMeshes.set(item.id,mesh);
      }
      if(!visible&&mesh){this.powerupGroup.remove(mesh);this.powerupMeshes.delete(item.id);}
      if(visible&&mesh){mesh.rotation.y+=delta*.9;mesh.position.y=this.runnerGround+1.45+Math.sin(performance.now()*.003+item.id)*.06;}
    }
    const active=[];
    if(this.state.hoverboardTime>0)active.push(`HOVERBOARD +35% ${Math.ceil(this.state.hoverboardTime)}s`);
    if(this.state.magnetTime>0)active.push(`MAGNET ${Math.ceil(this.state.magnetTime)}s`);
    if(this.state.highJumpTime>0)active.push(`HIGH JUMP ${Math.ceil(this.state.highJumpTime)}s`);
    if(this.state.doubleCoinsTime>0)active.push(`DOUBLE COINS ${Math.ceil(this.state.doubleCoinsTime)}s`);
    if(this.state.shieldCharges>0)active.push('SHIELD READY');
    const badge=byId('magnetStatus');badge.classList.toggle('hidden',!active.length);badge.textContent=active.join(' · ');
    this.shieldBubble.visible=this.state.shieldCharges>0;
  }
  updateHud(){const dist=Math.floor(this.state.distance);byId('distance').textContent=String(dist).padStart(4,'0');byId('best').textContent=String(Math.max(dist,Number(localStorage.getItem(BEST_STORAGE_KEY)||0))).padStart(4,'0');byId('progressBar').style.width=`${Math.min(100,dist/MAX_DISTANCE*100)}%`;}
  updateHazardHint(){
    const next=this.pattern.find(o=>!o.hit&&o.lane===this.state.lane&&o.distance-this.state.distance>8&&o.distance-this.state.distance<36);
    const hint=byId('hazardHint');hint.classList.toggle('hidden',!next);
    if(next)hint.textContent=next.type==='overhead'?'ROLL UNDER · S / ↓':next.type==='barrier'?'JUMP OVER · SPACE / ↑':'RAMP AHEAD · RUN ONTO ROOF';
  }
  tick(rawDelta){
    if(this.podium){
      const delta=Math.min(rawDelta,.05);
      for(const mixer of this.podium.mixers)mixer.update(delta);
      this.podium.time-=delta;
      if(this.podium.time<=0){const done=this.podium.onDone;this.clearPodium();done?.();}
      return;
    }
    if(this.celebrating){
      const delta=Math.min(rawDelta,.05);
      if(this.network)this.updateNetwork(delta);
      this.mixer.update(delta);
      const target=new THREE.Vector3(this.player.position.x+2.9,this.runnerGround+2.25,this.player.position.z-5.2);
      this.camera.position.lerp(target,1-Math.exp(-3*delta));
      this.camera.lookAt(this.player.position.x,this.runnerGround+1.05,this.player.position.z);
      this.finishTimer-=delta;
      if(this.finishTimer<=0){
        stopVictory();
        this.celebrating=false;byId('finishCelebration').classList.add('hidden');
        const done=this.finishCallback;this.finishCallback=null;done?.();
      }
      return;
    }
    if(!this.isPlaying||this.paused)return;
    const delta=Math.min(rawDelta,.05);
    this.hitCooldown=Math.max(0,this.hitCooldown-delta);
    this.slideRemaining=Math.max(0,this.slideRemaining-delta);
    const previousAir=this.state.airborneHeight;
    let bufferedJump=false;
    if(!this.network){
      this.state=runStep(this.state,delta);updateTrainRoof(this.state,this.pattern);
      bufferedJump=consumeJumpBuffer(this.state,delta,jumpSpeed(this.state));if(bufferedJump)this.slideRemaining=0;
      const meters=Math.floor(this.state.distance)-this.dailyDistanceReported;
      if(meters>=10){this.dailyDistanceReported+=meters;this.recordDaily({meters});}
    }
    else this.updateNetwork(delta);
    if(this.state.airborneHeight===0 && previousAir>0 && !bufferedJump) this.playAnimation(this.animNames.run);
    if(this.slideRemaining===0 && this.lastAnim===this.animNames.slide)this.playAnimation(this.animNames.run);
    if(this.state.recovery===0 && this.lastAnim===this.animNames.hit)this.playAnimation(this.animNames.run);
    this.state.slide=this.slideRemaining;
    this.player.position.x=THREE.MathUtils.damp(this.player.position.x,this.targetX,12,delta);
    this.player.position.y=THREE.MathUtils.damp(this.player.position.y,this.runnerGround+this.state.airborneHeight,14,delta);
    // Keep the rig uniformly scaled, including when no slide clip is installed.
    this.player.position.z=this.network?THREE.MathUtils.damp(this.player.position.z,this.state.z,20,delta):this.state.z;
    updateHoverboard(this.hoverboard,this.runnerVisual,{active:this.state.hoverboardTime>0,rolling:this.slideRemaining>0,lateral:this.targetX-this.player.position.x,time:this.state.distance/14});
    applyCollisionBump(this.runnerVisual,this.state.recovery);
    if(bufferedJump)this.playAnimation(this.animNames.jump,true);
    else if(this.slideRemaining<=0&&(this.state.airborneHeight<=.05||this.state.platform!=null))this.playAnimation(this.state.hoverboardTime>0?this.animNames.glide:this.animNames.run);
    this.actions.get(this.animNames.run)?.setEffectiveTimeScale(collisionRunRate(this.state.recovery));
    if(!this.network||(this.network.room.phase==='racing'&&this.state.finish===null))this.mixer.update(delta);
    for(const obs of this.network?[]:this.pattern){
      if(obs.distance<this.state.distance-TRAIN_HIT_DISTANCE-1)continue;
      if(obs.distance>this.state.distance+TRAIN_HIT_DISTANCE+1)break;
      if(!this.hitCooldown&&hitsObstacle(this.state,obs)){
        const outcome=resolveObstacleHit(this.state,obs);
        this.runCollisionCount++;
        this.hitCooldown=outcome==='shield' ? .8 : 1.5;
        if(outcome==='hit'&&this.animNames.hit)this.playAnimation(this.animNames.hit,true);
        this.showPowerupToast(outcome==='shield'?'SHIELD SAVED YOU':'COLLISION · SPEED LOST');
      }
    }
    this.updateWorld();this.updatePowerups(delta);this.updateCoins(delta);this.hudElapsed+=delta;if(this.hudElapsed>=.1){this.updateHud();this.updateHazardHint();this.hudElapsed=0;}
    const targetCamX=this.player.position.x*.27;
    const focus=new THREE.Vector3(this.player.position.x*.57,1.2+this.state.airborneHeight*.74,this.player.position.z-8);
    this.camera.position.x=THREE.MathUtils.damp(this.camera.position.x,targetCamX,4,delta);
    this.camera.position.y=THREE.MathUtils.damp(this.camera.position.y,3.15+this.state.airborneHeight*.82,6,delta);
    this.camera.position.z=this.player.position.z+8.3;
    this.camera.lookAt(focus);
    this.sun.position.z=this.player.position.z-22;
    this.sun.target.position.z=this.player.position.z-20;
    if(!this.network&&this.state.distance>=MAX_DISTANCE)this.finish();
  }
}

async function begin(){
  try{
    setHud(false);showPanel('loading');
    await getOrCreateEngine();
    await ensureCharacters(engine,[byId('skinPicker').value]);
    await engine.setBoardStyle(daily.snapshot().equipped.board);
    engine.start(21032026,byId('skinPicker').value);showPanel(null);setHud(true);
  }catch(error){
    console.error('RUSHLINE cannot launch:',error);
    byId('setupMessage').textContent=error.message||'Model loading failed. Check the browser console and asset file paths.';
    showPanel('setup');
  }
}
byId('playBtn').addEventListener('click',begin);
byId('againBtn').addEventListener('click',begin);
byId('setupDismiss').addEventListener('click',()=>showPanel('menu'));
byId('setupRetry').addEventListener('click',begin);
byId('pauseBtn').addEventListener('click',()=>engine?.pause(true));
byId('resumeBtn').addEventListener('click',()=>engine?.pause(false));
byId('endBtn').addEventListener('click',()=>{if(engine)engine.isPlaying=false;setHud(false);showPanel('menu');});
byId('homeBtn').addEventListener('click',()=>showPanel('menu'));

setupMultiplayer({prepare:async report=>{await getOrCreateEngine(report);report('Preparing character choices…');await ensureCharacters(engine,['street','urban']);await loadPulseBoard();await engine.setBoardStyle(daily.snapshot().equipped.board);},showPanel,setHud,getEngine:()=>engine,getLoadout:()=>daily.snapshot().equipped});
