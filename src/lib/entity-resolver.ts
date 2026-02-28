import type { HAState } from "@/lib/config";

/**
 * Parse an entity reference that may include an attribute suffix.
 * Format: "domain.object_id" or "domain.object_id.attribute_name"
 *
 * Examples:
 *   "sensor.temperature"           → { entityId: "sensor.temperature", attribute: null }
 *   "sensor.phone.battery_level"   → { entityId: "sensor.phone", attribute: "battery_level" }
 */
export function parseEntityRef(ref: string): { entityId: string; attribute: string | null } {
  const parts = ref.split(".");
  if (parts.length >= 3) {
    return {
      entityId: parts[0] + "." + parts[1],
      attribute: parts.slice(2).join("."),
    };
  }
  return { entityId: ref, attribute: null };
}

/**
 * Resolve a value from a cached HA state, supporting the entity_id.attribute format.
 * Returns the attribute value if specified, otherwise the entity state.
 */
export function resolveEntityValue(
  ref: string,
  getCachedState: (entityId: string) => HAState | undefined
): { state: HAState | undefined; value: string | null; unit: string | undefined } {
  const { entityId, attribute } = parseEntityRef(ref);
  const haState = getCachedState(entityId);
  if (!haState) return { state: undefined, value: null, unit: undefined };

  if (attribute && attribute !== "state") {
    const attrVal = haState.attributes?.[attribute];
    return {
      state: haState,
      value: attrVal != null ? String(attrVal) : null,
      unit: undefined,
    };
  }

  return {
    state: haState,
    value: haState.state,
    unit: haState.attributes?.unit_of_measurement || undefined,
  };
}
