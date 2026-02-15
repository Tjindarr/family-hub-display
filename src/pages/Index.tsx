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

const Index = () => {
  const { config, updateConfig, isConfigured } = useDashboardConfig();
  const { sensors: tempSensors, loading: tempLoading } = useTemperatureData(config);
  const { events, loading: calLoading } = useCalendarData(config);
  const { nordpool, loading: priceLoading } = useElectricityPrices(config);
  const { isKiosk, enterKiosk, exitKiosk } = useKioskMode();

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
      <div className="grid gap-4 md:gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        {/* Clock */}
        <div className="md:col-span-1">
          <ClockWidget />
        </div>

        {/* Temperature sensors - individual small cards */}
        {tempSensors.map((sensor) => (
          <div key={sensor.entityId} className="md:col-span-1">
            <TemperatureWidget sensor={sensor} loading={tempLoading} />
          </div>
        ))}

        {/* Electricity */}
        <div className="md:col-span-1 xl:col-span-2">
          <ElectricityWidget nordpool={nordpool} loading={priceLoading} />
        </div>

        {/* Calendar */}
        <div className="md:col-span-1 xl:col-span-2">
          <CalendarWidget events={events} loading={calLoading} />
        </div>
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
