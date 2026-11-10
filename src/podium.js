import * as THREE from 'three';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {normalizeRunner} from './runner-model.js';
import {danceIndexForRunner} from './dances.js';
import {shopItem} from './shop-catalog.js';

export function createPodium(players,characters,manifest,danceNames){
  const group=new THREE.Group(),mixers=[];
  const ranks=[{x:0,h:1.1},{x:-2.55,h:.72},{x:2.55,h:.48},{x:4.8,h:.3}];
  const colors=[0xffce6b,0xbfcad2,0xbd8564,0x63747e];
  const floor=new THREE.Mesh(new THREE.CylinderGeometry(7.9,8.25,.26,48),new THREE.MeshStandardMaterial({color:0x182732,metalness:.3,roughness:.5}));
  floor.position.set(.9,-.14,-3.8);group.add(floor);
  for(let i=0;i<Math.min(4,players.length);i++){
    const p=players[i],place=ranks[i],skin=characters[p.skin]?p.skin:'classic',asset=characters[skin];
    const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(1.02,1.13,place.h,32),new THREE.MeshStandardMaterial({color:colors[i],metalness:.57,roughness:.3}));
    pedestal.position.set(place.x,place.h/2,-3.8);pedestal.castShadow=true;group.add(pedestal);
    const trim=new THREE.Mesh(new THREE.TorusGeometry(1.03,.045,8,32),new THREE.MeshStandardMaterial({color:0xffe7b1,metalness:.7,roughness:.2}));
    trim.rotation.x=Math.PI/2;trim.position.set(place.x,place.h+.015,-3.8);group.add(trim);
    const visual=new THREE.Group(),rig=cloneSkeleton(asset.scene);visual.add(rig);
    normalizeRunner(rig,visual,skin==='classic'?manifest.runnerScale??1:manifest.skinScale??1);
    visual.position.set(place.x,place.h,-3.8);visual.rotation.y=asset.yaw+Math.PI;group.add(visual);
    const clipName=shopItem(p.danceStyle)?.clip||danceNames[danceIndexForRunner(p.id||skin,danceNames.length)];
    const clip=asset.clips.find(c=>c.name===clipName)||asset.clips.find(c=>c.name==='Run');
    if(clip){const mixer=new THREE.AnimationMixer(rig);mixer.clipAction(clip).setLoop(THREE.LoopRepeat).play();mixers.push(mixer);}
  }
  return {group,mixers};
}
