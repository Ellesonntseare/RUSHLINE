import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

function batchBuilding(source){
  source.updateMatrixWorld(true);
  const batches=new Map(),result=new THREE.Group();
  source.traverse(o=>{
    if(!o.isMesh)return;
    const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);
    if(Array.isArray(o.material)){
      const mesh=new THREE.Mesh(geometry,o.material);mesh.castShadow=o.castShadow;mesh.receiveShadow=o.receiveShadow;result.add(mesh);return;
    }
    const signature=Object.entries(geometry.attributes).map(([name,a])=>`${name}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}`).sort().join('|');
    const key=`${o.material.uuid}/${signature}/${Boolean(geometry.index)}`;
    if(!batches.has(key))batches.set(key,{material:o.material,geometries:[],castShadow:false});
    const batch=batches.get(key);batch.geometries.push(geometry);batch.castShadow ||=o.castShadow;
  });
  for(const batch of batches.values()){
    const geometry=batch.geometries.length===1?batch.geometries[0]:mergeGeometries(batch.geometries);
    if(!geometry)throw Error('Could not combine the city facade geometry.');
    const mesh=new THREE.Mesh(geometry,batch.material);mesh.castShadow=batch.castShadow;mesh.receiveShadow=true;result.add(mesh);
  }
  return result;
}

// Poly Haven's facade file is a kit of 3m modules laid out as a catalogue.
// Reassemble a small selection into complete apartment/office buildings.
export function createUrbanBuildingTemplates(kitScene){
  const module=name=>{
    const source=kitScene.getObjectByName(name);
    if(!source)throw Error(`Missing city facade module: ${name}`);
    const copy=source.clone(true);
    copy.position.set(0,0,0);
    copy.rotation.set(0,0,0);
    copy.scale.set(1,1,1);
    copy.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});
    return copy;
  };
  const wallMaterials=[
    new THREE.MeshStandardMaterial({color:0xb9b7ad,roughness:.91}),
    new THREE.MeshStandardMaterial({color:0x9daab1,roughness:.78}),
    new THREE.MeshStandardMaterial({color:0xaaa397,roughness:.88})
  ];
  const glass=new THREE.MeshPhysicalMaterial({color:0x52788a,metalness:.58,roughness:.12,clearcoat:.8,side:THREE.DoubleSide});
  const frame=new THREE.MeshStandardMaterial({color:0x48525a,metalness:.6,roughness:.32});
  const roof=new THREE.MeshStandardMaterial({color:0x555e64,metalness:.25,roughness:.8});
  const templates=[];
  for(let variant=0;variant<3;variant++){
    const floors=variant===1?5:variant===2?3:4;
    const height=floors*3,depth=6;
    const building=new THREE.Group();
    const body=new THREE.Mesh(new THREE.BoxGeometry(9,height,5.5),wallMaterials[variant]);
    body.position.set(0,height/2,-.27);body.castShadow=true;body.receiveShadow=true;building.add(body);
    for(let floor=0;floor<floors;floor++)for(let col=0;col<3;col++){
      const x=-1.5+col*3,y=floor*3,z=depth/2;
      const entrance=floor===0&&col===1;
      const style=variant===1&&col===2?'small':'large';
      const wall=module(entrance?'wall_door_centered_small_01':`wall_window_centered_${style}_01`);
      wall.position.set(x,y,z);building.add(wall);
      const detail=module(entrance?'door_centered_small_01':`window_centered_${style}_01`);
      detail.position.set(x,y,z);building.add(detail);
    }
    for(let col=0;col<3;col++){
      const trim=module('cornice_standard_standard_01');
      trim.position.set(-1.5+col*3,height-.08,depth/2);building.add(trim);
    }
    const cap=new THREE.Mesh(new THREE.BoxGeometry(9.25,.22,6.2),roof);
    cap.position.y=height+.13;cap.castShadow=false;building.add(cap);
    for(const x of [-4.54,4.54]){
      for(let floor=0;floor<floors;floor++)for(const z of [-1.65,1.1]){
        if(floor===0&&z<0)continue;
        const window=new THREE.Mesh(new THREE.PlaneGeometry(1.55,1.65),glass);
        window.rotation.y=x<0?-Math.PI/2:Math.PI/2;
        window.position.set(x,floor*3+1.5,z);building.add(window);
        const sill=new THREE.Mesh(new THREE.BoxGeometry(.13,.1,1.8),frame);
        sill.position.set(x,floor*3+.62,z);building.add(sill);
      }
    }
    const roofUnit=new THREE.Mesh(new THREE.BoxGeometry(1.25,.72,1.4),frame);
    roofUnit.position.set(variant-1,height+.6,-1.1);building.add(roofUnit);
    templates.push(batchBuilding(building));
  }
  return templates;
}
