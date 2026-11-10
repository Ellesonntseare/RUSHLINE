import {MAX_DISTANCE} from './logic.js';
import {MAGNET_RADIUS} from './powerups.js';

// Coin rows occupy all three lanes, leaving clear space around obstacles.
export function createCoins(obstacles,finish=MAX_DISTANCE,powerups=[]){
  const coins=[];
  for(let distance=12;distance<finish-5;distance+=6){
    // Reserve the whole track around a power-up so the pickup reads clearly.
    if(powerups.some(item=>Math.abs(item.distance-distance)<9))continue;
    for(let lane=0;lane<3;lane++){
      if(obstacles.some(o=>Math.abs(o.distance-distance)<7||(o.lane===lane&&Math.abs(o.distance-distance)<(o.type==='train'?19:12))))continue;
      coins.push({id:coins.length,lane,distance,z:-distance});
    }
  }
  return coins;
}
export function collectCoins(state,coins,collected){
  const magnet=state.magnetTime>0;
  if(state.airborneHeight>1.4&&!magnet)return [];
  const gained=[];
  for(const coin of coins){
    if(coin.distance<state.distance-(magnet?MAGNET_RADIUS:1.2))continue;
    if(coin.distance>state.distance+(magnet?MAGNET_RADIUS:1.2))break;
    if((magnet||coin.lane===state.lane)&&!collected.includes(coin.id)){collected.push(coin.id);gained.push(coin.id);}
  }
  return gained;
}
