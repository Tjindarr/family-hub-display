import ClockWidget from "@/components/ClockWidget";
import CalendarWidget from "@/components/CalendarWidget";
import TemperatureWidget from "@/components/TemperatureWidget";
import ElectricityWidget from "@/components/ElectricityWidget";
import ConfigPanel from "@/components/ConfigPanel";
import ConnectionStatus from "@/components/ConnectionStatus";
import {
  useDashboardConfig,
  useTemperatureData,
  useCalendarData,
  useElectricityPrices,
} from "@/hooks/useDashboardData";

const Index = () => {
  const { config, updateConfig, isConfigured } = useDashboardConfig();
  const { series: tempSeries, loading: tempLoading } = useTemperatureData(config);
  const { events, loading: calLoading } = useCalendarData(config);
  const { prices, loading: priceLoading } = useElectricityPrices(config);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <ConfigPanel config={config} onSave={updateConfig} />

      {/* Header */}
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Home Dashboard
          </h1>
          <ConnectionStatus isConfigured={isConfigured} />
        </div>
      </header>

      {/* Grid */}
      <div className="grid gap-4 md:gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {/* Clock */}
        <div className="md:col-span-1">
          <ClockWidget />
        </div>

        {/* Electricity - current price stat card */}
        <div className="xl:col-span-2">
          <ElectricityWidget prices={prices} loading={priceLoading} />
        </div>

        {/* Temperature */}
        <div className="md:col-span-2">
          <TemperatureWidget series={tempSeries} loading={tempLoading} />
        </div>

        {/* Calendar */}
        <div className="md:col-span-1 xl:col-span-1">
          <CalendarWidget events={events} loading={calLoading} />
        </div>
      </div>
    </div>
  );
};

export default Index;
