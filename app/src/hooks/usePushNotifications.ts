import { useState, useEffect, useCallback } from "react";
import { urlBase64ToUint8Array, isPushSupported } from "@/lib/push";
import { api } from "@/api/client";

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    isPushSupported() ? Notification.permission : "denied"
  );
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const isSupported = isPushSupported();

  useEffect(() => {
    if (!isSupported) return;
    navigator.serviceWorker.ready.then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      setSubscription(existing);
    });
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported) return;

    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== "granted") return;

    const registration = await navigator.serviceWorker.ready;
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.error("[push] VITE_VAPID_PUBLIC_KEY not configured");
      return;
    }

    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
    });

    setSubscription(sub);

    const json = sub.toJSON();
    await api.pushSubscribe({
      endpoint: json.endpoint!,
      keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
      userAgent: navigator.userAgent,
    });
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!subscription) return;
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    setSubscription(null);
    await api.pushUnsubscribe(endpoint);
  }, [subscription]);

  return { isSupported, permission, subscription, subscribe, unsubscribe };
}
