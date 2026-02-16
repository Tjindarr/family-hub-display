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
          const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(cfg.feedUrl)}`;
          const res = await fetch(proxyUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
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
