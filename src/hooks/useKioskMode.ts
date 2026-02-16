import { useState, useEffect, useCallback } from "react";

const KIOSK_REFRESH_INTERVAL_MS = 2 * 60 * 60 * 1000; // Auto-refresh every 2 hours

export function useKioskMode() {
  const [isKiosk, setIsKiosk] = useState(() => {
    return new URLSearchParams(window.location.search).has("kiosk");
  });

  const enterKiosk = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("kiosk", "1");
    window.history.replaceState({}, "", url.toString());
    setIsKiosk(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  const exitKiosk = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("kiosk");
    window.history.replaceState({}, "", url.toString());
    setIsKiosk(false);
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  // Triple-click anywhere to exit kiosk
  useEffect(() => {
    if (!isKiosk) return;
    const handler = (e: MouseEvent) => {
      if (e.detail === 3) exitKiosk();
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [isKiosk, exitKiosk]);

  // Hide cursor after inactivity
  useEffect(() => {
    if (!isKiosk) {
      document.body.style.cursor = "";
      return;
    }
    let timeout: ReturnType<typeof setTimeout>;
    const show = () => {
      document.body.style.cursor = "";
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        document.body.style.cursor = "none";
      }, 3000);
    };
    show();
    window.addEventListener("mousemove", show);
    return () => {
      clearTimeout(timeout);
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", show);
    };
  }, [isKiosk]);

  // Auto-refresh page periodically in kiosk mode to prevent memory buildup
  useEffect(() => {
    if (!isKiosk) return;
    const interval = setInterval(() => {
      window.location.reload();
    }, KIOSK_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isKiosk]);

  // Reload if page becomes visible after being hidden (e.g. screen wake)
  useEffect(() => {
    if (!isKiosk) return;
    let hiddenAt: number | null = null;
    const handler = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
      } else if (hiddenAt && Date.now() - hiddenAt > 30_000) {
        // Was hidden for more than 30 seconds — reload to recover
        window.location.reload();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [isKiosk]);

  return { isKiosk, enterKiosk, exitKiosk };
}
