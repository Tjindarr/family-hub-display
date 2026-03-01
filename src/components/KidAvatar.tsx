import type { Kid } from "@/lib/chores-types";

/** Renders a kid's avatar — either an emoji or an uploaded image */
export function KidAvatar({ kid, size = 48 }: { kid: Kid; size?: number }) {
  const isImage = kid.avatar?.startsWith("/");
  return isImage ? (
    <img
      src={kid.avatar}
      alt={kid.name}
      className="rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span style={{ fontSize: size * 0.6 }}>{kid.avatar}</span>
  );
}
