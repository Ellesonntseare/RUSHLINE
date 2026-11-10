import {loadSerameHead,attachSerameHead} from './serame-character.js';
import * as THREE from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {normalizeRunner} from './runner-model.js';
import {applyCityColorway} from './character-looks.js';

const SOURCES={classic:'/assets/optimized/classic-meshopt.bin',street:'/assets/optimized/street.bin',urban:'/assets/optimized/street.bin'};
const loader=new FBXLoader();
const gltfLoader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache=new Map();
export function loadCharacterSource(id){
  if(!SOURCES[id])throw new Error('Unknown runner look');
  if(id==='urban'){
    if(!cache.has(id))cache.set(id,Promise.all([loadCharacterSource('street'),loadSerameHead()]).then(([source,head])=>{const rig=cloneSkeleton(source);attachSerameHead(rig,head);return rig;}).catch(error=>{cache.delete(id);throw error;}));
    return cache.get(id);
  }
  const sourceId=id;
  if(!cache.has(sourceId))cache.set(sourceId,(id==='classic'
    ?gltfLoader.loadAsync(SOURCES[id]).then(({scene,animations})=>{scene.rotation.x=-Math.PI/2;scene.updateMatrixWorld(true);scene.animations=animations;return scene;})
    :loader.loadAsync(SOURCES[sourceId])).catch(error=>{cache.delete(sourceId);throw error;}));
  return cache.get(sourceId);
}

export function createCharacterPreview(container,picker){
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(29,1,.1,30);
  camera.position.set(0,1.05,5.8);
  camera.lookAt(0,.93,0);
  scene.add(new THREE.HemisphereLight(0xf4f8ff,0x56677b,2.1));
  const key=new THREE.DirectionalLight(0xffdfac,3.1);key.position.set(-2,5,4);scene.add(key);
  const rim=new THREE.DirectionalLight(0x7acfff,2.2);rim.position.set(3,3,-3);scene.add(rim);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.25;
  renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(pointer: coarse)').matches?1:1.5));
  container.prepend(renderer.domElement);
  let current=null,request=0,last=performance.now();
  const instances=new Map();
  let dragX=null;
  renderer.domElement.style.touchAction='none';
  renderer.domElement.addEventListener('pointerdown',e=>{dragX=e.clientX;renderer.domElement.setPointerCapture(e.pointerId);});
  renderer.domElement.addEventListener('pointermove',e=>{if(dragX===null||!current)return;current.root.rotation.y+=(e.clientX-dragX)*.012;dragX=e.clientX;});
  renderer.domElement.addEventListener('pointerup',()=>dragX=null);
  renderer.domElement.addEventListener('pointercancel',()=>dragX=null);
  function resize(){
    const width=Math.max(1,container.clientWidth),height=Math.max(1,container.clientHeight);
    camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);
  }
  new ResizeObserver(resize).observe(container);
  resize();
  async function select(id){
    const wanted=SOURCES[id]?id:'classic',token=++request;
    document.getElementById('characterName').textContent={classic:'CLASSIC RUNNER',street:'STREET RUNNER',urban:'CITY RUNNER'}[wanted];
    const label=container.querySelector('#previewLabel');
    const activate=instance=>{if(current)scene.remove(current.root);scene.add(instance.root);current=instance;camera.position.y=wanted==='urban'?.91:1.05;camera.lookAt(0,wanted==='urban'?1.1:.93,0);label.classList.add('hidden');};
    if(instances.has(wanted)){activate(instances.get(wanted));return;}
    label.textContent='LOADING RUNNER…';label.classList.remove('hidden');
    try{
      const source=await loadCharacterSource(wanted);
      const motionSource=source;
      if(token!==request)return;
      const root=new THREE.Group(),visual=new THREE.Group();root.add(visual);
      const rig=cloneSkeleton(source);visual.add(rig);
      if(wanted==='urban')applyCityColorway(rig);
      normalizeRunner(rig,visual);
      visual.rotation.y=0;
      const clip=motionSource.animations.find(a=>a.tracks.length&&a.duration>.1)?.clone();
      if(clip)for(const track of clip.tracks)if(/Hips\.position$/.test(track.name))for(let i=0;i<track.values.length;i+=3){track.values[i]=0;track.values[i+2]=0;}
      const mixer=new THREE.AnimationMixer(rig);
      if(clip){mixer.clipAction(clip).play();if(wanted==='urban')mixer.update(.001);}
      const instance={root,mixer,still:wanted==='urban'};instances.set(wanted,instance);activate(instance);
    }catch(error){
      if(token!==request)return;
      label.textContent='PREVIEW UNAVAILABLE';
      console.warn('Runner preview unavailable:',error);
    }
  }
  picker.addEventListener('change',()=>select(picker.value));
  select(picker.value);
  function frame(now){
    requestAnimationFrame(frame);
    if(document.hidden||container.closest('.hidden')){last=now;return;}
    if(now-last<1000/30)return;
    const dt=Math.min((now-last)/1000,.05);last=now;
    if(current&&!current.still)current.mixer.update(dt);
    renderer.render(scene,camera);
  }
  requestAnimationFrame(frame);
  return {select};
}
