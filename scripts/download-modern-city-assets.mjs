import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve('public/assets');
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
for(const id of ['fire_hydrant','metal_trash_can','modular_street_seating']){
  const model=(await json(`https://api.polyhaven.com/files/${id}`)).gltf['1k'].gltf;
  for(const [relative,asset] of Object.entries(model.include||{}))await save(`city-props/${id}/${relative}`,asset);
  await save(`city-props/${id}/${id}.gltf`,model);
}
const sky=(await json('https://api.polyhaven.com/files/kloppenheim_03_puresky')).hdri['1k'].hdr;
await save('sky/kloppenheim_03_puresky_1k.hdr',sky);
