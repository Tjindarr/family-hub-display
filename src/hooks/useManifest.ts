import { useEffect } from "react";

export function useManifest(manifestPath: string) {
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (link) {
      link.href = manifestPath;
    }
  }, [manifestPath]);
}
