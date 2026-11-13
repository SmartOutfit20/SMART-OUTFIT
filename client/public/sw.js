const CACHE_NAME='smart-outfit-shell-v7';
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
  event.respondWith((async()=>{
   const controller=new AbortController();
   let timeoutId;
   try{
    const network=fetch(request,{cache:'no-store',signal:controller.signal});
    const timeout=new Promise((_,reject)=>{timeoutId=setTimeout(()=>{controller.abort();reject(new Error('Navigation request timed out'))},4500)});
    const response=await Promise.race([network,timeout]);
    if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put('/',copy)).catch(()=>{})}
    return response;
   }catch(error){
    const cached=await caches.match('/');
    if(cached)return cached;
    return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SMART OUTFIT</title><body style="font:16px system-ui;padding:32px;color:#173d2d"><h2>SMART OUTFIT is taking longer to connect</h2><p>Please check your connection and try again.</p><button onclick="location.reload()">Reload website</button></body></html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
   }finally{if(timeoutId)clearTimeout(timeoutId)}
  })());
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
