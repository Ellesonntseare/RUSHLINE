import {COLLISION_RECOVERY_SECONDS,clamp} from './logic.js';

const BUMP_SECONDS=.55;

export function applyCollisionBump(visual,recovery){
  const elapsed=COLLISION_RECOVERY_SECONDS-recovery;
  const bump=recovery>0&&elapsed>=0&&elapsed<BUMP_SECONDS?
    Math.sin(Math.PI*clamp(elapsed/BUMP_SECONDS,0,1)):0;
  visual.rotation.x=bump?-.32*bump:0;
  visual.rotation.z=.14*bump;
  visual.position.y-=.1*bump;
}

export function collisionRunRate(recovery){return recovery>0?.68:1;}
