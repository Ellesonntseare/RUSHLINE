import {shopItem} from './shop-catalog.js';

export const DAILY_STORAGE_KEY='rushline-daily-v1';
const defaults={board:'standard',dance:'random'};

export function localDay(date){
  const year=date.getFullYear(),month=String(date.getMonth()+1).padStart(2,'0'),day=String(date.getDate()).padStart(2,'0');
  return `${year}-${month}-${day}`;
}

export function dailyGoals(date){
  const dayNumber=Math.floor(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000);
  return [
    {id:'coins',title:'COLLECT COINS',target:[30,40,50][dayNumber%3],reward:25,unit:'coins'},
    {id:'distance',title:'RUN THE CITY',target:[600,800,1000][dayNumber%3],reward:40,unit:'m'},
    {id:'clean',title:'CLEAN FINISH',target:1,reward:60,unit:'finish'}
  ];
}

export function createDailyChallenges(storage,now=()=>new Date()){
  let saved;
  try{saved=JSON.parse(storage.getItem(DAILY_STORAGE_KEY)||'null');}catch{saved=null;}
  const wallet=Number.isSafeInteger(saved?.wallet)&&saved.wallet>=0?saved.wallet:0;
  let state={day:'',wallet,progress:{coins:0,distance:0,clean:0},claimed:[],owned:[],equipped:{...defaults}};
  if(saved&&typeof saved==='object')state={
    day:typeof saved.day==='string'?saved.day:'',wallet,
    progress:Object.fromEntries(['coins','distance','clean'].map(id=>[id,Math.max(0,Number(saved.progress?.[id])||0)])),
    claimed:Array.isArray(saved.claimed)?saved.claimed.filter(id=>['coins','distance','clean'].includes(id)):[],
    owned:Array.isArray(saved.owned)?[...new Set(saved.owned.filter(id=>shopItem(id)))]:[],
    equipped:{...defaults,...(saved.equipped&&typeof saved.equipped==='object'?saved.equipped:{})}
  };
  for(const kind of ['board','dance'])if(state.equipped[kind]!==defaults[kind]&&(!state.owned.includes(state.equipped[kind])||shopItem(state.equipped[kind])?.kind!==kind))state.equipped[kind]=defaults[kind];
  const persist=()=>{try{storage.setItem(DAILY_STORAGE_KEY,JSON.stringify(state));}catch{/* Private storage may be unavailable. */}};
  function refresh(){
    const today=now(),day=localDay(today);
    if(state.day!==day){state={...state,day,progress:{coins:0,distance:0,clean:0},claimed:[]};persist();}
    return dailyGoals(today);
  }
  function snapshot(){
    const goals=refresh();
    return {day:state.day,wallet:state.wallet,owned:[...state.owned],equipped:{...state.equipped},challenges:goals.map(goal=>({
      ...goal,progress:Math.min(goal.target,Math.max(0,Number(state.progress?.[goal.id])||0)),
      complete:Array.isArray(state.claimed)&&state.claimed.includes(goal.id)
    }))};
  }
  function record({coins=0,meters=0,cleanFinish=false}={}){
    const goals=refresh();
    const additions={coins, distance:meters, clean:cleanFinish?1:0};
    let changed=false;
    const completed=[];
    for(const goal of goals){
      const amount=additions[goal.id];
      if(!Number.isFinite(amount)||amount<=0)continue;
      const previous=Math.max(0,Number(state.progress?.[goal.id])||0);
      const next=Math.min(goal.target,previous+amount);
      if(next===previous)continue;
      state.progress[goal.id]=next;changed=true;
      if(next>=goal.target&&!state.claimed.includes(goal.id)){
        state.claimed.push(goal.id);state.wallet=Math.min(Number.MAX_SAFE_INTEGER,state.wallet+goal.reward);completed.push(goal);
      }
    }
    if(changed)persist();
    return completed;
  }
  function creditCoins(count){
    refresh();
    if(!Number.isSafeInteger(count)||count<=0)return state.wallet;
    state.wallet=Math.min(Number.MAX_SAFE_INTEGER,state.wallet+count);persist();return state.wallet;
  }
  function purchase(id){
    refresh();
    const item=shopItem(id);
    if(!item)return {ok:false,reason:'Item unavailable.'};
    if(state.owned.includes(id))return {ok:false,reason:'Already owned.'};
    if(state.wallet<item.price)return {ok:false,reason:`Need ${item.price-state.wallet} more coins.`};
    state.wallet-=item.price;state.owned.push(id);state.equipped[item.kind]=id;persist();
    return {ok:true,item};
  }
  function equip(id){
    refresh();
    const item=shopItem(id);
    if(!item||!state.owned.includes(id))return false;
    state.equipped[item.kind]=id;persist();return true;
  }
  function equipDefault(kind){
    refresh();
    if(!Object.hasOwn(defaults,kind))return false;
    state.equipped[kind]=defaults[kind];persist();return true;
  }
  return {snapshot,record,creditCoins,purchase,equip,equipDefault};
}
