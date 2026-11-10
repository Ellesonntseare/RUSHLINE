// The supplied Ch31_nonPBR export has the same geometry and texture atlas as
// Street Runner. Tint clothing meshes separately to make a distinct appearance.
export function applyCityColorway(rig){
  const clothing={Sweater:0x57c6d0,Pants:0x829ac7,Shoes:0xf2d2a1,Collar:0xf2b56c};
  rig.traverse(object=>{
    if(!object.isMesh)return;
    const part=Object.keys(clothing).find(name=>object.name.endsWith(name));
    if(!part)return;
    const tint=material=>{const copy=material.clone();copy.color.setHex(clothing[part]);return copy;};
    object.material=Array.isArray(object.material)?object.material.map(tint):tint(object.material);
  });
}
