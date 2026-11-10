import {Box3,Vector3} from 'three';

// Skinning needs current bone world matrices before a precise geometry measurement.
// Keep scale outside the animated rig so animation tracks cannot replace it.
export function normalizeRunner(rig,visual,extraScale=1){
  // Measure in model space, independent of the previous skin, player height,
  // hoverboard offset or camera-facing rotation on the reused visual group.
  const parent=rig.parent;
  parent?.remove(rig);
  let bounds;
  try{rig.updateMatrixWorld(true);bounds=new Box3().setFromObject(rig,true);}
  finally{parent?.add(rig);}

  const height=bounds.getSize(new Vector3()).y;
  if(!Number.isFinite(height)||height<=.001||!Number.isFinite(extraScale)||extraScale<=0)
    throw new Error('The runner asset has invalid dimensions or scale.');
  const scale=1.85*extraScale/height;
  visual.scale.setScalar(scale);
  rig.position.y-=bounds.min.y;
  return scale;
}
