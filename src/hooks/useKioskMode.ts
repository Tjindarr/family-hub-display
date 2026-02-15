import { useState, useEffect, useCallback } from "react";

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

  return { isKiosk, enterKiosk, exitKiosk };
}
