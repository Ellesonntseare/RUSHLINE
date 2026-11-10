import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve('public/assets/ground');
for(const id of ['asphalt_02','concrete_pavement_02']){
  const response=await fetch(`https://api.polyhaven.com/files/${id}`);
  if(!response.ok)throw Error(`Poly Haven API failed for ${id}: ${response.status}`);
  const files=await response.json();
  for(const [key,label] of [['Diffuse','diff'],['nor_gl','normal'],['Rough','rough']]){
    const asset=files[key]['1k'].jpg;
    const download=await fetch(asset.url);
    if(!download.ok)throw Error(`${download.status} ${asset.url}`);
    const bytes=Buffer.from(await download.arrayBuffer());
    if(bytes.length!==asset.size||crypto.createHash('md5').update(bytes).digest('hex')!==asset.md5)throw Error(`Ground texture checksum mismatch: ${id}/${label}`);
    await fs.mkdir(root,{recursive:true});
    await fs.writeFile(path.join(root,`${id}_${label}.jpg`),bytes);
    console.log(`${id}_${label}.jpg: ${bytes.length} bytes`);
  }
}
