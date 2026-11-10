import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let source;
const HEAD_MATERIAL = 'MI_1041303_Head';

// Keep a continuous anatomical head and neck. Project the user's preferred
// portrait over the face and blend to skin on the sides and below the jaw.
export async function buildPersonalHead(texture,profile=null,suppliedDonor=null) {
  if(!suppliedDonor)source ||= new GLTFLoader().loadAsync('/assets/serame/head.glb');
  const donor = suppliedDonor||await source;
  const head = new THREE.Group();
  head.name = profile?'Supplied figure anatomical head':'Serame reference head';
  const skin = new THREE.MeshStandardMaterial({map:texture,roughness:.86,metalness:0,side:THREE.DoubleSide});
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = true;
  const skinTone=new THREE.Color(profile?0x875638:0x75472f);
  skin.onBeforeCompile=shader=>{
    shader.uniforms.serameSkinTone={value:skinTone};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float faceBlend; varying float vFaceBlend;').replace('#include <begin_vertex>','#include <begin_vertex>\nvFaceBlend=faceBlend;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 serameSkinTone; varying float vFaceBlend;').replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb=mix(serameSkinTone,diffuseColor.rgb,vFaceBlend);');
  };
  skin.customProgramCacheKey=()=> profile?'supplied-portrait-head-v1':'serame-portrait-blend-v1';
  const landmarks=profile?.landmarks||[[1.58,.97],[1.60,.88],[1.63,.76],[1.655,.62],[1.695,.46],[1.75,.24],[1.80,.025]];
  function imageY(y){for(let i=1;i<landmarks.length;i++)if(y<=landmarks[i][0]){const a=landmarks[i-1],b=landmarks[i];return THREE.MathUtils.lerp(a[1],b[1],THREE.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1));}return .025;}
  let skull;
  donor.scene.traverse(o => {
    if (!o.isMesh) return;
    const name=o.material?.name || '';
    if (name !== HEAD_MATERIAL && !/MI_1041303_Eyes_0[123]$/.test(name)) return;
    const geometry=o.geometry.clone();
    geometry.deleteAttribute('skinIndex'); geometry.deleteAttribute('skinWeight');
    const positions=geometry.attributes.position;
    const uv=new THREE.BufferAttribute(new Float32Array(positions.count*2),2),blend=new THREE.BufferAttribute(new Float32Array(positions.count),1);
    for(let i=0;i<positions.count;i++) {
      const x=positions.getX(i), y=positions.getY(i), z=positions.getZ(i);
      const jaw=THREE.MathUtils.smoothstep(1.66-y,0,.09);
      const neck=THREE.MathUtils.smoothstep(1.6-y,0,.10);
      // The supplied side and full-body references have a gently tapered jaw.
      positions.setXYZ(i,x*((profile?1.03:.96)-.06*jaw)*(1-.28*neck),(y-1.665),z*(profile?1:.96));
      let center=.5;if(profile){for(let j=1;j<landmarks.length;j++){if(y<=landmarks[j][0]){const a=landmarks[j-1],b=landmarks[j];center=THREE.MathUtils.lerp(a[2],b[2],THREE.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1));break;}}}
      uv.setXY(i,center+x/(profile?.width||.22),1-imageY(y));
      blend.setX(i,name===HEAD_MATERIAL ? THREE.MathUtils.smoothstep(z,.025,.065)*THREE.MathUtils.smoothstep(y,1.59,1.62)*(1-THREE.MathUtils.smoothstep(Math.abs(x),.072,.105)) : 1);
    }
    geometry.setAttribute('uv',uv);geometry.setAttribute('faceBlend',blend);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    // Preserve the authored normals: this asset uses a double-sided shell.
    const material=skin;
    const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.castShadow=true;mesh.frustumCulled=false;head.add(mesh);
    if(name===HEAD_MATERIAL)skull=mesh;
  });

  // Dense short curls sit on the real scalp rather than on a spherical cap.
  const hairMaterial=new THREE.MeshStandardMaterial({color:0x040504,roughness:1,side:THREE.DoubleSide});
  if(skull) {
    const scalpGeometry=skull.geometry.clone(),p=scalpGeometry.attributes.position,normals=scalpGeometry.attributes.normal,index=scalpGeometry.index,indices=[];
    for(let i=0;i<index.count;i+=3) {
      const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];
      if(ids.every(id=>{const y=p.getY(id),z=p.getZ(id),x=Math.abs(p.getX(id));const line=z>.045?.078:z<-.025?-.005:.026+.025*(1-x/.11);return y>line;}))indices.push(...ids);
    }
    scalpGeometry.setIndex(indices);
    for(let i=0;i<p.count;i++){const normal=new THREE.Vector3().fromBufferAttribute(normals,i),point=new THREE.Vector3().fromBufferAttribute(p,i);const crown=THREE.MathUtils.smoothstep(point.y,.07,.125);point.addScaledVector(normal,.005+.017*crown);p.setXYZ(i,point.x,point.y,point.z);}
    scalpGeometry.computeBoundingBox();scalpGeometry.computeBoundingSphere();
    const scalp=new THREE.Mesh(scalpGeometry,hairMaterial);scalp.castShadow=true;head.add(scalp);
    const triangles=[],a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();let total=0;
    for(let i=0;i<indices.length;i+=3){a.fromBufferAttribute(p,indices[i]);b.fromBufferAttribute(p,indices[i+1]);c.fromBufferAttribute(p,indices[i+2]);const area=b.clone().sub(a).cross(c.clone().sub(a)).length()*.5;if(area<1e-9)continue;total+=area;triangles.push({a:a.clone(),b:b.clone(),c:c.clone(),end:total});}
    const count=1500,hair=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.0007,0),hairMaterial,count),dummy=new THREE.Object3D();
    let seed=1927;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<count;i++){const choice=random()*total;let low=0,high=triangles.length-1;while(low<high){const mid=(low+high)>>1;if(triangles[mid].end<choice)low=mid+1;else high=mid;}const t=triangles[low],r=Math.sqrt(random()),v=random();dummy.position.copy(t.a).multiplyScalar(1-r).addScaledVector(t.b,r*(1-v)).addScaledVector(t.c,r*v);dummy.rotation.set(random()*6.28,random()*6.28,random()*6.28);dummy.scale.setScalar(.75+random()*.8);dummy.updateMatrix();hair.setMatrixAt(i,dummy.matrix);}
    hair.computeBoundingSphere();hair.castShadow=true;head.add(hair);
  }
  return head;
}
