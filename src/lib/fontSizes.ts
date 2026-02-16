import type { GlobalFontSizes, WidgetFontSizes } from "./config";

export interface ResolvedFontSizes {
  label: number;
  heading: number;
  body: number;
  value: number;
}

export const DEFAULT_FONT_SIZES: ResolvedFontSizes = {
  label: 10,
  heading: 12,
  body: 14,
  value: 18,
};

export function resolveFontSizes(
  global?: GlobalFontSizes,
  widget?: WidgetFontSizes,
): ResolvedFontSizes {
  const base = global || DEFAULT_FONT_SIZES;
  return {
    label: widget?.label || base.label,
    heading: widget?.heading || base.heading,
    body: widget?.body || base.body,
    value: widget?.value || base.value,
  };
}
