const CACHE="targetku-cache-v6";
const ASSETS=["./","./index.html","./styles.css","./app.js","./manifest.webmanifest","./icon.svg"];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET") return;
  const url=new URL(event.request.url);
  if(url.pathname.startsWith("/api/")) return;
  event.respondWith(
    caches.match(event.request).then(cached=>cached || fetch(event.request).then(response=>{
      if(response.ok && response.type!=="opaque"){
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      }
      return response;
    }).catch(()=>caches.match("./index.html")))
  );
});

self.addEventListener("push",event=>{
  let data={};
  try{ data=event.data ? event.data.json() : {}; }
  catch(_){ data={body:event.data ? event.data.text() : "Ada pengingat baru."}; }

  const title=data.title || "TARGETKU • Pengingat";
  const options={
    body:data.body || "Ada target yang perlu kamu cek.",
    icon:data.icon || "./icon-192.png",
    badge:data.badge || "./icon-192.png",
    tag:data.tag || "targetku-reminder",
    renotify:Boolean(data.renotify),
    requireInteraction:Boolean(data.requireInteraction),
    data:{url:data.url || "./",targetId:data.targetId || null}
  };

  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const targetUrl=event.notification.data?.url || "./";
  event.waitUntil(
    clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
      for(const client of list){
        if("focus" in client){
          try{ client.navigate(targetUrl); }catch(_){ }
          return client.focus();
        }
      }
      if(clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
