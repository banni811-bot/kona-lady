"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

export default function PushNotifications() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSupported(
      "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window,
    );
  }, []);

  async function enableNotifications() {
    if (!supported || busy) return;

    setBusy(true);

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        alert(
          "Сначала войдите в аккаунт KONA LADY, чтобы включить уведомления.",
        );
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!publicKey) {
        alert("Уведомления пока не настроены.");
        return;
      }

      if (Notification.permission === "denied") {
        alert(
          "Уведомления заблокированы браузером. Разрешите их в настройках сайта.",
        );
        return;
      }

      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

      if (permission !== "granted") {
        alert("Разрешите уведомления в настройках браузера.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            publicKey,
          ) as BufferSource,
        });
      }

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ subscription }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(
          result.error || "Не удалось сохранить подписку.",
        );
      }

      setSubscribed(true);
      alert("Уведомления KONA LADY включены!");
    } catch (error) {
      console.error("Push notification setup failed:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Не удалось включить уведомления.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!supported || subscribed) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50">
      <button
        type="button"
        onClick={enableNotifications}
        disabled={busy}
        className="rounded-full bg-purple-700 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-purple-800 disabled:opacity-60"
      >
        {busy ? "Подключаем..." : "🔔 Включить уведомления"}
      </button>
    </div>
  );
}