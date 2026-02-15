import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ImageIcon } from "lucide-react";
import type { PhotoWidgetConfig } from "@/lib/config";

interface PhotoWidgetProps {
  config: PhotoWidgetConfig;
}

export default function PhotoWidget({ config }: PhotoWidgetProps) {
  const { photos, intervalSeconds } = config;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

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

  // Reset index if photos shrink
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

  return (
    <Card className="h-full max-h-full overflow-hidden border-border/50 bg-card/80 backdrop-blur" style={{ minHeight: 0 }}>
      <CardContent className="relative h-full max-h-full p-0 overflow-hidden" style={{ minHeight: 0 }}>
        <img
          src={photos[currentIndex]}
          alt={`Photo ${currentIndex + 1}`}
          className="absolute inset-0 h-full w-full object-contain object-top transition-opacity duration-500"
          style={{ opacity: fade ? 1 : 0 }}
        />
        {photos.length > 1 && (
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
            {photos.map((_, i) => (
              <span
                key={i}
                className={`block h-1.5 w-1.5 rounded-full ${i === currentIndex ? "bg-foreground/80" : "bg-foreground/30"}`}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
