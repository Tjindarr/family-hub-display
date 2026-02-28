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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isConfigured(config)) return;
    if (cachedEntities && Date.now() - cacheTimestamp < CACHE_TTL) {
      setEntities(cachedEntities);
      return;
    }

    setFetchError(null);
    const client = createHAClient(config);
    client.getStates().then((states) => {
      cachedEntities = states;
      cacheTimestamp = Date.now();
      setEntities(states);
      console.log(`Fetched ${states.length} entities from HA`);
    }).catch((err) => {
      console.error("Failed to fetch entities:", err);
      setFetchError(err.message || "Connection failed");
    });
  }, [config]);

  // Determine if we're in "attribute mode": value matches an existing entity_id + "."
  const attributeMode = useMemo(() => {
    if (!value || !value.includes(".")) return null;
    // Try to find the longest matching entity_id prefix
    // Entity IDs have format "domain.object_id", so at minimum 2 dot-separated parts
    const parts = value.split(".");
    if (parts.length < 3) return null; // need at least domain.name.attr_partial
    
    // The entity_id is "domain.object_id" — try the first two parts
    const candidateId = parts[0] + "." + parts[1];
    const entity = entities.find((e) => e.entity_id === candidateId);
    if (!entity) return null;
    
    const attrQuery = parts.slice(2).join(".").toLowerCase();
    return { entity, entityId: candidateId, attrQuery };
  }, [value, entities]);

  const filtered = useMemo(() => {
    // Attribute mode: show attributes of the matched entity
    if (attributeMode) {
      const { entity, attrQuery } = attributeMode;
      const attrs = entity.attributes || {};
      const attrKeys = Object.keys(attrs);
      // Always include "state" as an option (the default)
      const allOptions = ["state", ...attrKeys.filter((k) => k !== "state")];
      return allOptions
        .filter((key) => !attrQuery || key.toLowerCase().includes(attrQuery))
        .slice(0, 25)
        .map((key) => ({
          key,
          value: key === "state" ? entity.state : String(attrs[key] ?? ""),
        }));
    }

    // Normal entity mode
    if (!value || value.length < 2) return [];
    const query = value.toLowerCase();
    return entities
      .filter((e) => {
        if (domainFilter && !domainFilter.split(",").some(d => e.entity_id.startsWith(d.trim() + "."))) return false;
        return (
          e.entity_id.toLowerCase().includes(query) ||
          (e.attributes?.friendly_name || "").toLowerCase().includes(query)
        );
      })
      .slice(0, 20)
      .map((e) => ({ entity: e }));
  }, [value, entities, domainFilter, attributeMode]);

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
          setTimeout(() => setFocused(false), 150);
        }}
        placeholder={placeholder}
        className={className}
      />
      {fetchError && (
        <p className="mt-1 text-xs text-destructive">
          Could not reach HA: {fetchError}
        </p>
      )}
      {showDropdown && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-lg"
        >
          {attributeMode
            ? (filtered as { key: string; value: string }[]).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent",
                    value === `${attributeMode.entityId}.${item.key}` && "bg-accent"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (item.key === "state") {
                      // Select just the entity (no attribute)
                      onChange(attributeMode.entityId);
                    } else {
                      onChange(`${attributeMode.entityId}.${item.key}`);
                    }
                    setOpen(false);
                  }}
                >
                  <span className="font-medium text-foreground">{item.key}</span>
                  <span className="text-xs text-muted-foreground truncate ml-2 max-w-[50%]">{item.value}</span>
                </button>
              ))
            : (filtered as { entity: HAState }[]).map((item) => (
                <button
                  key={item.entity.entity_id}
                  type="button"
                  className={cn(
                    "flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-accent",
                    item.entity.entity_id === value && "bg-accent"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(item.entity.entity_id);
                    setOpen(false);
                  }}
                >
                  <span className="font-medium text-foreground">{item.entity.entity_id}</span>
                  {item.entity.attributes?.friendly_name && (
                    <span className="text-xs text-muted-foreground">
                      {item.entity.attributes.friendly_name} — {item.entity.state}
                    </span>
                  )}
                </button>
              ))}
        </div>
      )}
    </div>
  );
}
