import type { WallpaperConfig } from "@/lib/config-types";

interface Props {
  wallpaper?: WallpaperConfig;
  context?: "main" | "mobile";
}

export default function WallpaperBackground({ wallpaper, context = "main" }: Props) {
  if (!wallpaper || !wallpaper.enabled || !wallpaper.url) return null;
  if (context === "mobile" && wallpaper.applyToMobile === false) return null;

  const isTile = wallpaper.fit === "tile";
  const bgStyle: React.CSSProperties = {
    backgroundImage: `url(${wallpaper.url})`,
    backgroundRepeat: isTile ? "repeat" : "no-repeat",
    backgroundPosition: "center center",
    backgroundSize: isTile
      ? "auto"
      : wallpaper.fit === "fill"
      ? "100% 100%"
      : wallpaper.fit, // cover | contain
    filter: wallpaper.blur > 0 ? `blur(${wallpaper.blur}px)` : undefined,
    transform: wallpaper.blur > 0 ? "scale(1.05)" : undefined, // avoid blurred edges
  };

  return (
    <>
      <div
        aria-hidden
        className="fixed inset-0 -z-20 pointer-events-none"
        style={bgStyle}
      />
      {wallpaper.dim > 0 && (
        <div
          aria-hidden
          className="fixed inset-0 -z-10 pointer-events-none"
          style={{ backgroundColor: `rgba(0,0,0,${Math.min(100, Math.max(0, wallpaper.dim)) / 100})` }}
        />
      )}
    </>
  );
}
