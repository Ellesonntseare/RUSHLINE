import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve('source-assets');
async function json(url){const response=await fetch(url);if(!response.ok)throw Error(`${response.status} ${url}`);return response.json();}
async function save(relative,asset){
  const target=path.join(root,relative);
  await fs.mkdir(path.dirname(target),{recursive:true});
  const response=await fetch(asset.url);
  if(!response.ok)throw Error(`${response.status} ${asset.url}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length!==asset.size||crypto.createHash('md5').update(bytes).digest('hex')!==asset.md5)throw Error(`Checksum mismatch: ${relative}`);
  await fs.writeFile(target,bytes);
  console.log(`${relative}: ${bytes.length} bytes`);
}
for(const id of ['painted_wooden_bench','industrial_wall_sconce','modular_industrial_pipes_01','concrete_road_barrier_02']){
  const model=(await json(`https://api.polyhaven.com/files/${id}`)).gltf['1k'].gltf;
  await Promise.all(Object.entries(model.include||{}).map(([relative,asset])=>save(`route-source/${id}/${relative}`,asset)));
  await save(`route-source/${id}/${id}.gltf`,model);
}
