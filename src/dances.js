// Keep each runner's celebration stable throughout a race, while spreading
// different dances across the available players.
export function danceIndexForRunner(identity,count){
  if(!Number.isInteger(count)||count<1)return -1;
  let hash=2166136261;
  for(const character of String(identity))hash=Math.imul(hash^character.charCodeAt(0),16777619);
  return (hash>>>0)%count;
}

export function danceDuration(clip){
  return Math.min(8,Math.max(2,clip?.duration||0));
}
