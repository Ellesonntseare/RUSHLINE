import fs from 'node:fs';
import * as T from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
globalThis.window={URL,innerWidth:1000,innerHeight:700};
T.TextureLoader.prototype.load=function(url){const t=new T.Texture();t.userData.source=url.startsWith('blob:')?'embedded image':url;return t;};
for(const name of ['Running.fbx','Jumping Up.fbx','Falling To Roll.fbx']){
 const b=fs.readFileSync('../../'+name),rig=new FBXLoader().parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');rig.updateMatrixWorld(true);
 let meshes=[],bones=[];rig.traverse(o=>{if(o.isBone)bones.push(o.name);if(o.isMesh)meshes.push({name:o.name,vertices:o.geometry.attributes.position.count,skinned:o.isSkinnedMesh,materials:(Array.isArray(o.material)?o.material:[o.material]).map(m=>({name:m.name,map:m.map?.userData.source}))});});
 console.log(JSON.stringify({file:name,size:new T.Box3().setFromObject(rig,true).getSize(new T.Vector3()).toArray(),meshes,bones,clips:rig.animations.map(a=>({name:a.name,duration:a.duration,tracks:a.tracks.length,rootTracks:a.tracks.filter(t=>/Hips.*position|Armature/i.test(t.name)).map(t=>({name:t.name,start:Array.from(t.values.slice(0,3)),end:Array.from(t.values.slice(-3))}))}))}));
}
