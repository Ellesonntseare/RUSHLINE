import fs from 'node:fs';import * as T from 'three';import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {buildPersonalHead} from '../src/serame-head.js';import {attachSerameHead} from '../src/serame-character.js';
fs.mkdirSync('.asset-work/neck-review',{recursive:true});let serial=0;
global.window={URL:{createObjectURL:blob=>{const path=`.asset-work/neck-review/texture-${serial++}.png`;pending.push(blob.arrayBuffer().then(b=>fs.writeFileSync(path,Buffer.from(b))));return path;}}};let pending=[];
global.document={createElementNS:()=>({listeners:{},addEventListener(t,cb){this.listeners[t]=cb;},removeEventListener(){},set src(v){this.path=v;queueMicrotask(()=>this.listeners.load?.call(this));}})};
const b=fs.readFileSync('public/assets/optimized/street.fbx');const rig=new FBXLoader().parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');await Promise.all(pending);await new Promise(r=>setTimeout(r,10));
const h=fs.readFileSync('public/assets/serame/head.glb');const donor=await new GLTFLoader().parseAsync(h.buffer.slice(h.byteOffset,h.byteOffset+h.byteLength),'');const texture=new T.Texture({path:'public/assets/serame/face.png'});const head=await buildPersonalHead(texture,null,donor);attachSerameHead(rig,head);
const clip=rig.animations[0].clone();for(const track of clip.tracks)if(/Hips.position$/.test(track.name))for(let i=0;i<track.values.length;i+=3){track.values[i]=0;track.values[i+2]=0;}
const mixer=new T.AnimationMixer(rig);mixer.clipAction(clip).play();mixer.update(Number(process.env.REVIEW_POSE_TIME??.25));
const tilt=Number(process.env.REVIEW_NECK_TILT||0);
if(tilt)rig.traverse(o=>{if(o.isBone&&/Head$/.test(o.name))o.rotateX(tilt);});
rig.updateMatrixWorld(true);rig.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
const meshes=[];rig.traverse(o=>{if(!o.isMesh||!o.visible)return;const g=o.geometry;const mat=Array.isArray(o.material)?o.material[0]:o.material;const p=new T.Vector3(),matrix=new T.Matrix4();for(let instance=0;instance<(o.isInstancedMesh?o.count:1);instance++){
 const world=o.matrixWorld.clone();if(o.isInstancedMesh){o.getMatrixAt(instance,matrix);world.multiply(matrix);}
 const positions=[];for(let i=0;i<g.attributes.position.count;i++){o.getVertexPosition(i,p);p.applyMatrix4(world);positions.push(...p.toArray());}
 meshes.push({name:o.name,positions,indices:g.index?Array.from(g.index.array):Array.from({length:g.attributes.position.count},(_,i)=>i),uv:g.attributes.uv?Array.from(g.attributes.uv.array):null,blend:g.attributes.faceBlend?Array.from(g.attributes.faceBlend.array):g.attributes.neckBlend?Array.from(g.attributes.neckBlend.array):null,face:!!g.attributes.faceBlend,texture:mat.map?.image?.path||null,color:mat.color?.toArray()||[.1,.1,.1]});
 }});fs.writeFileSync('.asset-work/neck-review/scene.json',JSON.stringify(meshes));console.log('Exported posed geometry',meshes.length);
