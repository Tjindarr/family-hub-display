import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, CloudFog, Sunrise, Sunset, Droplets, Wind } from "lucide-react";

export interface WeatherForecastDay {
  date: string;
  tempHigh: number;
  tempLow: number;
  condition: string;
  precipitation: number | null;
  sunrise: string | null;
  sunset: string | null;
}

export interface WeatherData {
  current: {
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
  };
  forecast: WeatherForecastDay[];
}

interface WeatherWidgetProps {
  weather: WeatherData;
  loading: boolean;
  showPrecipitation: boolean;
  showSunrise: boolean;
  showSunset: boolean;
}

function getWeatherIcon(condition: string, size = 20) {
  const c = condition.toLowerCase();
  if (c.includes("thunder") || c.includes("lightning")) return <CloudLightning size={size} className="text-yellow-400" />;
  if (c.includes("snow") || c.includes("sleet") || c.includes("hail")) return <CloudSnow size={size} className="text-blue-200" />;
  if (c.includes("rain") || c.includes("pouring")) return <CloudRain size={size} className="text-blue-400" />;
  if (c.includes("drizzle")) return <CloudDrizzle size={size} className="text-blue-300" />;
  if (c.includes("fog") || c.includes("mist") || c.includes("haz")) return <CloudFog size={size} className="text-muted-foreground" />;
  if (c.includes("cloud") || c.includes("overcast") || c.includes("partlycloudy")) return <Cloud size={size} className="text-muted-foreground" />;
  if (c.includes("clear") || c.includes("sunny")) return <Sun size={size} className="text-yellow-400" />;
  return <Cloud size={size} className="text-muted-foreground" />;
}

function formatShortDay(dateStr: string) {
  const d = new Date(dateStr);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[d.getDay()];
}

export default function WeatherWidget({ weather, loading, showPrecipitation, showSunrise, showSunset }: WeatherWidgetProps) {
  if (loading) {
    return (
      <div className="widget-card h-full">
        <div className="mb-4 flex items-center gap-2">
          <Sun className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Weather</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="widget-card h-full">
      <div className="mb-4 flex items-center gap-2">
        <Sun className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Weather</h3>
      </div>

      {/* Current conditions */}
      <div className="mb-4 flex items-center gap-4 rounded-lg border border-border/50 bg-muted/30 p-3">
        {getWeatherIcon(weather.current.condition, 36)}
        <div className="flex-1">
          <div className="text-2xl font-bold text-foreground">{Math.round(weather.current.temperature)}°</div>
          <div className="text-xs capitalize text-muted-foreground">{weather.current.condition.replace(/_/g, " ")}</div>
        </div>
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Droplets className="h-3 w-3" />
            <span>{weather.current.humidity}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Wind className="h-3 w-3" />
            <span>{weather.current.windSpeed} km/h</span>
          </div>
        </div>
      </div>

      {/* Forecast */}
      <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
        {weather.forecast.map((day, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 transition-colors hover:bg-muted/60"
          >
            <span className="w-8 text-xs font-medium text-muted-foreground">{formatShortDay(day.date)}</span>
            {getWeatherIcon(day.condition, 18)}
            <div className="flex-1 flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{Math.round(day.tempHigh)}°</span>
              <span className="text-xs text-muted-foreground">{Math.round(day.tempLow)}°</span>
            </div>
            {showPrecipitation && day.precipitation != null && (
              <div className="flex items-center gap-1 text-xs text-blue-400">
                <Droplets className="h-3 w-3" />
                <span>{day.precipitation}%</span>
              </div>
            )}
            {showSunrise && day.sunrise && (
              <div className="flex items-center gap-1 text-xs text-yellow-500">
                <Sunrise className="h-3 w-3" />
                <span>{day.sunrise}</span>
              </div>
            )}
            {showSunset && day.sunset && (
              <div className="flex items-center gap-1 text-xs text-orange-400">
                <Sunset className="h-3 w-3" />
                <span>{day.sunset}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
