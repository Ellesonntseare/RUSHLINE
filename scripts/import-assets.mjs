import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/assets');
const manifestPath=path.join(root,'manifest.json');
const args=process.argv.slice(2);const available=['character','runner','animations','track','train','barrier','building'];
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
if(args.length===0){console.error('Usage: npm run assets:import -- --character "C:\\models\\runner.glb" --animations "C:\\models\\moves.glb" --track "..." --train "..." --barrier "..." --building "..."');process.exit(1);}
for(let i=0;i<args.length;i+=2){
  const flag=args[i]?.replace(/^--/,'');const src=args[i+1];
  if(!available.includes(flag)||!src||src.startsWith('--')){console.error('Unknown flag or missing path:',args[i]);process.exit(1);}
  const key=flag==='character'?'runner':flag;
  const data=fs.readFileSync(src);
  if(path.extname(src).toLowerCase()!=='.glb'||data.subarray(0,4).toString()!=='glTF'){
    console.error('Only self-contained .glb files supported:',src);process.exit(1);
  }
  const jsonLength=data.readUInt32LE(12);
  if(data.length<20||data.readUInt32LE(4)!==2||data.readUInt32LE(8)!==data.length||data.toString('ascii',16,20)!=='JSON'){console.error('Incomplete or invalid GLB:',src);process.exit(1);}
  const gltf=JSON.parse(data.subarray(20,20+jsonLength).toString('utf8').trim());
  if(key==='runner'&&!((gltf.animations||[]).some(a=>/run|jog|sprint/i.test(a.name||'')))){console.error('This character does not contain a Run/Jog/Sprint animation. Please use an animated GLB.');process.exit(1);}
  const dest=path.join(root,'custom',`${key}.glb`);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,data);
  manifest[key]=`/assets/custom/${key}.glb`;
  console.log('Imported',key,'from',src);
}
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log('Done. Run npm run assets:scan to check your asset setup.');
