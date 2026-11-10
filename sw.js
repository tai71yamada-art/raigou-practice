/* 雷轟 練習アプリ：オフライン用のサービスワーカー
   アプリ本体はキャッシュ優先、Google Fonts は使ったときに保存して次回からオフラインでも使う。
   アプリを更新したら VERSION を変えると、古いキャッシュが入れ替わる。 */
const VERSION = 'raigou-v51';
const CORE = ['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './bgm.mp3', './bgm_title.mp3'];
self.addEventListener('install', function(e){
  e.waitUntil(caches.open(VERSION).then(function(c){ return c.addAll(CORE); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== VERSION; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if(url.origin !== location.origin && !isFont) return;
  e.respondWith(caches.match(req).then(function(hit){
    const net = fetch(req).then(function(res){
      if(res && (res.ok || res.type === 'opaque')){ const copy = res.clone(); caches.open(VERSION).then(function(c){ c.put(req, copy); }); }
      return res;
    }).catch(function(){ return hit; });
    return hit || net;
  }));
});
