import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createHoverboard} from './ride-props.js';

let pulseBoardPromise=null;
let pulseBoardTemplate=null;
export function loadPulseBoard(){
  pulseBoardPromise ||=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
    .loadAsync('/assets/shop/hoverboard-meshopt.bin')
    .then(({scene})=>{
      const bounds=new THREE.Box3().setFromObject(scene),size=bounds.getSize(new THREE.Vector3());
      if(!Number.isFinite(size.x)||size.x<=0)throw Error('The hoverboard model has invalid dimensions.');
      const scale=1.95/size.x,center=bounds.getCenter(new THREE.Vector3());
      const board=new THREE.Group();
      scene.scale.setScalar(scale);
      scene.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
      board.add(scene);board.rotation.y=Math.PI/2;
      board.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true;}});
      pulseBoardTemplate=board;return board;
    }).catch(error=>{pulseBoardPromise=null;throw error;});
  return pulseBoardPromise;
}

export function createBoardStyle(style){
  return style==='pulse-board'?loadPulseBoard().then(board=>board.clone(true)):Promise.resolve(createHoverboard());
}
export function cloneLoadedBoardStyle(style){
  return style==='pulse-board'&&pulseBoardTemplate?pulseBoardTemplate.clone(true):createHoverboard();
}
