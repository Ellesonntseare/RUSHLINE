import {SHOP_ITEMS} from './shop-catalog.js';
import {createShopPreview} from './shop-preview.js';

const el=id=>document.getElementById(id);

export function setupShop({progress,showPanel,onEconomyChanged,applyBoard}){
  let selected=SHOP_ITEMS[0],preview=null,previewReady=false,selection=0;
  const status=text=>{el('shopMessage').textContent=text;};
  function renderWallet(){
    const coins=progress.snapshot().wallet;
    el('shopBalance').textContent=String(coins);
    el('dailyBalance').textContent=String(coins);
    el('dailyWallet').textContent=`${coins} COINS`;
  }
  function render(){
    const {wallet,owned,equipped}=progress.snapshot();
    renderWallet();
    el('shopItems').replaceChildren(...SHOP_ITEMS.map(item=>{
      const button=document.createElement('button');button.type='button';
      button.className=`shop-item${item.id===selected.id?' is-selected':''}${equipped[item.kind]===item.id?' is-equipped':''}`;
      button.setAttribute('role','listitem');
      const category=document.createElement('span');category.textContent=item.kind==='board'?'3D HOVERBOARD':'FINISH DANCE';
      const name=document.createElement('strong');name.textContent=item.name;
      const price=document.createElement('small');price.textContent=equipped[item.kind]===item.id?'EQUIPPED':owned.includes(item.id)?'OWNED':`${item.price} COINS`;
      button.append(category,name,price);button.addEventListener('click',()=>select(item));return button;
    }));
    el('shopCategory').textContent=selected.kind==='board'?'REAL 3D MODEL':'3D CHARACTER ANIMATION';
    el('shopItemName').textContent=selected.name;
    el('shopItemDescription').textContent=selected.description;
    const action=el('shopAction');
    action.disabled=!previewReady||equipped[selected.kind]===selected.id;
    action.textContent=!previewReady?'LOADING 3D PREVIEW…':equipped[selected.kind]===selected.id?'EQUIPPED':owned.includes(selected.id)?'EQUIP':`BUY FOR ${selected.price} COINS`;
    if(!owned.includes(selected.id)&&wallet<selected.price)action.setAttribute('aria-label',`Buy ${selected.name}; need ${selected.price-wallet} more coins`);
    else action.removeAttribute('aria-label');
  }
  async function select(item){
    selected=item;previewReady=false;const token=++selection;
    status('');el('shopPreviewLabel').textContent='LOADING REAL 3D ASSET…';el('shopPreviewLabel').classList.remove('hidden');render();
    try{
      preview ||=createShopPreview(el('shopPreview'));
      const active=await preview.select(item);
      if(token!==selection||!active)return;
      previewReady=true;el('shopPreviewLabel').classList.add('hidden');render();
    }catch(error){
      if(token!==selection)return;
      previewReady=false;el('shopPreviewLabel').textContent='PREVIEW UNAVAILABLE';
      status(error.message||'This asset could not load.');render();
    }
  }
  el('shopBtn').addEventListener('click',()=>{showPanel('shopPanel');select(selected);});
  el('shopClose').addEventListener('click',()=>showPanel('menu'));
  el('shopAction').addEventListener('click',async()=>{
    if(!previewReady)return;
    const {owned}=progress.snapshot();
    if(owned.includes(selected.id)){
      if(!progress.equip(selected.id))return;
      status(`${selected.name} equipped.`);
    }else{
      const outcome=progress.purchase(selected.id);
      if(!outcome.ok){status(outcome.reason);return;}
      status(`${selected.name} purchased and equipped.`);
    }
    if(selected.kind==='board')await applyBoard(selected.id);
    onEconomyChanged();render();
  });
  el('shopDefaultBoard').addEventListener('click',async()=>{
    progress.equipDefault('board');await applyBoard('standard');status('Standard board equipped.');onEconomyChanged();render();
  });
  el('shopRandomDance').addEventListener('click',()=>{
    progress.equipDefault('dance');status('Random finish dances enabled.');onEconomyChanged();render();
  });
  renderWallet();
  return {renderWallet};
}
