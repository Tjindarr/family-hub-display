import { Newspaper, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export interface RssNewsItem {
  title: string;
  link: string;
  pubDate: string;
}

interface RssNewsWidgetProps {
  items: RssNewsItem[];
  loading: boolean;
  label?: string;
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "nu";
    if (diffMin < 60) return `${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} h`;
    return d.toLocaleDateString("sv-SE", { month: "2-digit", day: "2-digit" });
  } catch {
    return "";
  }
}

export default function RssNewsWidget({ items, loading, label }: RssNewsWidgetProps) {
  if (loading) {
    return (
      <div className="widget-card h-full p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Newspaper className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">{label || "Nyheter"}</span>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="widget-card h-full p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Newspaper className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">{label || "Nyheter"}</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground">Inga nyheter</p>
        )}
        {items.map((item, i) => (
          <a
            key={i}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 py-1.5 px-1 rounded hover:bg-muted/50 transition-colors group"
          >
            <span className="text-[10px] text-muted-foreground whitespace-nowrap pt-0.5 min-w-[40px]">
              {formatTime(item.pubDate)}
            </span>
            <span className="text-xs text-foreground leading-snug flex-1">
              {item.title}
            </span>
            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
          </a>
        ))}
      </div>
    </div>
  );
}
