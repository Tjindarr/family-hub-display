import { useState, useEffect, useCallback } from "react";
import type { RssNewsItem } from "@/components/RssNewsWidget";
import type { RssNewsConfig } from "@/lib/config";

export function useRssNews(configs: RssNewsConfig[], refreshInterval: number) {
  const [dataMap, setDataMap] = useState<Record<string, RssNewsItem[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (configs.length === 0) {
      setDataMap({});
      setLoading(false);
      return;
    }

    const results: Record<string, RssNewsItem[]> = {};

    await Promise.all(
      configs.map(async (cfg) => {
        try {
          // Use a CORS proxy for RSS feeds
          // Try local backend proxy first, then external CORS proxies as fallback
          let text = "";
          const proxies = [
            `/api/rss?url=${encodeURIComponent(cfg.feedUrl)}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(cfg.feedUrl)}`,
            `https://corsproxy.io/?url=${encodeURIComponent(cfg.feedUrl)}`,
          ];
          let fetched = false;
          for (const proxyUrl of proxies) {
            try {
              const r = await fetch(proxyUrl);
              const ct = r.headers.get("content-type") || "";
              // Skip if local proxy returned HTML (SPA fallback)
              if (proxyUrl.startsWith("/") && !ct.includes("xml")) continue;
              if (!r.ok) continue;
              text = await r.text();
              // Verify it looks like XML
              if (text.trim().startsWith("<")) {
                fetched = true;
                break;
              }
            } catch {
              continue;
            }
          }
          if (!fetched) throw new Error("All proxies failed");
          const parser = new DOMParser();
          const doc = parser.parseFromString(text, "text/xml");
          const items = Array.from(doc.querySelectorAll("item")).slice(0, cfg.maxItems || 15);
          results[cfg.id] = items.map((item) => ({
            title: item.querySelector("title")?.textContent || "",
            link: item.querySelector("link")?.textContent || "",
            pubDate: item.querySelector("pubDate")?.textContent || "",
          }));
        } catch (err) {
          console.error(`Failed to fetch RSS feed ${cfg.feedUrl}:`, err);
          results[cfg.id] = [];
        }
      })
    );

    setDataMap(results);
    setLoading(false);
  }, [configs]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, Math.max(refreshInterval, 60) * 1000);
    return () => clearInterval(interval);
  }, [fetchAll, refreshInterval]);

  return { dataMap, loading };
}
