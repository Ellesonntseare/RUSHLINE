import fs from 'node:fs';
import path from 'node:path';
import {AnimationClip} from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';

// FBXLoader only needs image placeholders to inspect the embedded animation.
// Textures belong to the character model and are deliberately omitted here.
globalThis.window={URL:{createObjectURL:()=>''}};
globalThis.document={createElementNS:()=>({addEventListener(){},removeEventListener(){},set src(_) {}})};

const [input,output,name,hipHeight='74.528839']=process.argv.slice(2);
if(!input||!output||!name)throw new Error('Usage: node scripts/extract-fbx-animation.mjs input.fbx output.json ClipName [hipHeight]');
if(!fs.existsSync(input)||input.endsWith('.crdownload'))throw new Error('Input FBX has not finished downloading.');
const source=fs.readFileSync(input);
const scene=new FBXLoader().parse(source.buffer.slice(source.byteOffset,source.byteOffset+source.byteLength),'');
const clip=scene.animations.find(a=>a.tracks.length&&a.duration>0)?.clone();
if(!clip)throw new Error('No animation tracks found in '+input);
clip.name=name;
for(const track of clip.tracks){
  track.name=track.name.replace(/^mixamorig\d+/,'mixamorig');
  if(/Hips\.position$/.test(track.name)){
    const sourceHipHeight=track.values[1];
    for(let i=0;i<track.values.length;i+=3){
      track.values[i]=0;
      track.values[i+1]+=Number(hipHeight)-sourceHipHeight;
      track.values[i+2]=0;
    }
  }
}
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(AnimationClip.toJSON(clip)));
console.log(`${name}: ${clip.duration.toFixed(2)}s, ${clip.tracks.length} tracks, ${fs.statSync(output).size} bytes`);
