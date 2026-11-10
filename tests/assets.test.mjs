import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';

function glb(animNames=[],withChannels=false){
  const json=Buffer.from(JSON.stringify({asset:{version:'2.0'},scenes:[{nodes:[]}],scene:0,animations:animNames.map(name=>({name,channels:withChannels?[{sampler:0,target:{node:0,path:'rotation'}}]:[],samplers:[]}))}));
  const aligned=(json.length+3)&~3;
  const file=Buffer.alloc(20+aligned,32);
  file.write('glTF',0);file.writeUInt32LE(2,4);file.writeUInt32LE(file.length,8);
  file.writeUInt32LE(aligned,12);file.write('JSON',16);json.copy(file,20);
  return file;
}
test('installer recovers successful files and switches to authentic CC0 runner backup',async()=>{
  const base=await mkdtemp(path.join(tmpdir(),'rushline-assets-'));
  try {
    const src=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../scripts');
    const dst=path.join(base,'scripts');const assets=path.join(base,'public/assets');
    await mkdir(dst,{recursive:true});await mkdir(assets,{recursive:true});
    for(const f of ['download-assets.mjs','asset-catalog.mjs'])await copyFile(path.join(src,f),path.join(dst,f));
    const manifest={runner:null,animations:null,track:null,train:null,barrier:null,building:null};
    await writeFile(path.join(assets,'manifest.json'),JSON.stringify(manifest));
    for(const [folder,name] of [['track','track-single-detailed'],['train','train-electric-subway-a'],['barrier','construction-barrier'],['building','building-skyscraper-a']]){
      await mkdir(path.join(assets,folder,'Textures'),{recursive:true});
      await writeFile(path.join(assets,folder,name+'.glb'),glb());
      const png=Buffer.alloc(100);Buffer.from('89504e470d0a1a0a','hex').copy(png);
      await writeFile(path.join(assets,folder,'Textures/colormap.png'),png);
    }
    const runner=glb(['Run','Jump','Idle']);
    await writeFile(path.join(base,'mock.mjs'),`globalThis.fetch=async url=>{if(String(url).includes('api.github.com'))return new Response(JSON.stringify({encoding:'base64',content:'${runner.toString('base64')}'}),{status:200}); throw Error('Other mirrors unavailable')};`);
    const script=path.join(dst,'download-assets.mjs');
    const output=execFileSync(process.execPath,['--import',pathToFileURL(path.join(base,'mock.mjs')).href,script],{encoding:'utf8',timeout:10000});
    assert.match(output,/GitHub Contents API/);
    assert.match(output,/Reusing track/);
    const saved=JSON.parse(await readFile(path.join(assets,'manifest.json'),'utf8'));
    assert.match(saved.runner,/quaternius-animated-human\.glb/);
    for(const key of ['track','train','barrier','building']) assert.ok(saved[key]?.includes('/assets/'));
    // Repeat install with failed network: all existing model files are retained.
    await writeFile(path.join(base,'mock.mjs'),`globalThis.fetch=async()=>{throw Error('No network access')}`);
    execFileSync(process.execPath,['--import',pathToFileURL(path.join(base,'mock.mjs')).href,script],{encoding:'utf8',timeout:10000});
  } finally {await rm(base,{recursive:true,force:true});}
});

test('asset installer preserves the runner used by the gameplay animation clips',async()=>{
  const base=await mkdtemp(path.join(tmpdir(),'rushline-runner-'));
  try{
    const src=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../scripts');
    const scripts=path.join(base,'scripts'),assets=path.join(base,'public/assets'),model=path.join(assets,'optimized/classic-meshopt.bin');
    await mkdir(scripts,{recursive:true});await mkdir(path.dirname(model),{recursive:true});
    for(const file of ['download-assets.mjs','asset-catalog.mjs'])await copyFile(path.join(src,file),path.join(scripts,file));
    await writeFile(model,glb(['Armature|Layer0'],true));
    const runner='/assets/optimized/classic-meshopt.bin';
    await writeFile(path.join(assets,'manifest.json'),JSON.stringify({runner,runnerClips:{Run:runner}}));
    const output=execFileSync(process.execPath,[path.join(scripts,'download-assets.mjs'),'--runner'],{encoding:'utf8',timeout:10000});
    assert.match(output,/Already installed playable runner/);
    const saved=JSON.parse(await readFile(path.join(assets,'manifest.json'),'utf8'));
    assert.equal(saved.runner,saved.runnerClips.Run);
  }finally{await rm(base,{recursive:true,force:true});}
});
