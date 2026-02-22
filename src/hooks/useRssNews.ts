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

    // Demo mode: generate mock RSS items for demo feeds
    const demoConfigs = configs.filter((c) => c.feedUrl.includes("demo.example.com"));
    if (demoConfigs.length > 0 && demoConfigs.length === configs.length) {
      const mockItems: RssNewsItem[] = [
        { title: "Smart Home Trends 2026", link: "#", pubDate: new Date().toISOString(), description: "The latest trends in home automation and IoT devices.", imageUrl: "" },
        { title: "New Weather Station Released", link: "#", pubDate: new Date(Date.now() - 3600000).toISOString(), description: "A new affordable weather station with Home Assistant integration.", imageUrl: "" },
        { title: "Energy Prices Drop This Week", link: "#", pubDate: new Date(Date.now() - 7200000).toISOString(), description: "Electricity spot prices expected to decrease significantly.", imageUrl: "" },
        { title: "Home Assistant 2025.3 Released", link: "#", pubDate: new Date(Date.now() - 14400000).toISOString(), description: "Major update with new dashboard features and integrations.", imageUrl: "" },
        { title: "Solar Panel Efficiency Record", link: "#", pubDate: new Date(Date.now() - 28800000).toISOString(), description: "Researchers achieve record-breaking solar panel efficiency.", imageUrl: "" },
      ];
      const result: Record<string, RssNewsItem[]> = {};
      for (const cfg of configs) {
        result[cfg.id] = mockItems.slice(0, cfg.maxItems || 5);
      }
      setDataMap(result);
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
            title: item.querySelector("title")?.textContent?.trim() || "",
            link: item.querySelector("link")?.textContent?.trim() || "",
            pubDate: item.querySelector("pubDate")?.textContent || "",
            description: item.querySelector("description")?.textContent?.trim() || "",
            imageUrl: item.querySelector("enclosure")?.getAttribute("url") || "",
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
