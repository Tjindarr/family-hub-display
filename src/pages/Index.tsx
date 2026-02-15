import { useMemo } from "react";
import ClockWidget from "@/components/ClockWidget";
import CalendarWidget from "@/components/CalendarWidget";
import TemperatureWidget from "@/components/TemperatureWidget";
import ElectricityWidget from "@/components/ElectricityWidget";
import ConfigPanel from "@/components/ConfigPanel";
import ConnectionStatus from "@/components/ConnectionStatus";
import { useKioskMode } from "@/hooks/useKioskMode";
import { Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useDashboardConfig,
  useTemperatureData,
  useCalendarData,
  useElectricityPrices,
} from "@/hooks/useDashboardData";

function getDefaultWidgetIds(tempCount: number): string[] {
  return [
    "clock",
    ...Array.from({ length: tempCount }, (_, i) => `temp_${i}`),
    "electricity",
    "calendar",
  ];
}

const Index = () => {
  const { config, updateConfig, isConfigured } = useDashboardConfig();
  const { sensors: tempSensors, loading: tempLoading } = useTemperatureData(config);
  const { events, loading: calLoading } = useCalendarData(config);
  const { nordpool, loading: priceLoading } = useElectricityPrices(config);
  const { isKiosk, enterKiosk, exitKiosk } = useKioskMode();

  const gridColumns = config.gridColumns || 4;

  // Resolve ordered widget IDs
  const allWidgetIds = useMemo(() => {
    const defaults = getDefaultWidgetIds(config.temperatureEntities.length);
    if (config.widgetOrder && config.widgetOrder.length > 0) {
      // Use saved order, but add any new widgets not in order and remove stale ones
      const validSet = new Set(defaults);
      const ordered = config.widgetOrder.filter((id) => validSet.has(id));
      const missing = defaults.filter((id) => !ordered.includes(id));
      return [...ordered, ...missing];
    }
    return defaults;
  }, [config.widgetOrder, config.temperatureEntities.length]);

  const renderWidget = (id: string) => {
    if (id === "clock") return <ClockWidget />;
    if (id === "electricity") return <ElectricityWidget nordpool={nordpool} loading={priceLoading} />;
    if (id === "calendar") return <CalendarWidget events={events} loading={calLoading} />;
    if (id.startsWith("temp_")) {
      const idx = parseInt(id.split("_")[1], 10);
      const sensor = tempSensors[idx];
      if (!sensor) return null;
      return <TemperatureWidget sensor={sensor} loading={tempLoading} />;
    }
    return null;
  };

  const getColSpan = (id: string) => {
    if (config.widgetLayouts?.[id]?.colSpan) return config.widgetLayouts[id].colSpan;
    if (id === "electricity" || id === "calendar") return 2;
    return 1;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {!isKiosk && (
        <>
          <ConfigPanel config={config} onSave={updateConfig} />
          <Button
            variant="ghost"
            size="icon"
            onClick={enterKiosk}
            className="fixed right-14 top-4 z-50 text-muted-foreground hover:text-foreground"
            title="Enter kiosk mode"
          >
            <Monitor className="h-5 w-5" />
          </Button>
        </>
      )}

      {/* Header - hidden in kiosk */}
      {!isKiosk && (
        <header className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Home Dashboard
            </h1>
            <div className="flex items-center gap-3">
              <ConnectionStatus isConfigured={isConfigured} />
              <span className="text-xs text-muted-foreground">v1.0.0</span>
            </div>
          </div>
        </header>
      )}

      {/* Grid */}
      <div
        className="grid gap-4 md:gap-5"
        style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
      >
        {allWidgetIds.map((id) => {
          const widget = renderWidget(id);
          if (!widget) return null;
          const span = Math.min(getColSpan(id), gridColumns);
          return (
            <div key={id} style={{ gridColumn: `span ${span}` }}>
              {widget}
            </div>
          );
        })}
      </div>

      {/* Kiosk exit hint */}
      {isKiosk && (
        <div className="fixed bottom-2 right-2 text-[10px] text-muted-foreground/30 select-none">
          Triple-click to exit kiosk
        </div>
      )}
    </div>
  );
};

export default Index;
