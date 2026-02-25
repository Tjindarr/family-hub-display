import { useState, useEffect, useRef, useCallback } from "react";
import { Upload, Trash2, Loader2, ImageIcon, Info, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface ServerPhoto {
  filename: string;
  url: string;
  thumbUrl: string;
  sizeBytes?: number;
  createdAt?: number;
}

type SortMode = "date-desc" | "date-asc" | "size-desc" | "size-asc";

export default function PhotoManager() {
  const [photos, setPhotos] = useState<ServerPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("date-desc");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch("/api/photos");
      if (res.ok) {
        const data = await res.json();
        setPhotos(data);
      }
    } catch (e) {
      console.error("Failed to fetch photos:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files || []);
    if (fileList.length === 0) return;

    setUploading(true);
    try {
      // Upload files one at a time to avoid payload size issues
      for (const file of fileList) {
        const data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        const res = await fetch("/api/photos/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: [{ name: file.name, data }] }),
        });

        if (!res.ok) {
          console.error(`Failed to upload ${file.name}:`, await res.text());
        }
      }

      await fetchPhotos();
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (filename: string) => {
    try {
      const res = await fetch(`/api/photos/${encodeURIComponent(filename)}`, { method: "DELETE" });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.filename !== filename));
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="w-full"
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Uploading…
            </>
          ) : (
            <>
              <Upload className="mr-2 h-3 w-3" /> Upload Photos
            </>
          )}
        </Button>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <ImageIcon className="mx-auto mb-2 h-8 w-8 opacity-40" />
          <p className="text-sm">No photos uploaded yet</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{photos.length} photo{photos.length !== 1 ? "s" : ""}</p>
            <div className="flex items-center gap-1">
              <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="text-[11px] bg-transparent border border-border/50 rounded px-1.5 py-0.5 text-foreground"
              >
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
                <option value="size-desc">Largest first</option>
                <option value="size-asc">Smallest first</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[...photos].sort((a, b) => {
              switch (sortMode) {
                case "size-desc": return (b.sizeBytes || 0) - (a.sizeBytes || 0);
                case "size-asc": return (a.sizeBytes || 0) - (b.sizeBytes || 0);
                case "date-asc": return (a.createdAt || 0) - (b.createdAt || 0);
                case "date-desc":
                default: return (b.createdAt || 0) - (a.createdAt || 0);
              }
            }).map((photo) => {
              const ext = photo.filename.split(".").pop()?.toUpperCase() || "";
              const formatSize = (bytes?: number) => {
                if (!bytes) return "—";
                if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
                return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
              };

              return (
                <HoverCard key={photo.filename} openDelay={200} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <div className="group relative overflow-hidden rounded-md border border-border/50 cursor-pointer">
                      <div className="aspect-square overflow-hidden">
                        <img
                          src={photo.thumbUrl}
                          alt={photo.filename}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="px-1 py-0.5 bg-muted/50 text-xs text-muted-foreground text-center truncate">
                        {formatSize(photo.sizeBytes)}
                      </div>
                      <div className="absolute left-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Info className="h-3 w-3 text-foreground/70 drop-shadow" />
                      </div>
                      <button
                        onClick={() => handleDelete(photo.filename)}
                        className="absolute right-1 top-1 rounded-full bg-destructive/80 p-0.5 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent side="top" className="w-52 p-3">
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-foreground truncate" title={photo.filename}>
                        {photo.filename}
                      </p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                        <span className="text-muted-foreground">Format</span>
                        <span className="text-foreground">{ext}</span>
                        <span className="text-muted-foreground">File Size</span>
                        <span className="text-foreground">{formatSize(photo.sizeBytes)}</span>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              );
            })}
          </div>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Photos are stored on the server in /data/photos.
      </p>
    </div>
  );
}
