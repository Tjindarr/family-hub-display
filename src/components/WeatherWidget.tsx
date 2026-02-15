import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, CloudFog, Sunrise, Sunset, Droplets, Wind, Thermometer } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, ComposedChart, CartesianGrid, Tooltip, Cell } from "recharts";

export interface WeatherForecastDay {
  date: string;
  tempHigh: number;
  tempLow: number;
  condition: string;
  precipitation: number | null; // mm
  sunrise: string | null;
  sunset: string | null;
}

export interface WeatherData {
  current: {
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    dewPoint?: number;
    cloudCoverage?: number;
    uvIndex?: number;
    pressure?: number;
    windBearing?: number;
    windGustSpeed?: number;
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

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
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

  // Find today's forecast for sunrise/sunset
  const todayForecast = weather.forecast.find((d) => isToday(d.date));

  // Chart data
  const chartData = weather.forecast.map((day) => ({
    name: formatShortDay(day.date),
    high: Math.round(day.tempHigh),
    low: Math.round(day.tempLow),
    precipitation: day.precipitation ?? 0,
    condition: day.condition,
    date: day.date,
  }));

  // Temp range for chart domain
  const allTemps = chartData.flatMap((d) => [d.high, d.low]);
  const minTemp = Math.min(...allTemps) - 3;
  const maxTemp = Math.max(...allTemps) + 3;
  const maxPrecip = Math.max(...chartData.map((d) => d.precipitation), 1);

  return (
    <div className="widget-card h-full">
      {/* Header row: title + current conditions */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sun className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Weather</h3>
        </div>

        {/* Sunrise/Sunset for today only */}
        {(showSunrise || showSunset) && todayForecast && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {showSunrise && todayForecast.sunrise && (
              <div className="flex items-center gap-1">
                <Sunrise className="h-3.5 w-3.5 text-yellow-500" />
                <span>{todayForecast.sunrise}</span>
              </div>
            )}
            {showSunset && todayForecast.sunset && (
              <div className="flex items-center gap-1">
                <Sunset className="h-3.5 w-3.5 text-orange-400" />
                <span>{todayForecast.sunset}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Current conditions */}
      <div className="mb-4 flex items-center gap-4 rounded-lg border border-border/50 bg-muted/30 p-3">
        {getWeatherIcon(weather.current.condition, 40)}
        <div className="flex-1">
          <div className="text-3xl font-bold text-foreground">{Math.round(weather.current.temperature)}°</div>
          <div className="text-xs capitalize text-muted-foreground">{weather.current.condition.replace(/_/g, " ")}</div>
        </div>
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Droplets className="h-3 w-3" />
            <span>{Math.round(weather.current.humidity)}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Wind className="h-3 w-3" />
            <span>{weather.current.windSpeed} km/h</span>
          </div>
          {weather.current.cloudCoverage != null && (
            <div className="flex items-center gap-1">
              <Cloud className="h-3 w-3" />
              <span>{Math.round(weather.current.cloudCoverage)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Forecast chart */}
      <div className="rounded-lg border border-border/50 bg-muted/30 p-2">
        {/* Day labels + icons */}
        <div className="flex justify-around mb-1">
          {chartData.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className="text-[10px] font-medium text-muted-foreground">{d.name}</span>
              {getWeatherIcon(d.condition, 16)}
            </div>
          ))}
        </div>

        {/* Combined chart: precipitation bars + temp lines */}
        <ResponsiveContainer width="100%" height={120}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            {showPrecipitation && (
              <Bar
                dataKey="precipitation"
                yAxisId="precip"
                fill="hsl(210, 80%, 60%)"
                opacity={0.2}
                radius={[2, 2, 0, 0]}
                isAnimationActive={false}
              />
            )}
            <Area
              type="monotone"
              dataKey="high"
              yAxisId="temp"
              stroke="hsl(0, 70%, 60%)"
              fill="hsl(0, 70%, 60%)"
              fillOpacity={0.1}
              strokeWidth={2}
              dot={{ r: 3, fill: "hsl(0, 70%, 60%)" }}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="low"
              yAxisId="temp"
              stroke="hsl(210, 70%, 60%)"
              fill="hsl(210, 70%, 60%)"
              fillOpacity={0.1}
              strokeWidth={2}
              dot={{ r: 3, fill: "hsl(210, 70%, 60%)" }}
              isAnimationActive={false}
            />
            <YAxis yAxisId="temp" domain={[minTemp, maxTemp]} hide />
            <YAxis yAxisId="precip" domain={[0, maxPrecip * 4]} hide orientation="right" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(var(--foreground))",
              }}
              formatter={(value: number, name: string) => {
                if (name === "high") return [`${value}°`, "High"];
                if (name === "low") return [`${value}°`, "Low"];
                if (name === "precipitation") return [`${value} mm`, "Precip"];
                return [value, name];
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* High/Low labels under chart */}
        <div className="flex justify-around mt-0.5">
          {chartData.map((d, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className="text-xs font-semibold text-foreground">{d.high}°</span>
              <span className="text-[10px] text-muted-foreground">{d.low}°</span>
              {showPrecipitation && d.precipitation > 0 && (
                <span className="text-[9px] text-blue-400">{d.precipitation} mm</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
