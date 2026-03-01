// Push notification subscription helper

export async function getVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/push/vapid-public-key");
    if (!res.ok) return null;
    const data = await res.json();
    return data.publicKey || null;
  } catch {
    return null;
  }
}

export async function isPushSupported(): Promise<boolean> {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function getPushPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  return Notification.permission;
}

export async function registerPushSubscription(
  role: "parent" | "kid",
  kidId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!await isPushSupported()) {
      return { success: false, error: "Push notifications not supported on this device" };
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { success: false, error: "Notification permission denied" };
    }

    const publicKey = await getVapidPublicKey();
    if (!publicKey) {
      return { success: false, error: "Push not configured on server" };
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register("/sw-push.js");
    await navigator.serviceWorker.ready;

    // Subscribe
    const subscription = await (registration as any).pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    // Send subscription to server
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription, role, kidId }),
    });

    if (!res.ok) throw new Error("Failed to save subscription");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function unregisterPushSubscription(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw-push.js");
    if (!registration) return;
    const subscription = await (registration as any).pushManager.getSubscription();
    if (subscription) {
      // Remove from server
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
    }
  } catch {
    // ignore
  }
}

export async function getSubscriptionStatus(): Promise<{
  subscribed: boolean;
  permission: NotificationPermission;
  supported: boolean;
}> {
  const supported = await isPushSupported();
  const permission = await getPushPermission();
  let subscribed = false;
  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw-push.js");
    if (registration) {
      const sub = await (registration as any).pushManager.getSubscription();
      subscribed = !!sub;
    }
  } catch {}
  return { subscribed, permission, supported };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
