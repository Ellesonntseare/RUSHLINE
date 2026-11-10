import * as THREE from 'three';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {loadCharacterSource} from './character-preview.js';
import {normalizeRunner} from './runner-model.js';
import {createBoardStyle} from './shop-assets.js';

export function createShopPreview(container){
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(35,1,.1,30);
  scene.add(new THREE.HemisphereLight(0xf5f8ff,0x44596d,2));
  const key=new THREE.DirectionalLight(0xffdfaf,3);key.position.set(-2,5,4);scene.add(key);
  const rim=new THREE.DirectionalLight(0x61d5ff,2.4);rim.position.set(3,3,-4);scene.add(rim);
  const renderer=new THREE.WebGLRenderer({antialias:!matchMedia('(pointer: coarse)').matches,alpha:true,powerPreference:'low-power'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(pointer: coarse)').matches?1:1.5));
  container.append(renderer.domElement);
  let current=null,mixer=null,request=0,last=performance.now();
  function resize(){const width=Math.max(1,container.clientWidth),height=Math.max(1,container.clientHeight);camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);}
  new ResizeObserver(resize).observe(container);resize();
  async function select(item){
    const token=++request;
    let model,nextMixer=null;
    if(item.kind==='board'){
      model=await createBoardStyle(item.id);
    }else{
      const [source,response]=await Promise.all([loadCharacterSource('classic'),fetch(item.asset)]);
      if(!response.ok)throw Error('Dance animation could not load.');
      const clip=THREE.AnimationClip.parse(await response.json());
      for(const track of clip.tracks)if(/Hips\.position$/.test(track.name))for(let i=0;i<track.values.length;i+=3){track.values[i]=0;track.values[i+2]=0;}
      model=new THREE.Group();const rig=cloneSkeleton(source);model.add(rig);normalizeRunner(rig,model);
      nextMixer=new THREE.AnimationMixer(rig);nextMixer.clipAction(clip).play();
    }
    if(token!==request)return false;
    if(item.kind==='board'){camera.position.set(2.8,1.3,3.5);camera.lookAt(0,.25,0);}
    else {camera.position.set(0,1.05,5.8);camera.lookAt(0,.93,0);}
    if(current)scene.remove(current);
    current=model;mixer=nextMixer;scene.add(model);return true;
  }
  function frame(now){
    requestAnimationFrame(frame);
    if(document.hidden||container.closest('.hidden')){last=now;return;}
    if(now-last<1000/30)return;
    const delta=Math.min((now-last)/1000,.05);last=now;
    if(mixer)mixer.update(delta);
    else if(current)current.rotation.y+=delta*.24;
    renderer.render(scene,camera);
  }
  requestAnimationFrame(frame);
  return {select};
}
