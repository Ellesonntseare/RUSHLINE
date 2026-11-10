import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/assets');
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
let bad=0;
for(const key of ['runner','animations','track','train','barrier','building']){
  if(!manifest[key]){console.log(`${key}: ${key==='animations'?'optional':'MISSING'}`);if(key!=='animations')bad++;continue;}
  const filename=path.join(root,manifest[key].replace(/^\/assets\//,''));
  try{
    const data=await readFile(filename);
    if(data.toString('ascii',0,4)!=='glTF')throw Error('Not a binary GLB');
    const chunkLength=data.readUInt32LE(12), chunkType=data.toString('ascii',16,20);
    if(chunkType!=='JSON')throw Error('Invalid GLB JSON chunk');
    const json=JSON.parse(data.subarray(20,20+chunkLength).toString('utf8').trim());
    console.log(`${key}: OK • ${(data.length/1024/1024).toFixed(1)}MB • ${json.meshes?.length||0} meshes • ${json.animations?.length||0} animations`);
    if(key==='runner'&&!manifest.animations&&!(json.animations||[]).some(a=>/run|jog|sprint/i.test(a.name||''))){console.log('  WARNING: no Run clip found; replace runner or add an animations GLB.');bad++;}
    if(key==='animations'&&!(json.animations||[]).length){console.log('  WARNING: no animation clips.');bad++;}
  }catch(error){bad++;console.log(`${key}: ERROR (${error.message})`);}
}
process.exitCode=bad?1:0;
