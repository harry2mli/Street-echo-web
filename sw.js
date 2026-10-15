const CACHE='street-echo-web-v1';
const CORE=['./','./index.html','./style.css','./manifest.webmanifest','./src/main.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(url.origin===location.origin){
    event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{
      const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;
    }).catch(()=>caches.match('./index.html'))));
  }
});
