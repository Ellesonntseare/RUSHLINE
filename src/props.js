import * as THREE from 'three';

export function createMagnetProp(){
  const group=new THREE.Group();
  const steel=new THREE.MeshPhysicalMaterial({color:0xe7f5ff,metalness:1,roughness:.12,clearcoat:1});
  const red=new THREE.MeshPhysicalMaterial({color:0xf23f53,metalness:.55,roughness:.16,clearcoat:1});
  const blue=new THREE.MeshPhysicalMaterial({color:0x269dff,metalness:.55,roughness:.16,clearcoat:1});
  const glow=new THREE.MeshBasicMaterial({color:0x8cefff,transparent:true,opacity:.32,depthWrite:false});
  const arc=new THREE.Mesh(new THREE.TorusGeometry(.42,.125,14,48,Math.PI),steel);
  arc.rotation.z=Math.PI;group.add(arc);
  for(const [x,material] of [[-.42,red],[.42,blue]]){
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(.125,.125,.42,20),material);
    arm.position.set(x,.2,0);group.add(arm);
    const tip=new THREE.Mesh(new THREE.CylinderGeometry(.135,.135,.09,20),steel);
    tip.position.set(x,.43,0);group.add(tip);
  }
  const halo=new THREE.Mesh(new THREE.TorusGeometry(.72,.014,8,64),glow);
  halo.rotation.x=.5;group.add(halo);
  const gem=new THREE.Mesh(new THREE.IcosahedronGeometry(.13,1),new THREE.MeshStandardMaterial({color:0xb7f5ff,emissive:0x39c6ff,emissiveIntensity:1.5,metalness:.6,roughness:.1}));
  group.add(gem);
  group.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  return group;
}

export function createHighJumpProp(){
  const group=new THREE.Group();
  const gold=new THREE.MeshPhysicalMaterial({color:0xffc74e,metalness:.8,roughness:.16,clearcoat:1});
  const sole=new THREE.MeshStandardMaterial({color:0x182d44,metalness:.48,roughness:.32});
  const glow=new THREE.MeshStandardMaterial({color:0x75e9ff,emissive:0x20c9ff,emissiveIntensity:1.3,metalness:.42,roughness:.16});
  const shape=new THREE.Shape();
  shape.moveTo(-.45,-.2);shape.lineTo(.36,-.2);shape.quadraticCurveTo(.6,-.17,.55,-.03);shape.lineTo(.36,.05);shape.lineTo(.1,.3);shape.lineTo(-.38,.25);shape.closePath();
  const boot=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.22,bevelEnabled:true,bevelThickness:.045,bevelSize:.035,bevelSegments:3}),gold);
  group.add(boot);
  const bottom=new THREE.Mesh(new THREE.BoxGeometry(1.05,.08,.32),sole);bottom.position.set(.03,-.26,.11);group.add(bottom);
  for(let i=0;i<3;i++){
    const wing=new THREE.Mesh(new THREE.CapsuleGeometry(.055,.25-i*.045,4,8),glow);
    wing.position.set(-.49-i*.09,.22+i*.08,.12);wing.rotation.z=-.65-i*.15;group.add(wing);
  }
  const arrow=new THREE.Mesh(new THREE.ConeGeometry(.18,.32,4),glow);arrow.position.set(.11,.62,.12);arrow.rotation.z=Math.PI/4;group.add(arrow);
  group.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  return group;
}

export function createShieldProp(){
  const group=new THREE.Group();
  const outline=new THREE.MeshPhysicalMaterial({color:0xbcefff,metalness:.85,roughness:.12,clearcoat:1});
  const face=new THREE.MeshPhysicalMaterial({color:0x1681b8,metalness:.6,roughness:.16,clearcoat:1,emissive:0x075b88,emissiveIntensity:.35});
  const crest=new THREE.Shape();crest.moveTo(0,-.61);crest.bezierCurveTo(-.52,-.35,-.48,.1,-.43,.42);crest.quadraticCurveTo(0,.67,.43,.42);crest.bezierCurveTo(.48,.1,.52,-.35,0,-.61);
  const border=new THREE.Mesh(new THREE.ExtrudeGeometry(crest,{depth:.17,bevelEnabled:true,bevelSize:.05,bevelThickness:.04,bevelSegments:3,curveSegments:12}),outline);
  group.add(border);
  const inset=new THREE.Mesh(new THREE.ExtrudeGeometry(crest,{depth:.035,bevelEnabled:false,curveSegments:12}),face);
  inset.scale.set(.79,.78,1);inset.position.z=.22;group.add(inset);
  const mark=new THREE.Mesh(new THREE.IcosahedronGeometry(.17,0),new THREE.MeshStandardMaterial({color:0xe5ffff,emissive:0x68eeff,emissiveIntensity:1.5,metalness:.5,roughness:.1}));
  mark.position.set(0,.09,.3);group.add(mark);
  group.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  return group;
}

export function createDoubleCoinsProp(coinTemplate){
  const group=new THREE.Group();
  if(coinTemplate)for(const [x,z] of [[-.23,0],[.23,.14]]){
    const coin=coinTemplate.clone(true);coin.scale.setScalar(.7);coin.position.set(x,0,z);group.add(coin);
  }
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.font='900 76px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=9;ctx.strokeStyle='#74420c';ctx.fillStyle='#fff1a0';ctx.strokeText('×2',64,63);ctx.fillText('×2',64,63);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false}));
  sprite.position.set(0,.65,.15);sprite.scale.set(.82,.82,.82);group.add(sprite);
  return group;
}

// A lane-sized maintenance gantry. The low warning panel is the part to roll under.
export function createOverheadGate(){
  const gate=new THREE.Group();
  const steel=new THREE.MeshStandardMaterial({color:0x344550,metalness:.82,roughness:.3});
  const dark=new THREE.MeshStandardMaterial({color:0x14232c,metalness:.7,roughness:.36});
  const yellow=new THREE.MeshStandardMaterial({color:0xffb927,metalness:.38,roughness:.34});
  const lamp=new THREE.MeshStandardMaterial({color:0xffd668,emissive:0xffa822,emissiveIntensity:2.2,metalness:.25,roughness:.24});
  const white=new THREE.MeshStandardMaterial({color:0xd3e4e8,metalness:.75,roughness:.28});
  const add=(geometry,material,x,y,z=0)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;gate.add(mesh);return mesh;};
  const box=(w,h,d,m,x,y,z=0)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z);
  const cyl=(r,h,m,x,y,z=0)=>add(new THREE.CylinderGeometry(r,r,h,10),m,x,y,z);
  for(const x of [-1.22,1.22]){
    box(.27,.11,.67,dark,x,.06);
    box(.16,1.72,.17,steel,x,.9);
    for(const y of [.21,.64,1.1,1.62]){
      box(.21,.07,.22,white,x,y);
      for(const z of [-.13,.13]){const bolt=cyl(.025,.016,dark,x,y,z);bolt.rotation.x=Math.PI/2;}
    }
    box(.3,.16,.32,dark,x,1.72);
    box(.22,.13,.37,yellow,x,1.84);
    const lampMesh=box(.12,.05,.4,lamp,x,1.96);
    lampMesh.castShadow=false;
  }
  // Rounded-top crosspiece and shallow, unmistakable clearance panel.
  box(2.66,.19,.32,steel,0,1.82);
  box(2.36,.48,.15,dark,0,1.49,.12);
  box(2.31,.075,.18,yellow,0,1.235,.13);
  box(2.31,.055,.18,white,0,1.755,.13);
  for(let i=0;i<9;i++){
    const stripe=box(.13,.42,.014,i%2?yellow:steel,-1.01+i*.252,1.49,.204);
    stripe.rotation.z=-.52;
  }
  for(const x of [-1.32,1.32]){
    const brace=box(.075,.47,.15,steel,x*.84,1.59);
    brace.rotation.z=x<0?-.68:.68;
  }
  const signal=box(.48,.14,.045,lamp,0,1.48,.23);signal.castShadow=false;
  box(.53,.19,.05,steel,0,1.48,.205);
  box(.37,.07,.055,lamp,0,1.48,.24);
  return gate;
}
