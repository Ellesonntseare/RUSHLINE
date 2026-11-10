import * as THREE from 'three';
import {buildPersonalHead} from './serame-head.js';
let headSource;
export function loadSerameHead(){
  headSource ||= new THREE.TextureLoader().loadAsync('/assets/serame/face.png').then(texture=>buildPersonalHead(texture)).catch(error=>{headSource=null;throw error;});
  return headSource;
}

export function attachSerameHead(rig,source){
  rig.updateMatrixWorld(true);
  const body=rig.getObjectByName('Ch31_Body');
  const bone=body?.skeleton?.bones.find(b=>/Head$/.test(b.name));
  if(!body||!bone)throw new Error('City Runner head attachment requires the Ch31 skeleton.');
  // Preserve hands and neck, removing only triangles belonging to the old head.
  const geometry=body.geometry.clone(),position=geometry.attributes.position,indices=[];
  const count=geometry.index?.count??position.count;
  const vertex=i=>geometry.index?geometry.index.getX(i):i;
  const point=new THREE.Vector3();
  for(let i=0;i<count;i+=3){
    const triangle=[vertex(i),vertex(i+1),vertex(i+2)];
    const above=triangle.every(id=>{point.fromBufferAttribute(position,id).applyMatrix4(body.matrixWorld);return point.y>148&&Math.abs(point.x)<13;});
    if(!above)indices.push(...triangle);
  }
  geometry.setIndex(indices);body.geometry=geometry;
  const neckBlend=new Float32Array(position.count);
  for(let i=0;i<position.count;i++){
    point.fromBufferAttribute(position,i).applyMatrix4(body.matrixWorld);
    neckBlend[i]=Math.abs(point.x)<9.5?THREE.MathUtils.smoothstep(point.y,148,153):0;
  }
  geometry.setAttribute('neckBlend',new THREE.BufferAttribute(neckBlend,1));
  const blendNeck=original=>{
    const material=original.clone();
    material.onBeforeCompile=shader=>{
      shader.uniforms.neckTone={value:new THREE.Color(0x75472f)};
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float neckBlend; varying float vNeckBlend;').replace('#include <begin_vertex>','#include <begin_vertex>\nvNeckBlend=neckBlend;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 neckTone; varying float vNeckBlend;').replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,neckTone,vNeckBlend);');
    };
    material.customProgramCacheKey=()=> 'city-neck-blend-v1';return material;
  };
  body.material=Array.isArray(body.material)?body.material.map(blendNeck):blendNeck(body.material);
  for(const name of ['Ch31_Hair','Ch31_Eyelashes'])rig.getObjectByName(name)?.removeFromParent();
  const head=source.clone(true);head.name='SerameHead';
  // Broaden the face without stretching the already long neck vertically.
  // Seat the jaw lower; the skinned neck rim below is still anchored in the collar.
  const collar=new THREE.Box3().setFromObject(rig.getObjectByName('Ch31_Collar'),true);
  const sourceBounds=new THREE.Box3().setFromObject(head,true);
  const headWidthScale=110,headHeightScale=90,neckShorten=8;
  head.scale.set(headWidthScale,headHeightScale,headWidthScale);
  head.position.set((collar.min.x+collar.max.x)/2,collar.max.y-4-neckShorten-sourceBounds.min.y*headHeightScale,(collar.min.z+collar.max.z)/2);
  rig.add(head);rig.updateMatrixWorld(true);bone.attach(head);
  rig.updateMatrixWorld(true);
  const skull=head.getObjectByName('MI_1041303_Head');
  if(!skull)throw new Error('Serame head geometry is missing.');
  // Skin the continuous head/neck to the runner's actual skeleton. A rigid
  // neck attached only to Head separates from the shoulders during animation.
  const neckGeometry=skull.geometry.clone();
  const toBody=new THREE.Matrix4().copy(body.matrixWorld).invert().multiply(skull.matrixWorld);
  neckGeometry.applyMatrix4(toBody);
  const points=neckGeometry.attributes.position;
  // The donor neck has an uneven open shoulder edge. Reshape that edge into
  // one collar ring instead of leaving its rear flap sticking out of the shirt.
  const edges=new Map(),edge=(a,b)=>{const key=a<b?`${a},${b}`:`${b},${a}`;edges.set(key,(edges.get(key)||0)+1);};
  const sourcePositions=skull.geometry.attributes.position;
  const sourceIndices=skull.geometry.index;
  for(let i=0;i<sourceIndices.count;i+=3){const a=sourceIndices.getX(i),b=sourceIndices.getX(i+1),c=sourceIndices.getX(i+2);edge(a,b);edge(b,c);edge(c,a);}
  const neckRim=new Set();
  for(const [key,count] of edges)if(count===1)for(const id of key.split(',').map(Number)){
    const y=sourcePositions.getY(id),z=sourcePositions.getZ(id);
    if(y<-.045||(y<.025&&z<-.035))neckRim.add(id);
  }
  const indices4=new Uint16Array(points.count*4),weights=new Float32Array(points.count*4);
  const bones=body.skeleton.bones;
  const headIndex=bones.indexOf(bone),neckIndex=bones.findIndex(b=>/Neck$/.test(b.name)),chestIndex=bones.findIndex(b=>/Spine2$/.test(b.name));
  if(neckIndex<0||chestIndex<0)throw new Error('City Runner neck and chest joints are missing.');
  const baseY=collar.min.y+2.5,oldBase=collar.max.y-4-neckShorten;
  const inverseBody=new THREE.Matrix4().copy(body.matrixWorld).invert();
  const neckCenter=bones[neckIndex].getWorldPosition(new THREE.Vector3());
  for(let i=0;i<points.count;i++){
    point.fromBufferAttribute(points,i).applyMatrix4(body.matrixWorld);
    // Only reshape the lower neck; facial proportions and head size stay intact.
    const sourceY=sourcePositions.getY(i),sourceZ=sourcePositions.getZ(i);
    const neckTop=THREE.MathUtils.lerp(.025,-.075,THREE.MathUtils.smoothstep(sourceZ,-.03,.055));
    const lower=1-THREE.MathUtils.smoothstep(sourceY,neckTop-.065,neckTop);
    point.y+=(baseY-oldBase)*lower;
    const dx=point.x-neckCenter.x,dz=point.z-neckCenter.z;
    const radius=Math.hypot(dx/4.7,dz/4.3);
    if(radius>1){point.x=THREE.MathUtils.lerp(point.x,neckCenter.x+dx/radius,lower);point.z=THREE.MathUtils.lerp(point.z,neckCenter.z+dz/radius,lower);}
    const rear=(1-THREE.MathUtils.smoothstep(sourceZ,-.08,.02))*(1-THREE.MathUtils.smoothstep(sourceY,-.07,.09));
    point.z=THREE.MathUtils.lerp(point.z,collar.max.z+4,rear*.28);
    if(neckRim.has(i)){
      const angle=Math.atan2(dz/4.3,dx/4.7);
      point.set(neckCenter.x+Math.cos(angle)*4.7,baseY,neckCenter.z+Math.sin(angle)*4.3);
    }
    // Facial vertices should move as one skull. Blend only the underside and
    // back of the neck into the neck and chest joints.
    const faceWeight=THREE.MathUtils.smoothstep(sourceZ,-.035,.025)*THREE.MathUtils.smoothstep(sourceY,-.14,-.085);
    const headWeight=Math.max(THREE.MathUtils.smoothstep(point.y,151,157),faceWeight);
    const chestWeight=(1-headWeight)*(1-THREE.MathUtils.smoothstep(point.y,baseY,159));
    indices4.set([headIndex,neckIndex,chestIndex,0],i*4);
    weights.set([headWeight,1-headWeight-chestWeight,chestWeight,0],i*4);
    point.applyMatrix4(inverseBody);points.setXYZ(i,point.x,point.y,point.z);
  }
  neckGeometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices4,4));
  neckGeometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  neckGeometry.computeVertexNormals();
  neckGeometry.computeBoundingBox();neckGeometry.computeBoundingSphere();
  const skin=new THREE.SkinnedMesh(neckGeometry,skull.material);
  skin.name='SerameNeckSkin';skin.position.copy(body.position);skin.quaternion.copy(body.quaternion);skin.scale.copy(body.scale);
  skin.castShadow=true;skin.frustumCulled=false;
  body.parent.add(skin);skin.bind(body.skeleton,body.bindMatrix.clone());
  skull.removeFromParent();
  rig.updateMatrixWorld(true);
  return head;
}
