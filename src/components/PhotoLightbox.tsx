import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Camera } from "lucide-react";

interface PhotoLightboxProps {
  src: string | null;
  onClose: () => void;
}

export function PhotoLightbox({ src, onClose }: PhotoLightboxProps) {
  return (
    <Dialog open={!!src} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 bg-background/95 backdrop-blur">
        {src && (
          <img
            src={src}
            alt="Chore proof photo"
            className="w-full h-full max-h-[85vh] object-contain rounded"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Clickable thumbnail that opens a lightbox */
export function PhotoThumbnail({
  src,
  size = "md",
  onClick,
}: {
  src: string;
  size?: "sm" | "md";
  onClick: () => void;
}) {
  const sizeClass = size === "sm" ? "w-8 h-8" : "w-20 h-20";
  return (
    <button onClick={onClick} className="relative group cursor-pointer" title="View photo">
      <img src={src} alt="Proof" className={`${sizeClass} rounded object-cover border border-border`} />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded flex items-center justify-center transition-opacity">
        <Camera className="w-4 h-4 text-white" />
      </div>
    </button>
  );
}

/** Small camera icon indicator for compact views */
export function PhotoIndicator({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-muted-foreground hover:text-primary transition-colors" title="View photo">
      <Camera className="w-3.5 h-3.5" />
    </button>
  );
}
