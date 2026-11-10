const CACHE='rushline-shell-v1';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/offline.html','/icons/icon-192.png','/icons/icon-512.png']))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('rushline-shell-')&&key!==CACHE).map(key=>caches.delete(key))))));
// Keep game builds, manifests and large models network-fresh. Do not cache room data.
self.addEventListener('fetch',event=>{
  if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html')));
});
