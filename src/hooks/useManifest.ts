import { useEffect } from "react";

export function useManifest(manifestPath: string, iconPath?: string, title?: string) {
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (link) {
      link.href = manifestPath;
    }

    if (iconPath) {
      const appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
      if (appleIcon) {
        appleIcon.href = iconPath;
      }
    }

    if (title) {
      const metaTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
      if (metaTitle) {
        metaTitle.content = title;
      }
      document.title = title;
    }
  }, [manifestPath, iconPath, title]);
}
