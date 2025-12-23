self.addEventListener("install", event => {
    event.waitUntil(
      caches.open("sleep-tracker").then(cache => {
        return cache.addAll([
          "./",
          "./index.html",
          "./style.css",
          "./script.js"
        ]);
      })
    );
  });
  