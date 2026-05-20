import webpush from "web-push";
import type { Database } from "bun:sqlite";
import { getAllSubscriptions, getGlobalPreferences, getDevicePreferences, removeSubscription, touchLastUsed } from "../db/push";

export interface NotificationPayload {
  title: string;
  body: string;
  tag: string;
  data: { url: string };
}

export type NotificationType =
  | "sync_failure" | "sync_recovery" | "db_health"
  | "tasks_due_today" | "tasks_due_tomorrow" | "overdue_tasks"
  | "daily_digest" | "weekly_review" | "blocked_alert" | "stale_alert";

export function initPush(): void {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    console.log("[push] VAPID keys not configured — push notifications disabled");
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  console.log("[push] VAPID details configured");
}

export async function sendToDevice(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  options?: { urgency?: "very-low" | "low" | "normal" | "high" },
): Promise<{ success: boolean; gone: boolean }> {
  try {
    await webpush.sendNotification(subscription, payload, {
      TTL: 3600,
      urgency: options?.urgency ?? "normal",
    });
    return { success: true, gone: false };
  } catch (err: any) {
    const gone = err.statusCode === 410 || err.statusCode === 404;
    if (!gone) {
      console.error("[push] Failed to send notification:", err.statusCode ?? err.message);
    }
    return { success: false, gone };
  }
}

export async function sendToAll(
  db: Database,
  payload: NotificationPayload,
  notificationType: NotificationType,
  options?: { urgency?: "very-low" | "low" | "normal" | "high" },
): Promise<void> {
  const globalPrefs = getGlobalPreferences(db);
  if (globalPrefs && !globalPrefs.enabled) return;

  const subscriptions = getAllSubscriptions(db);
  if (subscriptions.length === 0) return;

  const payloadStr = JSON.stringify(payload);

  const eligible = subscriptions.filter((sub) => {
    const devicePrefs = getDevicePreferences(db, sub.id);
    const prefs = devicePrefs ?? globalPrefs;
    if (devicePrefs && !devicePrefs.enabled) return false;
    if (prefs) {
      const enabled = prefs[notificationType as keyof typeof prefs] as number;
      if (!enabled) return false;
    }
    return true;
  });

  await Promise.allSettled(
    eligible.map(async (sub) => {
      const result = await sendToDevice(
        { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
        payloadStr,
        options,
      );
      if (result.success) {
        touchLastUsed(db, sub.id);
      } else if (result.gone) {
        removeSubscription(db, sub.endpoint);
      }
    }),
  );
}
