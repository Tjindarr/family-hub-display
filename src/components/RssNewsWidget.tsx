import { useState, useEffect } from "react";
import { Newspaper, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ResolvedFontSizes } from "@/lib/fontSizes";
import type { WidgetStyleConfig } from "@/lib/config";

export interface RssNewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  imageUrl: string;
}

interface RssNewsWidgetProps {
  items: RssNewsItem[];
  loading: boolean;
  label?: string;
  cycleIntervalSeconds?: number;
  fontSizes?: ResolvedFontSizes;
  widgetStyle?: WidgetStyleConfig;
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "nu";
    if (diffMin < 60) return `${diffMin} min sedan`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} h sedan`;
    return d.toLocaleDateString("sv-SE", { month: "long", day: "numeric" });
  } catch {
    return "";
  }
}

export default function RssNewsWidget({ items, loading, label, cycleIntervalSeconds = 8, fontSizes, widgetStyle }: RssNewsWidgetProps) {
  const fs = fontSizes || { label: 10, heading: 12, body: 14, value: 18 };
  const ws = widgetStyle || {};
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, cycleIntervalSeconds * 1000);
    return () => clearInterval(interval);
  }, [items.length, cycleIntervalSeconds]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [items]);

  if (loading) {
    return (
      <div className="widget-card h-full p-2 flex gap-2">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <Skeleton className="h-24 w-24 rounded-md shrink-0" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="widget-card h-full p-2">
        <p className="text-muted-foreground" style={{ fontSize: fs.label }}>Inga nyheter</p>
      </div>
    );
  }

  const item = items[currentIndex];

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="widget-card h-full flex flex-col overflow-hidden group cursor-pointer"
    >
      <div className="flex-1 flex gap-3 p-2 min-h-0">
        {/* Left: text content */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium uppercase tracking-wider truncate" style={{ fontSize: fs.label, color: ws.labelColor || "hsl(var(--muted-foreground))" }}>
              {label || "Nyheter"}
            </span>
            <span className="whitespace-nowrap" style={{ fontSize: fs.label, color: ws.labelColor || "hsl(var(--muted-foreground))" }}>
              · {formatTime(item.pubDate)}
            </span>
            <ExternalLink className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-auto" />
          </div>

          <h3 className="font-semibold leading-snug line-clamp-2" style={{ fontSize: fs.body, color: ws.valueColor || "hsl(var(--foreground))" }}>
            {item.title}
          </h3>

          {item.description && (
            <p className="leading-relaxed line-clamp-5 flex-1" style={{ fontSize: fs.heading, color: ws.headingColor || "hsl(var(--muted-foreground))" }}>
              {item.description}
            </p>
          )}
        </div>

        {/* Right: image */}
        {item.imageUrl && (
          <div className="shrink-0 w-24 h-24 rounded-md overflow-hidden self-center">
            <img
              key={item.imageUrl}
              src={item.imageUrl}
              alt={item.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>
        )}
      </div>

      {/* Progress dots */}
      {items.length > 1 && (
        <div className="flex gap-1 justify-center pb-1.5">
          {items.map((_, i) => (
            <div
              key={i}
              className={`h-0.5 rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? "w-3 bg-primary"
                  : "w-1 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      )}
    </a>
  );
}