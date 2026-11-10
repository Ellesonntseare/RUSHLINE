import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {TRAIN_HIT_DISTANCE,TRAIN_ROOF_HEIGHT,TRAIN_RAMP_LENGTH} from './logic.js';

// Reused templates: solid geometry and matte markings, without extra lights.
export function createHazardMarkers(type){
  const group=new THREE.Group();group.name=`${type}-guidance`;
  const ink=new THREE.MeshBasicMaterial({color:0x14222b});
  const white=new THREE.MeshBasicMaterial({color:0xf4f5df});
  const signal=new THREE.MeshBasicMaterial({color:type==='barrier'?0xffa63b:type==='overhead'?0x72cfff:0x6ee3c5});
  const deck=new THREE.MeshStandardMaterial({color:0x354950,metalness:.35,roughness:.78});
  function box(w,h,d,m,x,y,z){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);group.add(mesh);return mesh;}
  function arrow(x,y,z,down=false){
    const shape=new THREE.Shape();shape.moveTo(-.24,0);shape.lineTo(0,.24);shape.lineTo(.24,0);shape.lineTo(.13,-.1);shape.lineTo(0,.03);shape.lineTo(-.13,-.1);shape.closePath();
    const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),white);mesh.position.set(x,y,z);if(down)mesh.rotation.z=Math.PI;group.add(mesh);
  }
  if(type==='barrier'){
    box(2.32,.52,.09,ink,0,.63,.48);
    box(2.32,.07,.1,signal,0,.93,.49);
    for(const x of [-.76,0,.76])arrow(x,.63,.54);
    for(const x of [-1.08,1.08])box(.1,.85,.12,signal,x,.48,.48);
  }else if(type==='overhead'){
    box(2.33,.47,.09,ink,0,1.50,.30);
    for(const x of [-.76,0,.76])arrow(x,1.52,.36,true);
    box(2.36,.075,.12,signal,0,1.235,.31);
    for(const x of [-1.22,1.22])box(.12,1.04,.08,signal,x,.69,.19);
  }else{
    const end=TRAIN_HIT_DISTANCE,start=end+TRAIN_RAMP_LENGTH,h=TRAIN_ROOF_HEIGHT;
    const positions=[-1.14,0,start,1.14,0,start,1.14,h,end,-1.14,h,end];
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();
    const ramp=new THREE.Mesh(geometry,deck);ramp.name='train-ramp';ramp.receiveShadow=true;group.add(ramp);
    const slopeLength=Math.hypot(h,TRAIN_RAMP_LENGTH),angle=Math.atan2(h,TRAIN_RAMP_LENGTH);
    for(const x of [-1.05,1.05]){
      const edge=box(.075,.025,slopeLength,signal,x,h/2+.025,end+TRAIN_RAMP_LENGTH/2);edge.rotation.x=angle;
      box(.075,.025,TRAIN_HIT_DISTANCE*2,signal,x,h+.035,0);
    }
    for(const t of [.25,.55,.85]){
      const mark=box(.7,.025,.13,white,0,t*h+.03,start-t*TRAIN_RAMP_LENGTH);mark.rotation.x=angle;
    }
    box(1.95,.025,.14,signal,0,h+.035,end-.25);
    box(1.95,.025,.14,signal,0,h+.035,-end+.4);
  }
  // Batch by material so markings cost only a handful of draws per obstacle.
  group.updateMatrixWorld(true);const batches=new Map();
  for(const mesh of [...group.children]){
    let geometry=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);if(geometry.index){const indexed=geometry;geometry=indexed.toNonIndexed();indexed.dispose();}
    if(!batches.has(mesh.material))batches.set(mesh.material,[]);batches.get(mesh.material).push(geometry);
    mesh.geometry.dispose();group.remove(mesh);
  }
  for(const [material,geometries] of batches){const mesh=new THREE.Mesh(mergeGeometries(geometries),material);mesh.receiveShadow=true;group.add(mesh);geometries.forEach(g=>g.dispose());}
  return group;
}

export function collectibleGlint(distance,obstacles){
  return obstacles.some(o=>Math.abs(o.distance-distance)<(o.type==='train'?19:14))?.12:.45;
}
