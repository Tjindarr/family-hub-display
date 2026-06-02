import { toast } from "sonner";
import type { EntityAction } from "./config-types";
import { createHAClient } from "./ha-api";

function domainOf(entityId: string): string {
  return entityId.split(".")[0] || "homeassistant";
}

export async function runAction(action: EntityAction): Promise<void> {
  const ha = createHAClient();
  try {
    if (action.type === "toggle") {
      const domain = domainOf(action.entityId);
      // homeassistant.toggle works across most domains (light, switch, fan, cover, input_boolean, etc.)
      const useDomain = ["light", "switch", "fan", "input_boolean", "cover", "media_player", "automation", "script"].includes(domain)
        ? domain
        : "homeassistant";
      await ha.callService(useDomain, "toggle", { entity_id: action.entityId });
    } else if (action.type === "service") {
      await ha.callService(action.domain, action.service, action.data);
    } else if (action.type === "navigate") {
      window.open(action.url, "_blank", "noopener");
    }
  } catch (err: any) {
    toast.error("Action failed", { description: err?.message || String(err) });
    throw err;
  }
}

export function actionLabel(action: EntityAction): string {
  if (action.type === "toggle") return `Toggle ${action.entityId}`;
  if (action.type === "service") return `${action.domain}.${action.service}`;
  return `Open ${action.url}`;
}
