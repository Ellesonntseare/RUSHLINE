const origin=process.argv[2]||'http://127.0.0.1:5174';
const manifest=await (await fetch(`${origin}/assets/manifest.json?check=${Date.now()}`,{signal:AbortSignal.timeout(15000)})).json();
const paths=[manifest.runner,manifest.track,manifest.train,manifest.barrier,manifest.coin,manifest.mystery,...Object.entries(manifest.ground).filter(([name])=>name.endsWith('_diff')).map(([,path])=>path),...Object.values(manifest.runnerClips||{}).filter(path=>path!==manifest.runner)];
const results=[];
let cursor=0;
await Promise.all(Array.from({length:3},async()=>{while(cursor<paths.length){
  const path=paths[cursor++];
  try{
  const began=Date.now(),response=await fetch(origin+path,{signal:AbortSignal.timeout(90000)});
  if(!response.ok)throw Error(`${response.status} ${path}`);
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength<100)throw Error(`Empty asset: ${path}`);
  results.push({status:'fulfilled',value:`${response.status} ${Math.round(bytes.byteLength/1024)} KiB ${((Date.now()-began)/1000).toFixed(1)}s ${path}`});
  }catch(reason){results.push({status:'rejected',reason});}
}}));
let failed=false;
for(const item of results){
  if(item.status==='fulfilled')console.log(item.value);
  else{console.error(item.reason);failed=true;}
}
if(failed)process.exitCode=1;
