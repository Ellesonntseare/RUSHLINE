export const LANES = [-2.7, 0, 2.7];
export const DEFAULT_SPEED = 14;
export const MAX_DISTANCE = 600;
export const COLLISION_RECOVERY_SECONDS = 3;
export const ROLL_DURATION = 1.12;
export const TRAIN_HIT_DISTANCE = 7.25;
export const TRAIN_ROOF_HEIGHT = 3.1;
export const TRAIN_RAMP_LENGTH = 5;

export function clamp(value, low, high) { return Math.min(high, Math.max(low, value)); }
export function nextLane(lane, dir) { return clamp(lane + Math.sign(dir), 0, LANES.length - 1); }
export function makeRng(seed) {
  let state = (seed >>> 0) || 1;
  return () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; };
}
export function createObstacles(seed, count = 100) {
  const rnd = makeRng(seed); const obstacles = []; let distance = 43;
  for (let i=0; i<count; i++) {
    distance += 15 + rnd() * 9;
    const lane = i===0 ? 1 : Math.floor(rnd() * 3);
    const choice = rnd();
    const type = i===0 ? 'overhead' : choice < .30 ? 'train' : choice < .65 ? 'barrier' : 'overhead';
    const previous=obstacles.findLast(o=>o.lane===lane);
    if(previous){
      const back=previous.type==='train'?TRAIN_HIT_DISTANCE:1.7;
      const approach=type==='train'?TRAIN_HIT_DISTANCE+TRAIN_RAMP_LENGTH:1.7;
      distance=Math.max(distance,previous.distance+back+approach+2);
    }
    obstacles.push({ id:i, lane, type, z:-distance, distance, hit:false });
  }
  return obstacles;
}
export function hitsObstacle(player, obstacle) {
  if (obstacle.hit || player.lane !== obstacle.lane) return false;
  if(obstacle.type==='train'&&((player.platform!=null&&player.platform===obstacle.id)||player.airborneHeight>=TRAIN_ROOF_HEIGHT-.05))return false;
  const dz = Math.abs(player.z - obstacle.z);
  if (dz > (obstacle.type==='train' ? TRAIN_HIT_DISTANCE : obstacle.type==='overhead' ? 1.7 : 1.25)) return false;
  if (obstacle.type==='barrier') return player.airborneHeight <= 0.85;
  if (obstacle.type==='overhead') return player.airborneHeight > .15 || !(player.slide > 0 || player.slideRemaining > 0);
  return true;
}
export function resolveObstacleHit(player,obstacle){
  obstacle.hit=true;
  if(player.shieldCharges>0){player.shieldCharges--;return 'shield';}
  player.recovery=COLLISION_RECOVERY_SECONDS;
  return 'hit';
}
export function trainSurfaceHeight(distance,train){
  return TRAIN_ROOF_HEIGHT*clamp((distance-(train.distance-TRAIN_HIT_DISTANCE-TRAIN_RAMP_LENGTH))/TRAIN_RAMP_LENGTH,0,1);
}
export function updateTrainRoof(state,obstacles){
  if(state.platform!==null&&state.platform!==undefined){
    const current=obstacles.find(o=>o.id===state.platform);
    if(current&&state.lane===current.lane&&state.distance<current.distance+TRAIN_HIT_DISTANCE-.5){
      state.airborneHeight=trainSurfaceHeight(state.distance,current);state.verticalSpeed=0;return;
    }
    state.platform=null;state.verticalSpeed=0;
  }
  if(state.verticalSpeed>0)return;
  const landing=obstacles.find(o=>o.type==='train'&&!o.hit&&o.lane===state.lane&&state.distance>=o.distance-TRAIN_HIT_DISTANCE&&state.distance<o.distance+TRAIN_HIT_DISTANCE-.5);
  if(landing&&state.airborneHeight>=TRAIN_ROOF_HEIGHT-.3&&state.airborneHeight<=TRAIN_ROOF_HEIGHT+.1){state.platform=landing.id;state.airborneHeight=TRAIN_ROOF_HEIGHT;state.verticalSpeed=0;return;}
  const ramp=obstacles.find(o=>o.type==='train'&&!o.hit&&o.lane===state.lane&&
    state.distance>=o.distance-TRAIN_HIT_DISTANCE-TRAIN_RAMP_LENGTH&&state.distance<o.distance-TRAIN_HIT_DISTANCE);
  if(ramp&&state.verticalSpeed<=0&&state.airborneHeight<=trainSurfaceHeight(state.distance,ramp)+.25){
    state.platform=ramp.id;state.airborneHeight=trainSurfaceHeight(state.distance,ramp);state.verticalSpeed=0;return;
  }
  if(state.airborneHeight<.65)return;
  const train=obstacles.find(o=>o.type==='train'&&!o.hit&&o.lane===state.lane&&
    o.distance-state.distance<=TRAIN_HIT_DISTANCE&&o.distance-state.distance>TRAIN_HIT_DISTANCE-3);
  if(train){state.platform=train.id;state.airborneHeight=TRAIN_ROOF_HEIGHT;state.verticalSpeed=0;}
}
export function runStep(state, dt) {
  if (!Number.isFinite(dt) || dt <= 0) return state;
  const step = clamp(dt, 0, .05);
  const recovering = state.recovery > 0;
  const boostFraction=Math.min(step,Math.max(0,state.hoverboardTime||0))/step;
  const speed = state.speed * (recovering ? .42 : 1) * (1+.35*boostFraction);
  if(state.platform!==null&&state.platform!==undefined)return {
    ...state,z:state.z-speed*step,distance:state.distance+speed*step,
    recovery:Math.max(0,state.recovery-step),airborneHeight:TRAIN_ROOF_HEIGHT,verticalSpeed:0,
  };
  // Semi-implicit Euler with a ground constraint: never accumulate negative height.
  const newVy = state.verticalSpeed - 22 * step;
  const newHeight = Math.max(0, state.airborneHeight + newVy * step);
  const landed = newHeight === 0 && newVy < 0;
  return {
    ...state,
    z: state.z - speed * step,
    distance: state.distance + speed * step,
    recovery: Math.max(0, state.recovery - step),
    airborneHeight: newHeight,
    verticalSpeed: landed ? 0 : newVy,
  };
}
