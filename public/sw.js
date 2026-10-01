// 정글맞팔웹 Service Worker
// PWA + Web Push 알림 수신

const CACHE_NAME = "jungle-follow-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});


// ======================================================
// 푸시 알림 수신
// ======================================================

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data
      ? event.data.json()
      : {};
  } catch {
    data = {
      title: "정글맞팔웹 🐯",
      body: event.data
        ? event.data.text()
        : "새로운 알림이 도착했어요.",
    };
  }

  const title =
    data.title || "정글맞팔웹 🐯";

  const options = {
    body:
      data.body ||
      "새로운 알림이 도착했어요.",

    icon:
      data.icon ||
      "/jungle-follow-hero.png",

    badge:
      data.badge ||
      "/jungle-follow-hero.png",

    tag:
      data.tag ||
      "jungle-follow-notification",

    data: {
      url:
        data.url ||
        "/member",
    },
  };

  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  );
});


// ======================================================
// 알림 클릭
// ======================================================

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const targetUrl =
      event.notification?.data?.url ||
      "/member";

    event.waitUntil(
      (async () => {
        const windowClients =
          await self.clients.matchAll({
            type: "window",
            includeUncontrolled: true,
          });

        for (const client of windowClients) {
          if ("focus" in client) {
            await client.focus();

            if ("navigate" in client) {
              await client.navigate(
                targetUrl
              );
            }

            return;
          }
        }

        if (self.clients.openWindow) {
          await self.clients.openWindow(
            targetUrl
          );
        }
      })()
    );
  }
);
