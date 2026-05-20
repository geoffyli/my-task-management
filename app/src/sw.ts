/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Push notification handler
self.addEventListener("push", (event) => {
  let data: Record<string, any> = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: "Task Analytics", body: "You have a notification" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? "Task Analytics", {
      body: data.body,
      icon: "/web-app-manifest-192x192.png",
      badge: "/favicon-96x96.png",
      tag: data.tag,
      data: { url: data.data?.url ?? "/" },
    })
  );
});

// Notification click deep-link handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(url) && "focus" in client) {
            (client as WindowClient).navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});

// Handle subscription invalidation (iOS forward-compat)
self.addEventListener("pushsubscriptionchange", ((event: Event) => {
  const pushEvent = event as ExtendableEvent & {
    oldSubscription?: PushSubscription;
    newSubscription?: PushSubscription;
  };
  pushEvent.waitUntil(
    (async () => {
      try {
        const newSubscription = await self.registration.pushManager.subscribe(
          pushEvent.oldSubscription?.options || { userVisibleOnly: true }
        );
        const json = newSubscription.toJSON();

        await fetch("/api/push/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
            oldEndpoint: pushEvent.oldSubscription?.endpoint || null,
            userAgent: navigator.userAgent,
          }),
        });
      } catch {
        // Best-effort — client health check handles recovery on next app open
      }
    })()
  );
}) as EventListener);
