import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ImageIcon } from "lucide-react";
import type { PhotoWidgetConfig } from "@/lib/config";

interface ServerPhoto {
  filename: string;
  url: string;
  thumbUrl: string;
  sizeBytes?: number;
}

const DEMO_PHOTOS: ServerPhoto[] = [
  { filename: "demo1.jpg", url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&h=600&fit=crop", thumbUrl: "", sizeBytes: 245000 },
  { filename: "demo2.jpg", url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop", thumbUrl: "", sizeBytes: 312000 },
  { filename: "demo3.jpg", url: "https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800&h=600&fit=crop", thumbUrl: "", sizeBytes: 198000 },
  { filename: "demo4.jpg", url: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&h=600&fit=crop", thumbUrl: "", sizeBytes: 278000 },
];

interface PhotoWidgetProps {
  config: PhotoWidgetConfig;
  isDemo?: boolean;
}

export default function PhotoWidget({ config, isDemo }: PhotoWidgetProps) {
  const { intervalSeconds, displayMode = "contain" } = config;
  const [photos, setPhotos] = useState<ServerPhoto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (isDemo) {
      setPhotos(DEMO_PHOTOS);
      return;
    }
    const fetchPhotos = async () => {
      try {
        const res = await fetch("/api/photos");
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            setPhotos(data);
          } else if (isDemo) {
            setPhotos(DEMO_PHOTOS);
          }
        }
      } catch (e) {
        console.error("Failed to fetch photos:", e);
        if (isDemo) setPhotos(DEMO_PHOTOS);
      }
    };
    fetchPhotos();
    const interval = setInterval(fetchPhotos, 60_000);
    return () => clearInterval(interval);
  }, [isDemo]);

  const advance = useCallback(() => {
    if (photos.length <= 1) return;
    setFade(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
      setFade(true);
    }, 500);
  }, [photos.length]);

  useEffect(() => {
    if (photos.length <= 1) return;
    timerRef.current = setInterval(advance, intervalSeconds * 1000);
    return () => clearInterval(timerRef.current);
  }, [advance, intervalSeconds, photos.length]);

  useEffect(() => {
    if (currentIndex >= photos.length) setCurrentIndex(0);
  }, [photos.length, currentIndex]);

  if (photos.length === 0) {
    return (
      <Card className="h-full border-border/50 bg-card/80 backdrop-blur">
        <CardContent className="flex h-full items-center justify-center p-6">
          <div className="text-center text-muted-foreground">
            <ImageIcon className="mx-auto mb-2 h-10 w-10 opacity-40" />
            <p className="text-sm">No photos added yet</p>
            <p className="text-xs">Add photos in settings</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const src = photos[currentIndex]?.url || "";

  return (
    <Card className="h-full max-h-full overflow-hidden border-border/50 bg-card/80 backdrop-blur" style={{ minHeight: 0 }}>
      <CardContent className="relative h-full max-h-full p-0 overflow-hidden" style={{ minHeight: 0 }}>
        {displayMode === "blur-fill" && (
          <img
            src={src}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover blur-2xl scale-110 opacity-50"
          />
        )}
        <img
          key={src}
          src={src}
          alt={`Photo ${currentIndex + 1}`}
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${
            displayMode === "cover" ? "object-cover object-top" : "object-contain object-top"
          }`}
          style={{ opacity: fade ? 1 : 0 }}
        />
        {photos.length > 1 && (
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
            {photos.length <= 20 && photos.map((_, i) => (
              <span
                key={i}
                className={`block h-1.5 w-1.5 rounded-full ${i === currentIndex ? "bg-foreground/80" : "bg-foreground/30"}`}
              />
            ))}
            {photos.length > 20 && (
              <span className="text-[10px] text-foreground/60 bg-background/40 rounded px-1.5">
                {currentIndex + 1} / {photos.length}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
