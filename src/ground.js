import * as THREE from 'three';

function tiled(texture,x,y,color=false){
  const copy=texture.clone();
  copy.wrapS=copy.wrapT=THREE.RepeatWrapping;
  copy.repeat.set(x,y);
  if(color)copy.colorSpace=THREE.SRGBColorSpace;
  copy.needsUpdate=true;
  return copy;
}

function surface(textures,prefix,repeat,tint=0xffffff){
  return new THREE.MeshStandardMaterial({
    color:tint,
    map:tiled(textures[`${prefix}_diff`],...repeat,true),
    normalMap:textures[`${prefix}_normal`]?tiled(textures[`${prefix}_normal`],...repeat):null,
    roughnessMap:textures[`${prefix}_rough`]?tiled(textures[`${prefix}_rough`],...repeat):null,
    roughness:1,metalness:0
  });
}

export function addGroundDetailMap(materials,name,texture){
  const match=/^(asphalt_02|concrete_pavement_02)_(normal|rough)$/.exec(name);
  if(!match)return;
  const targets=match[1]==='asphalt_02'?
    [[materials.road,[4,1]],[materials.city,[12,5]]]:
    [[materials.sidewalk,[1.2,1.2]]];
  const property=match[2]==='normal'?'normalMap':'roughnessMap';
  for(const [material,repeat] of targets){
    material[property]=tiled(texture,...repeat);
    material.needsUpdate=true;
  }
}

export function createGroundMaterials(textures){
  return {
    road:surface(textures,'asphalt_02',[4,1],0xb9bdc1),
    sidewalk:surface(textures,'concrete_pavement_02',[1.2,1.2],0xd2d4d0),
    city:surface(textures,'asphalt_02',[12,5],0xa5aaad),
    curb:new THREE.MeshStandardMaterial({color:0xaaa9a0,roughness:.86})
  };
}

export function createGroundTile(spacing,materials){
  const group=new THREE.Group();
  const plane=(width,x,y,material)=>{
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,spacing),material);
    mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,0);mesh.receiveShadow=true;group.add(mesh);
  };
  // Existing rails and sleepers rise above this roadbed.
  plane(14.2,0,.085,materials.road);
  for(const side of [-1,1]){
    plane(2.5,side*8.35,.115,materials.sidewalk);
    const kerb=new THREE.Mesh(new THREE.BoxGeometry(.18,.18,spacing),materials.curb);
    kerb.position.set(side*7.1,.12,0);kerb.receiveShadow=true;group.add(kerb);
  }
  return group;
}

export function createCityGround(materials){
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(42,16),materials.city);
  mesh.rotation.x=-Math.PI/2;mesh.position.y=-.035;mesh.receiveShadow=true;
  return mesh;
}
