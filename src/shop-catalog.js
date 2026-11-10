export const SHOP_ITEMS=[
  {id:'pulse-board',kind:'board',name:'PULSE HOVERBOARD',price:180,description:'A sculpted turbine board for every hoverboard pickup.',asset:'/assets/shop/hoverboard-meshopt.bin'},
  {id:'hip-hop',kind:'dance',name:'HIP HOP',price:100,description:'Celebrate your finish with the supplied Hip Hop dance.',clip:'Finish Dance 1',asset:'/assets/user-dances/hip-hop-dancing.json'},
  {id:'twist',kind:'dance',name:'THE TWIST',price:100,description:'Make the supplied Twist dance your finish move.',clip:'Finish Dance 2',asset:'/assets/user-dances/twist-dance.json'},
  {id:'silly',kind:'dance',name:'SILLY DANCE',price:100,description:'Finish with the supplied Silly Dance animation.',clip:'Finish Dance 3',asset:'/assets/user-dances/silly-dancing.json'}
];
export const shopItem=id=>SHOP_ITEMS.find(item=>item.id===id);
