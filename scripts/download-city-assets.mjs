import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve('public/assets');
async function getJson(url){const response=await fetch(url);if(!response.ok)throw Error(`${response.status} ${url}`);return response.json();}
async function save(file,asset){
  const target=path.join(root,file);
  await fs.mkdir(path.dirname(target),{recursive:true});
  const bytes=Buffer.from(await (await fetch(asset.url)).arrayBuffer());
  if(bytes.length!==asset.size||crypto.createHash('md5').update(bytes).digest('hex')!==asset.md5)throw Error(`Asset checksum mismatch: ${file}`);
  await fs.writeFile(target,bytes);
  console.log(`${file}: ${bytes.length} bytes`);
}
const facade=(await getJson('https://api.polyhaven.com/files/modular_urban_apartments_facade')).gltf['1k'].gltf;
const dependencies=Object.entries(facade.include||{});
for(const [name,asset] of dependencies)await save(`city-real/${name}`,asset);
await save('city-real/facade.gltf',facade);
const sky=(await getJson('https://api.polyhaven.com/files/urban_street_01')).hdri['1k'].hdr;
await save('sky/urban_street_01_1k.hdr',sky);
