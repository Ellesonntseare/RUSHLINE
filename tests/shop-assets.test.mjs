import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {SHOP_ITEMS} from '../src/shop-catalog.js';

test('every purchasable look has its playable 3D asset installed',()=>{
  for(const item of SHOP_ITEMS){
    const path=new URL(`../public${item.asset}`,import.meta.url);
    assert.ok(statSync(path).size>1000,`${item.id} is missing its asset`);
    if(item.kind==='board'){
      assert.equal(readFileSync(path).toString('ascii',0,4),'glTF');
    }else{
      const clip=JSON.parse(readFileSync(path,'utf8'));
      assert.ok(clip.tracks?.length>0,`${item.id} has no animation tracks`);
    }
  }
});
