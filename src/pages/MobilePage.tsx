import { useEffect, useMemo, useState } from "react";
import { useManifest } from "@/hooks/useManifest";
import {
  useDashboardConfig,
  useTemperatureData,
  useCalendarData,
  useElectricityPrices,
  usePersonData,
  useWeatherData,
  useFoodMenuData,
} from "@/hooks/useDashboardData";
import { useHAWebSocket } from "@/hooks/useHAWebSocket";
import { useGeneralSensorData } from "@/hooks/useGeneralSensorData";
import { useSensorGridData } from "@/hooks/useSensorGridData";
import { useRssNews } from "@/hooks/useRssNews";
import { useNotificationData } from "@/hooks/useNotificationData";
import { useVehicleData } from "@/hooks/useVehicleData";
import { usePollenData } from "@/hooks/usePollenData";
import { resolveFontSizes } from "@/lib/fontSizes";
import { runAction } from "@/lib/actions";

import SensorGridWidget from "@/components/SensorGridWidget";
import GeneralSensorWidget from "@/components/GeneralSensorWidget";
import ActionWidget from "@/components/ActionWidget";
import CameraGridWidget from "@/components/CameraGridWidget";
import WallpaperBackground from "@/components/WallpaperBackground";
import CalendarWidget from "@/components/CalendarWidget";
import TemperatureWidget from "@/components/TemperatureWidget";
import ElectricityWidget from "@/components/ElectricityWidget";
import PhotoWidget from "@/components/PhotoWidget";
import PersonWidget from "@/components/PersonWidget";
import WeatherWidget from "@/components/WeatherWidget";
import FoodMenuWidget from "@/components/FoodMenuWidget";
import RssNewsWidget from "@/components/RssNewsWidget";
import NotificationWidget from "@/components/NotificationWidget";
import VehicleWidget from "@/components/VehicleWidget";
import PollenWidget from "@/components/PollenWidget";
import ChoreWidget from "@/components/ChoreWidget";

import { ChevronDown, ChevronRight, Settings as SettingsIcon } from "lucide-react";
import { Link } from "react-router-dom";

export default function MobilePage() {
  useManifest("/manifest-mobile.json", "/icon-mobile.png", "HomeDash Mobile");
  const { config } = useDashboardConfig();
  const { getState: getCachedState, getAllStates, onStateChange } = useHAWebSocket(config);

  // All data hooks the dashboard widgets need
  const { dataMap: generalData, loading: generalLoading } = useGeneralSensorData(config, getCachedState, onStateChange);
  const { dataMap: gridData, loading: gridLoading } = useSensorGridData(config, getCachedState, onStateChange);
  const { sensors: tempSensors, loading: tempLoading } = useTemperatureData(config, getCachedState, onStateChange);
  const { events, loading: calLoading } = useCalendarData(config);
  const { nordpool, loading: priceLoading } = useElectricityPrices(config, getCachedState, onStateChange);
  const { persons, loading: personLoading } = usePersonData(config, getCachedState, onStateChange, getAllStates);
  const { weather, loading: weatherLoading } = useWeatherData(config, getCachedState, onStateChange);
  const { menuDays, loading: menuLoading } = useFoodMenuData(config);
  const { dataMap: rssData, loading: rssLoading } = useRssNews(config.rssFeeds || [], config.refreshInterval);
  const { notifications, loading: notifLoading } = useNotificationData(config, getCachedState, onStateChange, getAllStates);
  const { vehicleDataMap, loading: vehicleLoading } = useVehicleData(config, getCachedState, onStateChange);
  const { pollenData, loading: pollenLoading } = usePollenData(config.pollenConfig, getCachedState, onStateChange);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", config.theme || "midnight-teal");
  }, [config.theme]);

  const sections = config.mobileLayout?.sections || [];
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.filter((s) => s.collapsed).map((s) => [s.id, true])),
  );

  const fs = useMemo(() => resolveFontSizes(config.globalFontSizes, {}), [config.globalFontSizes]);
  const getFontSizes = (widgetId: string) => resolveFontSizes(config.globalFontSizes, config.widgetFontSizes?.[widgetId]);
  const ws = config.widgetStyles || {};

  const handleCellAction = (cell: { action?: any; confirmAction?: boolean; label?: string }) => {
    if (!cell.action) return;
    if (cell.confirmAction && !window.confirm(`Run action for "${cell.label || ""}"?`)) return;
    runAction(cell.action);
  };
  const handleInfoAction = (item: { action: any; confirmAction?: boolean; label?: string }) => {
    if (item.confirmAction && !window.confirm(`Run action for "${item.label || ""}"?`)) return;
    runAction(item.action);
  };

  // Render any dashboard widget by its full id (e.g. "weather", "person_0", "rss_xyz")
  const renderWidgetById = (id: string, key: string) => {
    const widgetFs = getFontSizes(id);
    if (id === "electricity")
      return <ElectricityWidget key={key} nordpool={nordpool} loading={priceLoading} electricityStyle={config.electricityStyle} />;
    if (id === "calendar")
      return (
        <CalendarWidget
          key={key}
          events={events}
          loading={calLoading}
          fontSizes={widgetFs}
          dayColor={config.calendarDayColor}
          timeColor={config.calendarTimeColor}
          display={config.calendarDisplay}
          timeFormat={config.globalFormat?.timeFormat}
          widgetStyle={ws.calendar}
        />
      );
    if (id === "weather")
      return (
        <WeatherWidget
          key={key}
          weather={weather}
          loading={weatherLoading}
          showPrecipitation={config.weatherConfig?.showPrecipitation ?? true}
          showSunrise={config.weatherConfig?.showSunrise ?? true}
          showSunset={config.weatherConfig?.showSunset ?? true}
          weatherConfig={config.weatherConfig}
        />
      );
    if (id === "photos") return <PhotoWidget key={key} config={config.photoWidget} isDemo={false} />;
    if (id === "food_menu")
      return (
        <FoodMenuWidget
          key={key}
          days={menuDays}
          loading={menuLoading}
          fontSizes={widgetFs}
          displayMode={config.foodMenuConfig?.displayMode}
          style={config.foodMenuConfig?.style}
          showTitle={config.foodMenuConfig?.showTitle !== false}
        />
      );
    if (id === "notifications") return <NotificationWidget key={key} notifications={notifications} loading={notifLoading} />;
    if (id === "pollen") return <PollenWidget key={key} data={pollenData} loading={pollenLoading} pollenConfig={config.pollenConfig} />;
    if (id === "chores" && (config.enableChores || config.choreWidgetConfig?.enabled))
      return <ChoreWidget key={key} config={config.choreWidgetConfig} />;
    if (id.startsWith("temp_group_")) {
      const groupNum = parseInt(id.split("_")[2], 10);
      const groupSensors = tempSensors.filter((_, i) => (config.temperatureEntities[i]?.group ?? i) === groupNum);
      if (groupSensors.length === 0) return null;
      return <TemperatureWidget key={key} sensors={groupSensors} loading={tempLoading} fontSizes={widgetFs} />;
    }
    if (id.startsWith("person_")) {
      const idx = parseInt(id.split("_")[1], 10);
      const person = persons[idx];
      if (!person) return null;
      return (
        <PersonWidget
          key={key}
          person={person}
          loading={personLoading}
          fontSizes={widgetFs}
          personFontSizes={config.personCardFontSizes}
          widgetStyle={ws.person}
        />
      );
    }
    if (id.startsWith("general_")) {
      const sid = id.replace("general_", "");
      const sCfg = (config.generalSensors || []).find((s) => s.id === sid);
      if (!sCfg) return null;
      const sensorFs = sCfg.fontSize
        ? resolveFontSizes(config.globalFontSizes, { ...config.widgetFontSizes?.[id], ...sCfg.fontSize })
        : widgetFs;
      return (
        <GeneralSensorWidget
          key={key}
          config={sCfg}
          data={generalData[sid]}
          loading={generalLoading}
          fontSizes={sensorFs}
          onInfoAction={handleInfoAction}
          onHeaderAction={sCfg.headerAction ? () => {
            if (sCfg.confirmAction && !window.confirm(`Run action for "${sCfg.label}"?`)) return;
            runAction(sCfg.headerAction!);
          } : undefined}
        />
      );
    }
    if (id.startsWith("sensorgrid_")) {
      const gid = id.replace("sensorgrid_", "");
      const gCfg = (config.sensorGrids || []).find((g) => g.id === gid);
      if (!gCfg) return null;
      return <SensorGridWidget key={key} config={gCfg} data={gridData[gid]} loading={gridLoading} fontSizes={widgetFs} onCellAction={handleCellAction} />;
    }
    if (id.startsWith("action_")) {
      const aid = id.replace("action_", "");
      const aCfg = (config.actionWidgets || []).find((a) => a.id === aid);
      if (!aCfg) return null;
      return <ActionWidget key={key} config={aCfg} getState={getCachedState} compact />;
    }
    if (id.startsWith("cameragrid_")) {
      const cid = id.replace("cameragrid_", "");
      const cCfg = (config.cameraGrids || []).find((c) => c.id === cid);
      if (!cCfg) return null;
      return <CameraGridWidget key={key} config={cCfg} />;
    }
    if (id.startsWith("rss_")) {
      const rid = id.replace("rss_", "");
      const rCfg = (config.rssFeeds || []).find((f) => f.id === rid);
      if (!rCfg) return null;
      return <RssNewsWidget key={key} items={rssData[rid] || []} loading={rssLoading} label={rCfg.label} fontSizes={widgetFs} widgetStyle={ws.rss} />;
    }
    if (id.startsWith("vehicle_")) {
      const vid = id.replace("vehicle_", "");
      const vData = vehicleDataMap[vid];
      if (!vData) return null;
      const vCfg = (config.vehicles || []).find((v) => v.id === vid);
      return <VehicleWidget key={key} data={vData} loading={vehicleLoading} fontSizes={widgetFs} vehicleConfig={vCfg} />;
    }
    return <div key={key} className="text-xs text-muted-foreground">Unknown widget: {id}</div>;
  };

  const renderItem = (kind: string, refId: string, key: string) => {
    if (kind === "sensorGrid") return renderWidgetById(`sensorgrid_${refId}`, key);
    if (kind === "generalSensor") return renderWidgetById(`general_${refId}`, key);
    if (kind === "actionWidget") return renderWidgetById(`action_${refId}`, key);
    if (kind === "cameraGrid") return renderWidgetById(`cameragrid_${refId}`, key);
    if (kind === "widget") return renderWidgetById(refId, key);
    return null;
  };

  return (
    <div className={`min-h-screen text-foreground relative ${config.wallpaper?.enabled && config.wallpaper.url && config.wallpaper.applyToMobile !== false ? "" : "bg-background"}`} style={{ padding: "8px" }}>
      <WallpaperBackground wallpaper={config.wallpaper} context="mobile" />

      <header className="flex items-center justify-between mb-3 px-1">
        <h1 className="text-base font-semibold tracking-tight">HomeDash</h1>
        <Link to="/" className="text-muted-foreground hover:text-foreground p-1" aria-label="Dashboard">
          <SettingsIcon className="h-4 w-4" />
        </Link>
      </header>

      {sections.length === 0 && (
        <div className="mt-12 text-center px-6">
          <p className="text-sm text-muted-foreground mb-2">No mobile layout configured.</p>
          <p className="text-xs text-muted-foreground">
            Open Settings → Mobile on the desktop dashboard to add sections.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {sections.map((sec) => {
          const isCollapsed = collapsed[sec.id];
          return (
            <section key={sec.id} className="flex flex-col gap-2">
              {sec.title && (
                <button
                  onClick={() => setCollapsed((c) => ({ ...c, [sec.id]: !c[sec.id] }))}
                  className="flex items-center gap-1.5 px-1 py-0.5 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {sec.title}
                </button>
              )}
              {!isCollapsed && (
                <div className="flex flex-col gap-2">
                  {(sec.items || []).map((it, i) => renderItem(it.kind, it.refId, `${sec.id}_${i}`))}
                  {(!sec.items || sec.items.length === 0) && (
                    <div className="text-[11px] text-muted-foreground px-2">Empty section</div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
