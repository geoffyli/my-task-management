import { useState, useEffect, useCallback, useRef } from "react";
import {
  urlBase64ToUint8Array,
  isPushSupported,
  getPushSupportStatus,
  type PushSupportStatus,
} from "@/lib/push";
import { api } from "@/api/client";

const ENDPOINT_STORAGE_KEY = "tasks-push-endpoint";
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

async function getVapidKey(): Promise<string | null> {
  try {
    const { publicKey } = await api.getVapidKey();
    return publicKey || null;
  } catch {
    return null;
  }
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    isPushSupported() ? Notification.permission : "denied"
  );
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [subscriptionStale, setSubscriptionStale] = useState(false);
  const isSupported = isPushSupported();
  const supportStatus: PushSupportStatus = getPushSupportStatus();
  const lastCheckRef = useRef(0);

  useEffect(() => {
    if (!isSupported) return;
    navigator.serviceWorker.ready.then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      setSubscription(existing);
      if (existing) {
        localStorage.setItem(ENDPOINT_STORAGE_KEY, existing.endpoint);
      }
    });
  }, [isSupported]);

  // Health check: detect iOS subscription drops and auto-resubscribe
  useEffect(() => {
    if (!isSupported) return;

    const checkAndRecover = async () => {
      const now = Date.now();
      if (now - lastCheckRef.current < CHECK_INTERVAL_MS) return;
      lastCheckRef.current = now;

      const reg = await navigator.serviceWorker.ready;
      const current = await reg.pushManager.getSubscription();

      if (!current && Notification.permission === "granted") {
        const vapidKey = await getVapidKey();
        if (!vapidKey) return;

        try {
          const newSub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
          });

          const json = newSub.toJSON();
          const oldEndpoint = localStorage.getItem(ENDPOINT_STORAGE_KEY);

          if (oldEndpoint && oldEndpoint !== json.endpoint) {
            await api.pushUnsubscribe(oldEndpoint).catch(() => {});
          }

          await api.pushSubscribe({
            endpoint: json.endpoint!,
            keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
            userAgent: navigator.userAgent,
          });

          setSubscription(newSub);
          setSubscriptionStale(false);
          localStorage.setItem(ENDPOINT_STORAGE_KEY, newSub.endpoint);
        } catch {
          setSubscriptionStale(true);
        }
        return;
      }

      if (!current && subscription) {
        setSubscription(null);
        setSubscriptionStale(true);
      } else if (current) {
        const storedEndpoint = localStorage.getItem(ENDPOINT_STORAGE_KEY);
        if (storedEndpoint && storedEndpoint !== current.endpoint) {
          const json = current.toJSON();
          if (storedEndpoint) {
            await api.pushUnsubscribe(storedEndpoint).catch(() => {});
          }
          await api.pushSubscribe({
            endpoint: json.endpoint!,
            keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
            userAgent: navigator.userAgent,
          });
        }
        localStorage.setItem(ENDPOINT_STORAGE_KEY, current.endpoint);
      }
    };

    lastCheckRef.current = Date.now();
    checkAndRecover();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") checkAndRecover();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isSupported, subscription]);

  const subscribe = useCallback(async () => {
    if (!isSupported) return;

    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== "granted") return;

    const registration = await navigator.serviceWorker.ready;
    const vapidKey = await getVapidKey();
    if (!vapidKey) {
      console.error("[push] VAPID key not available from server");
      return;
    }

    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
    });

    setSubscription(sub);
    setSubscriptionStale(false);

    const json = sub.toJSON();
    await api.pushSubscribe({
      endpoint: json.endpoint!,
      keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
      userAgent: navigator.userAgent,
    });

    localStorage.setItem(ENDPOINT_STORAGE_KEY, sub.endpoint);
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!subscription) return;
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    setSubscription(null);
    localStorage.removeItem(ENDPOINT_STORAGE_KEY);
    await api.pushUnsubscribe(endpoint);
  }, [subscription]);

  return { isSupported, supportStatus, permission, subscription, subscriptionStale, subscribe, unsubscribe };
}
