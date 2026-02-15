import { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { createHAClient } from "@/lib/ha-api";
import { isConfigured, type DashboardConfig, type HAState } from "@/lib/config";
import { cn } from "@/lib/utils";

interface EntityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  config: DashboardConfig;
  placeholder?: string;
  className?: string;
  /** Optional domain filter, e.g. "sensor", "calendar" */
  domainFilter?: string;
}

let cachedEntities: HAState[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 1 minute

export default function EntityAutocomplete({
  value,
  onChange,
  config,
  placeholder,
  className,
  domainFilter,
}: EntityAutocompleteProps) {
  const [entities, setEntities] = useState<HAState[]>(cachedEntities || []);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isConfigured(config)) return;
    if (cachedEntities && Date.now() - cacheTimestamp < CACHE_TTL) {
      setEntities(cachedEntities);
      return;
    }

    const client = createHAClient(config);
    client.getStates().then((states) => {
      cachedEntities = states;
      cacheTimestamp = Date.now();
      setEntities(states);
    }).catch((err) => console.error("Failed to fetch entities:", err));
  }, [config]);

  const filtered = useMemo(() => {
    if (!value || value.length < 2) return [];
    const query = value.toLowerCase();
    return entities
      .filter((e) => {
        if (domainFilter && !e.entity_id.startsWith(domainFilter + ".")) return false;
        return (
          e.entity_id.toLowerCase().includes(query) ||
          (e.attributes?.friendly_name || "").toLowerCase().includes(query)
        );
      })
      .slice(0, 20);
  }, [value, entities, domainFilter]);

  const showDropdown = open && focused && filtered.length > 0;

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
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setFocused(true);
          setOpen(true);
        }}
        onBlur={() => {
          // Delay to allow click on dropdown
          setTimeout(() => setFocused(false), 150);
        }}
        placeholder={placeholder}
        className={className}
      />
      {showDropdown && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-lg"
        >
          {filtered.map((entity) => (
            <button
              key={entity.entity_id}
              type="button"
              className={cn(
                "flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-accent",
                entity.entity_id === value && "bg-accent"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(entity.entity_id);
                setOpen(false);
              }}
            >
              <span className="font-medium text-foreground">{entity.entity_id}</span>
              {entity.attributes?.friendly_name && (
                <span className="text-xs text-muted-foreground">
                  {entity.attributes.friendly_name} — {entity.state}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
