const coinPool=Array.from({length:6},()=>{
  const sound=new Audio('/assets/audio/coin-pickup.wav');
  sound.preload='auto';sound.volume=.28;return sound;
});
const victory=new Audio('/assets/audio/victory-jingle.ogg');
victory.preload='auto';victory.volume=.4;victory.loop=true;
let coinIndex=0,lastCoin=0;

export function playCoin(){
  const now=performance.now();
  if(now-lastCoin<55)return;
  lastCoin=now;
  const sound=coinPool[coinIndex++%coinPool.length];
  sound.pause();sound.currentTime=0;sound.playbackRate=.94+(coinIndex%4)*.055;
  sound.play().catch(()=>{});
}

export function playVictory(){
  victory.pause();victory.currentTime=0;
  victory.play().catch(()=>{});
}

export function stopVictory(){victory.pause();victory.currentTime=0;}
