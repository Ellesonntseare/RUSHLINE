import * as THREE from 'three';
import {MAX_DISTANCE} from './logic.js';

export function routeSection(distance){
  if(distance<MAX_DISTANCE*.275)return 'boulevard';
  if(distance<MAX_DISTANCE*.55)return 'station';
  if(distance<MAX_DISTANCE*.7875)return 'tunnel';
  return 'downtown';
}

export function createSectionStructure(section,materials){
  const group=new THREE.Group();
  const pavement=materials.sidewalk;
  const wall=new THREE.MeshStandardMaterial({color:0x535d63,roughness:.84});
  const edge=new THREE.MeshStandardMaterial({color:0xe9c462,emissive:0x8d541b,emissiveIntensity:.12,roughness:.7});
  const add=(geometry,material,x,y,z)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.receiveShadow=true;group.add(mesh);return mesh;};
  if(section==='station'){
    for(const side of [-1,1]){
      add(new THREE.BoxGeometry(3.4,.3,16),pavement,side*7.9,.23,0);
      add(new THREE.BoxGeometry(.13,.035,16),edge,side*6.24,.41,0);
    }
  }
  if(section==='tunnel'){
    // The crown stays above trains and is beyond the near camera's sightline.
    for(const side of [-1,1]){
      add(new THREE.BoxGeometry(.42,6.4,16),wall,side*6.6,3.2,0);
      add(new THREE.BoxGeometry(.09,.08,16),edge,side*6.34,.95,0);
    }
    add(new THREE.BoxGeometry(13.6,.42,16),wall,0,6.62,0);
    for(const z of [-7.7,7.7]){
      add(new THREE.BoxGeometry(13.7,.22,.24),pavement,0,6.3,z);
      for(const side of [-1,1])add(new THREE.BoxGeometry(.28,6.1,.24),pavement,side*6.36,3.15,z);
    }
  }
  return group;
}

export function createFinishLine(){
  const group=new THREE.Group();
  const metal=new THREE.MeshStandardMaterial({color:0x202b34,metalness:.72,roughness:.27});
  const gold=new THREE.MeshStandardMaterial({color:0xffca65,metalness:.55,roughness:.24,emissive:0x70410b,emissiveIntensity:.25});
  const white=new THREE.MeshStandardMaterial({color:0xf5f3e9,roughness:.62});
  const add=(geometry,material,x,y,z)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;group.add(mesh);};
  for(const side of [-1,1]){
    add(new THREE.BoxGeometry(.24,5.1,.38),metal,side*5.45,2.55,0);
    add(new THREE.BoxGeometry(.36,.18,.5),gold,side*5.45,4.95,0);
  }
  add(new THREE.BoxGeometry(11.2,.55,.55),metal,0,5.05,0);
  add(new THREE.BoxGeometry(10.7,.12,.63),gold,0,4.7,0);
  for(let i=0;i<12;i++)for(let j=0;j<2;j++){
    add(new THREE.BoxGeometry(.91,.012,.37),(i+j)%2?metal:white,-5.005+i*.91,.12,(j-.5)*.37);
  }
  group.position.z=-MAX_DISTANCE;
  return group;
}
