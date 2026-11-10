const installButton=document.getElementById('installApp');
const installHelp=document.getElementById('installHelp');
let pendingPrompt=null;
const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
installButton.hidden=Boolean(standalone);
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pendingPrompt=event;});
window.addEventListener('appinstalled',()=>{installButton.hidden=true;installHelp.hidden=true;pendingPrompt=null;});
installButton.addEventListener('click',async()=>{
  if(pendingPrompt){await pendingPrompt.prompt();await pendingPrompt.userChoice;pendingPrompt=null;return;}
  installHelp.hidden=false;
  installHelp.textContent=!window.isSecureContext?'Phone installation will be available when the game has a secure HTTPS link. You can play in this browser now.':/iPad|iPhone|iPod/.test(navigator.userAgent)?'In Safari, tap Share, then Add to Home Screen and Open as Web App.':'Open your browser menu and choose Install app or Add to Home Screen. If unavailable, play here and try again after reloading.';
});
if('serviceWorker' in navigator&&window.isSecureContext&&import.meta.env.PROD){
  window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(error=>console.warn('App offline page unavailable:',error)));
}
