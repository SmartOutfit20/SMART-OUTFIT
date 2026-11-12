const CACHE_NAME='smart-outfit-shell-v5';
const APP_SHELL=['/'];

self.addEventListener('install',event=>{
 event.waitUntil(
  caches.open(CACHE_NAME)
   .then(cache=>cache.addAll(APP_SHELL))
   .then(()=>self.skipWaiting())
 );
});

self.addEventListener('activate',event=>{
 event.waitUntil(
  caches.keys()
   .then(keys=>Promise.all(keys.filter(key=>key.startsWith('smart-outfit-shell-')&&key!==CACHE_NAME).map(key=>caches.delete(key))))
   .then(()=>self.clients.claim())
 );
});

self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;

 // Always ask the server for the latest document first. Use the cached shell only offline.
 if(request.mode==='navigate'){
  event.respondWith(
   fetch(request,{cache:'no-store'})
    .then(response=>{
     if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put('/',copy))}
     return response;
    })
    .catch(()=>caches.match('/'))
  );
  return;
 }

 // Vite assets are fingerprinted; network-first prevents an older cached bundle
 // from appearing after a deployment, while retaining an offline fallback.
 if(url.pathname.startsWith('/assets/')||url.pathname.startsWith('/icons/')||url.pathname==='/manifest.webmanifest'){
  event.respondWith(
   fetch(request,{cache:'no-store'})
    .then(response=>{
     if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy))}
     return response;
    })
    .catch(()=>caches.match(request))
  );
 }
});
