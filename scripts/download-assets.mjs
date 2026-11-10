import {mkdir, readFile, rename, unlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {catalog} from './asset-catalog.mjs';

// v0.1.2: Incremental asset recovery; runner from GitHub Contents API first,
// then multiple independent mirrors; support browser-imported or bundled GLBs.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/assets');
const manifestPath=path.join(root,'manifest.json');
const previous=JSON.parse(await readFile(manifestPath,'utf8').catch(()=>'{}'));
const manifest={...previous};
const only=new Set(process.argv.slice(2).filter(s=>s.startsWith('--')).map(s=>s.slice(2)));
let failures=0;
const GITHUB_OWNER='rana-jatin', GITHUB_REPO='avatar-stage';
const GITHUB_PATH='demo/public/models/demo-avatar.glb';
const GITHUB_API=`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}?ref=main`;
const QUATERNIUS_SOURCES=[
  {url:GITHUB_API,format:'github-api',timeout:12000,label:'GitHub Contents API'},
  {url:`https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${GITHUB_REPO}@main/${GITHUB_PATH}`,format:'binary',timeout:12000,label:'jsDelivr CDN'},
  {url:`https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${GITHUB_PATH}`,format:'binary',timeout:12000,label:'GitHub raw'},
];
function getJson(bytes){
  if(bytes.length<20 || bytes.toString('ascii',0,4)!=='glTF' || bytes.readUInt32LE(4)!==2 || bytes.readUInt32LE(8)!==bytes.length || bytes.toString('ascii',16,20)!=='JSON')throw Error('Not a valid GLB version 2 file');
  const len=bytes.readUInt32LE(12);
  if(len>bytes.length-20)throw Error('Incomplete GLB');
  const obj=JSON.parse(bytes.subarray(20,20+len).toString('utf8').trim());
  if(!obj.asset?.version || !Array.isArray(obj.scenes) || !obj.scenes.length)throw Error('Invalid glTF scene');
  return obj;
}
function isValid(bytes,type){
  if(type==='png')return bytes.length>=100 && bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a';
  try{return !!getJson(bytes);}catch{return false;}
}
function hasRun(bytes){return (getJson(bytes).animations||[]).some(a=>/run|jog|sprint/i.test(a.name||''));}
async function fileValid(dest,type,requireRun=false){
  try{const data=await readFile(dest);return isValid(data,type)&&(!requireRun||hasRun(data));}
  catch{return false;}
}
async function fetchPayload(url,format,timeout=12000){
  const ctrl=new AbortController(); const timer=setTimeout(()=>ctrl.abort(),timeout);
  try{
    const response=await fetch(url,{signal:ctrl.signal,headers:{'user-agent':'RUSHLINE-Asset-Installer/1.2','accept':format==='github-api'?'application/vnd.github+json':'application/octet-stream'}});
    if(!response.ok)throw Error(`HTTP ${response.status}`);
    if(format==='github-api'){
      const json=await response.json();
      if(json.encoding!=='base64'||typeof json.content!=='string')throw Error('GitHub API did not return base64 content');
      return Buffer.from(json.content.replace(/\s/g,''),'base64');
    }
    return Buffer.from(await response.arrayBuffer());
  } finally{clearTimeout(timer);}
}
function fetchWithWindowsCurl(url,format,timeout){
  if(process.platform!=='win32')throw Error('curl fallback available on Windows only');
  const temp=path.join(root,'_rushline_curl.tmp');
  try{
    execFileSync('curl.exe',['--fail','--location','--silent','--show-error','--connect-timeout','6','--max-time',String(Math.ceil(timeout/1000)), '--user-agent','RUSHLINE-Asset-Installer/1.2','--output',temp,url],{timeout:timeout+3000,stdio:'pipe'});
    const fs=requireNodeFsSync();
    const result=fs.readFileSync(temp);
    if(format==='github-api'){
      const json=JSON.parse(result.toString('utf8'));
      return Buffer.from(json.content.replace(/\s/g,''),'base64');
    }
    return result;
  }finally{try{requireNodeFsSync().unlinkSync(temp);}catch{}}
}
// Loading fs synchronously only for the optional Windows curl fallback.
import * as fsSync from 'node:fs';
function requireNodeFsSync(){return fsSync;}
async function obtain(url,format,timeout){
  try{return await fetchPayload(url,format,timeout);}
  catch(err){
    if(process.platform!=='win32')throw err;
    console.log(`    Browser/network route failed (${err.message}); trying Windows curl…`);
    return fetchWithWindowsCurl(url,format,timeout);
  }
}
async function installBytes(data,dest,type){
  if(!isValid(data,type))throw Error(`Invalid/incomplete ${type.toUpperCase()} file`);
  await mkdir(path.dirname(dest),{recursive:true});
  const temp=dest+'.download';
  try{await writeFile(temp,data);await rename(temp,dest);}finally{await unlink(temp).catch(()=>{});}
  console.log(`  ✓ ${path.relative(root,dest)} (${Math.round(data.length/1024)} KB)`);
}
async function grab(url,dest,type){
  if(await fileValid(dest,type)){console.log(`  ✓ Reusing ${path.relative(root,dest)}`);return;}
  await installBytes(await obtain(url,'binary',20000),dest,type);
}
async function existingManifestModel(key){
  const rel=manifest[key];
  if(typeof rel!=='string'||!rel.startsWith('/assets/'))return false;
  const dest=path.resolve(root,rel.slice('/assets/'.length));
  if(!dest.startsWith(root+path.sep))return false;
  if(key==='runner'&&manifest.runnerClips?.Run===rel){
    try{
      const model=getJson(await readFile(dest));
      if(model.animations?.some(animation=>animation.channels?.length>0)){
        console.log(`  ✓ Already installed playable runner (${rel})`);
        return true;
      }
    }catch{}
  }
  if(!await fileValid(dest,'glb',key==='runner'))return false;
  console.log(`  ✓ Already installed (${rel})`);return true;
}
async function installRunner(asset){
  // Support bundled character assets or a previous manual download WITHOUT needing a network request.
  const local=[
    {path:'custom/runner.glb',credit:'Your imported animated GLB'},
    {path:'runner/quaternius-animated-human.glb',credit:'Quaternius Animated Human (CC0)'},
    {path:'runner/jordan-run.glb',credit:'Innerscene Jordan (CC0)'},
  ];
  for(const option of local){
    if(await fileValid(path.join(root,option.path),'glb',true)){
      manifest.runner='/assets/'+option.path;
      manifest.runnerCredit=option.credit;
      manifest.runnerScale=1;
      manifest.runnerYaw=option.path.includes("quaternius-animated-human")?-Math.PI/2:(manifest.runnerYaw??0);
      console.log(`  ✓ Reusing animated character: ${option.path}`);
      return true;
    }
  }
  const target=path.join(root,'runner/quaternius-animated-human.glb');
  console.log('  Looking for an animated CC0 character (Run / Jump / Idle)');
  for(const source of QUATERNIUS_SOURCES){
    try{
      console.log(`  Trying ${source.label}…`);
      const bytes=await obtain(source.url,source.format,source.timeout);
      if(!hasRun(bytes))throw Error('Model has no Run/Jog/Sprint animation');
      await installBytes(bytes,target,'glb');
      manifest.runner='/assets/runner/quaternius-animated-human.glb';
      manifest.runnerCredit='Quaternius Animated Human (CC0)';
      manifest.runnerSource='https://github.com/rana-jatin/avatar-stage/blob/main/demo/public/models/MODEL_LICENSE.md';
      manifest.runnerScale=1;manifest.runnerYaw=-Math.PI/2;manifest.animations=null;
      return true;
    }catch(e){console.log(`  ✗ ${source.label}: ${e.message}`);}
  }
  // Original Jordan provider is optional because its direct API previously failed.
  console.log('  All mirror routes failed. You can import a downloaded CC0 animated GLB using IMPORT-RUNNER.bat.');
  return false;
}
for(const [key,asset] of Object.entries(catalog)){
  if(only.size&&!only.has(key))continue;
  console.log(`\n${key.toUpperCase()} — ${asset.credit}`);
  if(await existingManifestModel(key))continue;
  let ok=false;
  try{
    if(key==='runner')ok=await installRunner(asset);
    else{
      const dest=path.join(root,asset.path);
      await grab(asset.url,dest,'glb');
      if(asset.texture)await grab(asset.texture,path.join(path.dirname(dest),'Textures/colormap.png'),'png');
      manifest[key]='/assets/'+asset.path.replace(/\\/g,'/');ok=true;
    }
  }catch(e){console.error(`  ✗ ${e.message}. Source: ${asset.source}`);}
  if(!ok)failures++;
  await mkdir(root,{recursive:true});
  await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
}
if(failures){
  console.error(`\n${failures} asset(s) still missing. Previously downloaded models are preserved.`);
  console.error('Open https://github.com/rana-jatin/avatar-stage/blob/main/demo/public/models/demo-avatar.glb');
  console.error('Click Download raw file. Drag the saved GLB onto IMPORT-RUNNER.bat, then restart.');
  process.exitCode=1;
}else console.log('\n✓ Assets ready. Existing downloads preserved.');
