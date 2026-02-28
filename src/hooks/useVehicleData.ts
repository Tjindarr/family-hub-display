import { useState, useEffect, useCallback } from "react";
import { DashboardConfig, isConfigured as checkConfigured, type HAState, type VehicleConfig } from "@/lib/config";
import type { GetCachedState, OnStateChange } from "@/hooks/useDashboardData";
import { resolveEntityValue, parseEntityRef } from "@/lib/entity-resolver";

export interface VehicleEntityData {
  entityId: string;
  label: string;
  icon: string;
  unit: string;
  color: string;
  value: string;
  numericValue: number | null;
}

export interface VehicleSectionData {
  id: string;
  type: string;
  label: string;
  entities: VehicleEntityData[];
}

export interface VehicleLiveData {
  id: string;
  name: string;
  icon: string;
  sections: VehicleSectionData[];
}

function generateMockVehicle(vc: VehicleConfig): VehicleLiveData {
  return {
    id: vc.id,
    name: vc.name,
    icon: vc.icon,
    sections: vc.sections.map((s) => ({
      id: s.id,
      type: s.type,
      label: s.label,
      entities: s.entities.map((e) => {
        let mockVal = "—";
        if (s.type === "battery") mockVal = `${Math.floor(60 + Math.random() * 35)}`;
        else if (s.type === "fuel") mockVal = `${Math.floor(20 + Math.random() * 60)}`;
        else if (s.type === "location") mockVal = "Home";
        else if (s.type === "climate") mockVal = `${(18 + Math.random() * 6).toFixed(1)}`;
        else if (s.type === "doors") mockVal = Math.random() > 0.5 ? "locked" : "unlocked";
        else if (s.type === "tires") mockVal = `${(2.0 + Math.random() * 0.5).toFixed(1)}`;
        else mockVal = `${(Math.random() * 100).toFixed(1)}`;
        const num = parseFloat(mockVal);
        return {
          entityId: e.entityId,
          label: e.label,
          icon: e.icon,
          unit: e.unit,
          color: e.color,
          value: mockVal,
          numericValue: isNaN(num) ? null : num,
        };
      }),
    })),
  };
}

export function useVehicleData(
  config: DashboardConfig,
  getCachedState?: GetCachedState,
  onStateChange?: OnStateChange
) {
  const [vehicleDataMap, setVehicleDataMap] = useState<Record<string, VehicleLiveData>>({});
  const [loading, setLoading] = useState(true);

  const updateFromCache = useCallback(() => {
    const vehicles = config.vehicles || [];
    if (vehicles.length === 0) { setVehicleDataMap({}); setLoading(false); return; }
    if (!checkConfigured(config) || !getCachedState) return;

    const result: Record<string, VehicleLiveData> = {};
    for (const vc of vehicles) {
      result[vc.id] = {
        id: vc.id,
        name: vc.name,
        icon: vc.icon,
        sections: vc.sections.map((s) => ({
          id: s.id,
          type: s.type,
          label: s.label,
          entities: s.entities.map((e) => {
            const resolved = resolveEntityValue(e.entityId, getCachedState);
            const val = resolved.value ?? "—";
            const num = parseFloat(val);
            return {
              entityId: e.entityId,
              label: e.label,
              icon: e.icon,
              unit: e.unit || resolved.unit || "",
              color: e.color,
              value: val,
              numericValue: isNaN(num) ? null : num,
            };
          }),
        })),
      };
    }
    setVehicleDataMap(result);
    setLoading(false);
  }, [config, getCachedState]);

  const fetchData = useCallback(() => {
    const vehicles = config.vehicles || [];
    if (vehicles.length === 0) { setVehicleDataMap({}); setLoading(false); return; }

    if (!checkConfigured(config)) {
      const mock: Record<string, VehicleLiveData> = {};
      for (const vc of vehicles) {
        mock[vc.id] = generateMockVehicle(vc);
      }
      setVehicleDataMap(mock);
      setLoading(false);
      return;
    }

    updateFromCache();
  }, [config, updateFromCache]);

  // WS listener
  useEffect(() => {
    if (!onStateChange || !checkConfigured(config)) return;
    const entityIds = new Set<string>();
    for (const vc of (config.vehicles || [])) {
      for (const s of vc.sections) {
        for (const e of s.entities) {
          if (e.entityId) entityIds.add(parseEntityRef(e.entityId).entityId);
        }
      }
    }
    if (entityIds.size === 0) return;
    const unsubscribe = onStateChange((entityId) => {
      if (entityId === "__bulk_load__" || entityIds.has(entityId)) updateFromCache();
    });
    return unsubscribe;
  }, [onStateChange, config, updateFromCache]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { vehicleDataMap, loading };
}
