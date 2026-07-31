// Service Worker：离线缓存应用壳，让「每日助手」可像 App 一样离线使用
const CACHE_NAME = "daily-helper-v20260731";
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
      return cache.addAll(SHELL);
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(function (keys) {
        return Promise.all(
          keys.filter(function (key) { return key !== CACHE_NAME; })
              .map(function (key) { return caches.delete(key); })
        );
      })
    ])
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // 动态数据（news/english 由 Actions 定时刷新）：网络优先，断网才用缓存，保证实时更新
  if (/\/data\/(news|english)\.json/.test(url.pathname)) {
    event.respondWith(
      fetch(event.request).then(function (response) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(function () {
        return caches.match(event.request);
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(function () {
        return caches.match("./index.html");
      });
    })
  );
});
