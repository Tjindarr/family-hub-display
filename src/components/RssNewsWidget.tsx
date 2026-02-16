import { useState, useEffect } from "react";
import { Newspaper, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function RssNewsWidget({ items, loading, label, cycleIntervalSeconds = 8 }: RssNewsWidgetProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, cycleIntervalSeconds * 1000);
    return () => clearInterval(interval);
  }, [items.length, cycleIntervalSeconds]);

  // Reset index when items change
  useEffect(() => {
    setCurrentIndex(0);
  }, [items]);

  if (loading) {
    return (
      <div className="widget-card h-full p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Newspaper className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">{label || "Nyheter"}</span>
        </div>
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="widget-card h-full p-4">
        <div className="flex items-center gap-2 mb-2">
          <Newspaper className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">{label || "Nyheter"}</span>
        </div>
        <p className="text-xs text-muted-foreground">Inga nyheter</p>
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
      {/* Image */}
      {item.imageUrl && (
        <div className="relative w-full h-40 shrink-0 overflow-hidden">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          {/* Counter badge */}
          <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded-full">
            {currentIndex + 1}/{items.length}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-3 flex flex-col gap-1.5 min-h-0">
        <div className="flex items-center gap-2">
          <Newspaper className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate">
            {label || "Nyheter"}
          </span>
          <span className="text-[10px] text-muted-foreground ml-auto whitespace-nowrap">
            {formatTime(item.pubDate)}
          </span>
          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>

        <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
          {item.title}
        </h3>

        {item.description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 flex-1">
            {item.description}
          </p>
        )}

        {/* Progress dots */}
        {items.length > 1 && (
          <div className="flex gap-1 justify-center pt-1">
            {items.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === currentIndex
                    ? "w-4 bg-primary"
                    : "w-1 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </a>
  );
}
