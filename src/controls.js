export function swipeAction(dx,dy,width=390){
  const threshold=Math.max(16,Math.min(28,width*.045));
  const x=Math.abs(dx),y=Math.abs(dy);
  if(Math.max(x,y)<threshold||Math.max(x,y)<Math.min(x,y)*1.3)return null;
  return x>y?(dx<0?'left':'right'):(dy<0?'jump':'slide');
}
export function requestJump(state,speed){
  if(state.verticalSpeed<=0&&(state.airborneHeight<=.05||state.platform!=null)){
    state.platform=null;state.verticalSpeed=speed;state.slide=0;state.jumpBuffer=0;return true;
  }
  state.jumpBuffer=.16;return false;
}
export function consumeJumpBuffer(state,dt,speed){
  if(!(state.jumpBuffer>0))return false;
  if(state.verticalSpeed<=0&&(state.airborneHeight<=.05||state.platform!=null))return requestJump(state,speed);
  state.jumpBuffer=Math.max(0,state.jumpBuffer-dt);return false;
}
