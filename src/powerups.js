import {MAX_DISTANCE} from './logic.js';

export const MAGNET_SECONDS=9;
export const HIGH_JUMP_SECONDS=9;
export const DOUBLE_COINS_SECONDS=9;
export const MAGNET_RADIUS=10;
export const JUMP_SPEED=8.25;
export const HIGH_JUMP_SPEED=12.1;
export const HOVERBOARD_SECONDS=9;
const TYPES=['hoverboard','magnet','highJump','doubleCoins','shield','mystery'];
const MYSTERY_REWARDS=['coins','magnet','highJump','doubleCoins','shield'];

// The same placements and rewards are used by the solo client and race server.
export function createPowerups(obstacles,seed=0){
  const items=[];
  for(let i=0,target=35;target<MAX_DISTANCE-12;i++,target+=55){
    let placement=null;
    for(let step=0;step<=30&&!placement;step++){
      const distance=target+(step%2?Math.ceil(step/2):-step/2);
      if(distance<12||distance>=MAX_DISTANCE-12||distance<(items.at(-1)?.distance??-100)+40)continue;
      const clear=[0,1,2].filter(lane=>!obstacles.some(o=>Math.abs(o.distance-distance)<8||(o.lane===lane&&Math.abs(o.distance-distance)<(o.type==='train'?19:13))));
      if(clear.length)placement={distance,lane:clear[(Math.imul(seed^i,1664525)>>>0)%clear.length]};
    }
    if(!placement)continue;
    const {distance,lane}=placement,type=TYPES[items.length%TYPES.length];
    const reward=type==='mystery'?MYSTERY_REWARDS[(Math.imul(seed^i,1103515245)>>>0)%MYSTERY_REWARDS.length]:type;
    items.push({id:i,type,reward,lane,distance,z:-distance});
  }
  return items;
}

export function collectPowerups(state,items,collected){
  const rewards=[];
  for(const item of items){
    if(item.distance<state.distance-1.4)continue;
    if(item.distance>state.distance+1.4)break;
    if(item.lane!==state.lane||collected.includes(item.id))continue;
    collected.push(item.id);
    const reward=item.reward??(item.type==='mystery'?(item.id%4===1?'magnet':'coins'):item.type);
    if(reward==='magnet')state.magnetTime=MAGNET_SECONDS;
    else if(reward==='highJump')state.highJumpTime=HIGH_JUMP_SECONDS;
    else if(reward==='doubleCoins')state.doubleCoinsTime=DOUBLE_COINS_SECONDS;
    else if(reward==='hoverboard')state.hoverboardTime=HOVERBOARD_SECONDS;
    else if(reward==='shield')state.shieldCharges=1;
    else state.bonusCoins=(state.bonusCoins||0)+10;
    rewards.push(reward);
  }
  return rewards;
}

export function tickPowerups(state,seconds){
  for(const key of ['hoverboardTime','magnetTime','highJumpTime','doubleCoinsTime'])state[key]=Math.max(0,(state[key]||0)-seconds);
}

export function jumpSpeed(state){return state.highJumpTime>0?HIGH_JUMP_SPEED:JUMP_SPEED;}
