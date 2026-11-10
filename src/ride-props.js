import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Shared, batched geometry keeps each roadside kit to four draw calls.
export function createStreetKit(){
  const group=new THREE.Group(),batches=new Map();
  const metal=new THREE.MeshStandardMaterial({color:0x28333c,metalness:.7,roughness:.38});
  const stone=new THREE.MeshStandardMaterial({color:0xabb0a6,roughness:.9});
  const green=new THREE.MeshStandardMaterial({color:0x436445,roughness:1});
  const light=new THREE.MeshStandardMaterial({color:0xffe6b2,emissive:0xffd78a,emissiveIntensity:1.3});
  function add(geometry,material,x,y,z){if(geometry.index){const original=geometry;geometry=original.toNonIndexed();original.dispose();}geometry.translate(x,y,z);if(!batches.has(material))batches.set(material,[]);batches.get(material).push(geometry);}
  add(new THREE.CylinderGeometry(.07,.13,5.5,8),metal,0,2.75,0);
  add(new THREE.BoxGeometry(1.4,.12,.22),metal,-.55,5.45,0);
  add(new THREE.BoxGeometry(.85,.035,.18),light,-.7,5.37,0);
  add(new THREE.BoxGeometry(1.1,.55,1.4),stone,.45,.275,5);
  for(const z of [4.65,5.2])add(new THREE.IcosahedronGeometry(.55,1),green,.45,.82,z);
  for(const z of [-4,-6]){
    add(new THREE.CylinderGeometry(.085,.11,.8,8),metal,-.35,.4,z);
    add(new THREE.CylinderGeometry(.09,.09,.09,8),light,-.35,.65,z);
  }
  for(const [material,parts] of batches){const mesh=new THREE.Mesh(mergeGeometries(parts),material);mesh.receiveShadow=true;group.add(mesh);parts.forEach(g=>g.dispose());}
  return group;
}

export function createHoverboard(){
  const board=new THREE.Group();
  const shell=new THREE.MeshStandardMaterial({color:0x183344,metalness:.78,roughness:.24});
  const grip=new THREE.MeshStandardMaterial({color:0x111a23,roughness:.8});
  const glow=new THREE.MeshStandardMaterial({color:0x86eeff,emissive:0x13cfff,emissiveIntensity:2});
  const outline=new THREE.Shape();
  outline.moveTo(-.32,-.73);outline.quadraticCurveTo(0,-1,.32,-.73);outline.lineTo(.39,.55);outline.quadraticCurveTo(0,1.05,-.39,.55);outline.closePath();
  const deck=new THREE.Mesh(new THREE.ExtrudeGeometry(outline,{depth:.07,bevelEnabled:true,bevelThickness:.035,bevelSize:.04,bevelSegments:2,steps:1,curveSegments:8}),shell);
  deck.rotation.x=-Math.PI/2;board.add(deck);
  for(const z of [-.35,.35]){const pad=new THREE.Mesh(new THREE.BoxGeometry(.48,.025,.36),grip);pad.position.set(0,.115,z);board.add(pad);}
  for(const x of [-.31,.31]){const rail=new THREE.Mesh(new THREE.BoxGeometry(.035,.035,1.15),glow);rail.position.set(x,.08,0);board.add(rail);}
  for(const x of [-.21,.21]){const engine=new THREE.Mesh(new THREE.CylinderGeometry(.10,.07,.12,10),glow);engine.position.set(x,-.06,.48);board.add(engine);}
  const wakeMaterial=new THREE.MeshBasicMaterial({color:0x72dfff,transparent:true,opacity:.15,depthWrite:false});
  const wake=new THREE.Mesh(new THREE.PlaneGeometry(.5,.68),wakeMaterial);wake.rotation.x=-Math.PI/2;wake.position.set(0,-.04,.78);wake.name='hover-wake';board.add(wake);
  return board;
}

export function updateHoverboard(board,visual,{active=false,rolling=false,finished=false,lateral=0,time=0}={}){
  board.visible=active&&!rolling&&!finished;
  // Visual offset only: all existing collision, train-roof and jump rules stay shared.
  board.position.y=.25+Math.sin(time*4)*.035;
  visual.position.y=board.visible?board.position.y+.15:0;
  board.rotation.z=THREE.MathUtils.clamp(-lateral*.09,-.18,.18);
  visual.rotation.z=board.visible?board.rotation.z*.65:0;
}
