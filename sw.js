// Service Worker：网络优先（在线永远最新，断网才用缓存兜底）
// v20260803 - 修复：旧版缓存优先导致 app.js/index.html 永远拿旧缓存，看不了新数据
const CACHE_NAME = "daily-helper-v20260803";
const SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./config.js",
  "./app.js",
  "./data/quotes.js",
  "./data/life.js",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./manifest.webmanifest"
];

self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(SHELL).catch(function () { /* 个别文件失败不影响激活 */ });
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // 清掉所有旧版本缓存（含 7-31 之前的 v20260731 等），根治"永远看到旧页面"
      caches.keys().then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
      })
    ])
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // 所有请求一律网络优先：在线拿最新（数据/代码都最新），失败才回退缓存
  event.respondWith(
    fetch(event.request).then(function (response) {
      // 只缓存成功的 GET，且动态数据（news/english）不缓存，保证实时
      if (response && response.ok && !/\/data\/(news|english)\.json/.test(url.pathname)) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, clone); });
      }
      return response;
    }).catch(function () {
      return caches.match(event.request).then(function (cached) {
        return cached || caches.match("./index.html");
      });
    })
  );
});
