// 青空縦組 の Service Worker
// 更新するときは VERSION の数字を上げる
// 同じアドレス（nhori-navi.github.io）のほかのアプリとキャッシュの置き場を共有しているので、
// 消すのは "tategumi" で始まるものだけにする
const VERSION = "tategumi-v27";
const SHELL = ["./", "index.html", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-touch-icon.png"];
const RUNTIME = "tategumi-runtime";
const CDN = ["fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k.startsWith("tategumi") && k !== VERSION && k !== RUNTIME).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // 画面そのもの：通信できれば最新を、できなければ保存しておいたものを
  if (req.mode === "navigate") {
    e.respondWith(fetch(req, {cache: "no-cache"}).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put("index.html", copy)); return res;
    }).catch(() => caches.match("index.html")));
    return;
  }
  // 書体と部品：手元にあればすぐ使い、裏で新しくする
  if (CDN.includes(url.hostname)) {
    e.respondWith(caches.open(RUNTIME).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => { c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  // 同じ場所のファイル（作品索引など）：手元にあればすぐ使い、裏で新しくする
  if (url.origin === location.origin) {
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(req, {ignoreSearch: true});
      const net = fetch(req, {cache: "no-cache"}).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
