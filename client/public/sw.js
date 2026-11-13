const CACHE_NAME='smart-outfit-shell-v7';

// Keep navigation documents network-first without serving stale HTML from a
// previous deployment. Render may take longer than a few seconds to wake up.
self.addEventListener('install',event=>{
 event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate',event=>{
 event.waitUntil(
  caches.keys()
   .then(keys=>Promise.all(keys.filter(key=>key.startsWith('smart-outfit-shell-')).map(key=>caches.delete(key))))
   .then(()=>self.clients.claim())
 );
});

self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||request.mode!=='navigate')return;

 event.respondWith(
  fetch(request,{cache:'no-store'})
   .catch(()=>new Response(
    '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SMART OUTFIT</title><body style="font:16px system-ui;padding:32px;color:#173d2d"><h2>আপনার ইন্টারনেট সংযোগ পাওয়া যাচ্ছে না</h2><p>সংযোগ ঠিক হলে আবার চেষ্টা করুন।</p><button onclick="location.reload()">আবার চেষ্টা করুন</button></body></html>',
    {status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}}
   ))
 );
});
