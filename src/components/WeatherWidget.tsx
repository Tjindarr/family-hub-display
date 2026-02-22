import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Sun, Moon, Cloud, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, CloudFog, CloudSun, CloudMoon, Sunrise, Sunset, Droplets, Wind } from "lucide-react";
import { Area, YAxis, ResponsiveContainer, ComposedChart, Bar, Tooltip } from "recharts";
import type { WeatherConfig } from "@/lib/config";

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
  weatherConfig?: WeatherConfig;
}

function getWeatherIcon(condition: string, size = 20) {
  const c = condition.toLowerCase().replace(/[_-]/g, "");
  if (c === "clearnight") return <Moon size={size} className="text-indigo-300 drop-shadow-[0_0_4px_rgba(165,180,252,0.6)]" />;
  if (c === "partlycloudy") return <CloudSun size={size} className="text-amber-300 drop-shadow-[0_0_4px_rgba(252,211,77,0.5)]" />;
  if (c.includes("thunder") || c.includes("lightning")) return <CloudLightning size={size} className="text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />;
  if (c.includes("snow") || c.includes("sleet") || c.includes("hail")) return <CloudSnow size={size} className="text-sky-300 drop-shadow-[0_0_4px_rgba(125,211,252,0.5)]" />;
  if (c.includes("pouring")) return <CloudRain size={size} className="text-blue-500 drop-shadow-[0_0_4px_rgba(59,130,246,0.5)]" />;
  if (c.includes("rainy") || c.includes("rain")) return <CloudRain size={size} className="text-blue-400 drop-shadow-[0_0_4px_rgba(96,165,250,0.5)]" />;
  if (c.includes("drizzle")) return <CloudDrizzle size={size} className="text-blue-300" />;
  if (c.includes("fog") || c.includes("mist") || c.includes("haz")) return <CloudFog size={size} className="text-slate-400" />;
  if (c.includes("cloudy") || c.includes("overcast")) return <Cloud size={size} className="text-slate-300" />;
  if (c.includes("sunny") || c.includes("clear")) return <Sun size={size} className="text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]" />;
  return <Cloud size={size} className="text-slate-400" />;
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

export default function WeatherWidget({ weather, loading, showPrecipitation, showSunrise, showSunset, weatherConfig }: WeatherWidgetProps) {
  const wc = weatherConfig || {} as Partial<WeatherConfig>;
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="widget-card h-full">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const todayForecast = weather.forecast.find((d) => isToday(d.date));

  const chartData = weather.forecast.map((day) => ({
    name: formatShortDay(day.date),
    high: Math.round(day.tempHigh),
    low: Math.round(day.tempLow),
    precipitation: day.precipitation ?? 0,
    condition: day.condition,
    date: day.date,
  }));

  const allTemps = chartData.flatMap((d) => [d.high, d.low]);
  const minTemp = Math.min(...allTemps) - 3;
  const maxTemp = Math.max(...allTemps) + 3;
  const maxPrecip = Math.max(...chartData.map((d) => d.precipitation), 1);

  // Defaults
  const clockSize = wc.clockTextSize || 50;
  const clockColor = wc.clockTextColor || "hsl(var(--foreground))";
  const tempIconSz = wc.tempIconSize || 40;
  const tempTxtSz = wc.tempTextSize || 30;
  const tempColor = wc.tempTextColor || "hsl(var(--foreground))";
  const sunIconSz = wc.sunIconSize || 16;
  const sunTxtSz = wc.sunTextSize || 14;
  const sunTxtColor = wc.sunTextColor || "hsl(var(--foreground))";
  const sunIcColor = wc.sunIconColor || undefined;
  const chartDaySz = wc.chartDayTextSize || 10;
  const chartDayColor = wc.chartDayTextColor || "hsl(var(--muted-foreground))";
  const chartIcSz = wc.chartIconSize || 32;

  const secondsSize = Math.round(clockSize * 0.5);

  return (
    <div className="widget-card h-full">
      {/* Current conditions - 3 columns */}
      <div className="mb-1 flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-[2px] py-0">
        {/* Left: time + date */}
        <div>
          <div className="font-bold" style={{ fontSize: clockSize, color: clockColor }}>
            {format(now, "HH:mm")}
            <span style={{ fontSize: secondsSize, color: "hsl(var(--muted-foreground))" }}>:{format(now, "ss")}</span>
          </div>
          {wc.showDate && (
            <div style={{ fontSize: wc.dateTextSize || 14, color: wc.dateTextColor || "hsl(var(--muted-foreground))" }}>
              {format(now, "EEEE, d MMMM")}
            </div>
          )}
        </div>

        {/* Center: icon + temp */}
        <div className="flex items-center gap-3">
          {getWeatherIcon(weather.current.condition, tempIconSz)}
          <div>
            <div className="font-bold" style={{ fontSize: tempTxtSz, color: tempColor }}>{Math.round(weather.current.temperature)}°</div>
          </div>
        </div>

        {/* Right: sunrise/sunset */}
        {(showSunrise || showSunset) && todayForecast && (
          <div className="flex flex-col gap-1.5">
            {showSunrise && todayForecast.sunrise && (
              <div className="flex items-center gap-2">
                <Sunrise style={{ width: sunIconSz, height: sunIconSz, color: sunIcColor || "hsl(50, 90%, 55%)" }} />
                <span className="font-medium" style={{ fontSize: sunTxtSz, color: sunTxtColor }}>{todayForecast.sunrise}</span>
              </div>
            )}
            {showSunset && todayForecast.sunset && (
              <div className="flex items-center gap-2">
                <Sunset style={{ width: sunIconSz, height: sunIconSz, color: sunIcColor || "hsl(25, 85%, 55%)" }} />
                <span className="font-medium" style={{ fontSize: sunTxtSz, color: sunTxtColor }}>{todayForecast.sunset}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Forecast chart */}
      <div className="rounded-lg border border-border/50 bg-muted/30 px-[2px] py-0">
        {/* Day labels + icons */}
        <div className="flex justify-around mb-1">
          {chartData.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className="font-medium" style={{ fontSize: chartDaySz, color: chartDayColor }}>{d.name}</span>
              {getWeatherIcon(d.condition, chartIcSz)}
            </div>
          ))}
        </div>

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
            <Area type="monotone" dataKey="high" yAxisId="temp" stroke="hsl(0, 70%, 60%)" fill="hsl(0, 70%, 60%)" fillOpacity={0.1} strokeWidth={2} dot={{ r: 3, fill: "hsl(0, 70%, 60%)" }} isAnimationActive={false} />
            <Area type="monotone" dataKey="low" yAxisId="temp" stroke="hsl(210, 70%, 60%)" fill="hsl(210, 70%, 60%)" fillOpacity={0.1} strokeWidth={2} dot={{ r: 3, fill: "hsl(210, 70%, 60%)" }} isAnimationActive={false} />
            <YAxis yAxisId="temp" domain={[minTemp, maxTemp]} hide />
            <YAxis yAxisId="precip" domain={[0, maxPrecip * 4]} hide orientation="right" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: 12,
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
              <span className="font-semibold" style={{ fontSize: chartDaySz + 2, color: "hsl(var(--foreground))" }}>{d.high}°</span>
              <span style={{ fontSize: chartDaySz, color: chartDayColor }}>{d.low}°</span>
              {showPrecipitation && d.precipitation > 0 && (
                <span className="text-blue-400" style={{ fontSize: Math.max(chartDaySz - 1, 8) }}>{d.precipitation} mm</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
