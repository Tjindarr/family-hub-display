import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

let searchCache: Record<string, string[]> = {};

async function searchIcons(query: string): Promise<string[]> {
  if (!query || query.length < 2) return [];
  const cacheKey = query.toLowerCase();
  if (searchCache[cacheKey]) return searchCache[cacheKey];

  try {
    const res = await fetch(
      `https://api.iconify.design/search?query=${encodeURIComponent(query)}&prefix=mdi&limit=30`
    );
    const data = await res.json();
    const icons: string[] = data.icons || [];
    searchCache[cacheKey] = icons;
    return icons;
  } catch {
    return [];
  }
}

export default function IconPicker({ value, onChange, placeholder = "mdi:icon-name", className }: IconPickerProps) {
  const [results, setResults] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const doSearch = useCallback((q: string) => {
    // Strip mdi: prefix for search
    const searchQ = q.replace(/^mdi:/, "").replace(/-/g, " ");
    if (searchQ.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    searchIcons(searchQ).then((icons) => {
      setResults(icons);
      setSearching(false);
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        listRef.current && !listRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        {value && (
          <Icon icon={value.includes(":") ? value : `mdi:${value}`} className="shrink-0 text-muted-foreground" width={16} height={16} />
        )}
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => doSearch(e.target.value), 300);
          }}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
            if (value) doSearch(value);
          }}
          onBlur={() => {
            setTimeout(() => setFocused(false), 200);
          }}
          placeholder={placeholder}
          className={cn(className)}
        />
      </div>
      {open && focused && results.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 max-h-52 w-64 overflow-y-auto rounded-md border border-border bg-popover shadow-lg"
        >
          {results.map((iconName) => (
            <button
              key={iconName}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent",
                iconName === value && "bg-accent"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(iconName);
                setOpen(false);
              }}
            >
              <Icon icon={iconName} width={18} height={18} className="shrink-0" />
              <span className="text-xs text-foreground truncate">{iconName.replace("mdi:", "")}</span>
            </button>
          ))}
        </div>
      )}
      {open && focused && searching && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-64 rounded-md border border-border bg-popover p-3 shadow-lg">
          <span className="text-xs text-muted-foreground">Searching…</span>
        </div>
      )}
    </div>
  );
}
