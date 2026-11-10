import * as THREE from 'three';
export function createGlideClip(rig,scale){
  const tracks=[],seen=new Set();
  rig.traverse(bone=>{
    if(!bone.isBone||seen.has(bone.name))return;seen.add(bone.name);
    const q=bone.quaternion.clone();
    const turn=(axis,angle)=>q.multiply(new THREE.Quaternion().setFromAxisAngle(axis,angle));
    const x=new THREE.Vector3(1,0,0),z=new THREE.Vector3(0,0,1);
    if(/LeftArm$/.test(bone.name))turn(z,-1.05);
    if(/RightArm$/.test(bone.name))turn(z,1.05);
    if(/ForeArm$/.test(bone.name))turn(x,-.25);
    if(/UpLeg$/.test(bone.name))turn(x,-.26);
    else if(/Leg$/.test(bone.name))turn(x,.52);
    if(/Foot$/.test(bone.name))turn(x,-.26);
    if(/Spine$/.test(bone.name))turn(x,.10);
    tracks.push(new THREE.QuaternionKeyframeTrack(bone.name+'.quaternion',[0,1],[...q.toArray(),...q.toArray()]));
    if(/Hips$/.test(bone.name)){
      const p=bone.position.clone();p.y-=.07/scale;
      tracks.push(new THREE.VectorKeyframeTrack(bone.name+'.position',[0,1],[...p.toArray(),...p.toArray()]));
    }
  });
  return new THREE.AnimationClip('Hoverboard Glide',1,tracks);
}
