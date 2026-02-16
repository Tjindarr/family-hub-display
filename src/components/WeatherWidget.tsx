import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Sun, Moon, Cloud, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, CloudFog, CloudSun, CloudMoon, Sunrise, Sunset, Droplets, Wind } from "lucide-react";
import { Area, YAxis, ResponsiveContainer, ComposedChart, Bar, Tooltip } from "recharts";
import type { ResolvedFontSizes } from "@/lib/fontSizes";

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
  fontSizes?: ResolvedFontSizes;
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

export default function WeatherWidget({ weather, loading, showPrecipitation, showSunrise, showSunset, fontSizes }: WeatherWidgetProps) {
  const fs = fontSizes || { label: 10, heading: 12, body: 14, value: 18 };
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

  // Scale large text proportionally from value size
  const xlSize = Math.round(fs.value * 1.67);

  return (
    <div className="widget-card h-full">
      {/* Current conditions - 3 columns */}
      <div className="mb-4 flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-3">
        {/* Left: time + date */}
        <div>
          <div className="font-bold text-foreground" style={{ fontSize: xlSize }}>
            {format(now, "HH:mm")}
            <span className="text-muted-foreground" style={{ fontSize: fs.value }}>:{format(now, "ss")}</span>
          </div>
          <div className="text-muted-foreground" style={{ fontSize: fs.heading }}>{format(now, "EEEE, yyyy-MM-dd")}</div>
        </div>

        {/* Center: icon + temp */}
        <div className="flex items-center gap-3">
          {getWeatherIcon(weather.current.condition, 40)}
          <div>
            <div className="font-bold text-foreground" style={{ fontSize: xlSize }}>{Math.round(weather.current.temperature)}°</div>
            <div className="capitalize text-muted-foreground" style={{ fontSize: fs.heading }}>{weather.current.condition.replace(/_/g, " ")}</div>
          </div>
        </div>

        {/* Right: sunrise/sunset */}
        {(showSunrise || showSunset) && todayForecast && (
          <div className="flex flex-col gap-1.5">
            {showSunrise && todayForecast.sunrise && (
              <div className="flex items-center gap-2">
                <Sunrise className="h-4 w-4 text-yellow-500" />
                <span className="font-medium text-foreground" style={{ fontSize: fs.body }}>{todayForecast.sunrise}</span>
              </div>
            )}
            {showSunset && todayForecast.sunset && (
              <div className="flex items-center gap-2">
                <Sunset className="h-4 w-4 text-orange-400" />
                <span className="font-medium text-foreground" style={{ fontSize: fs.body }}>{todayForecast.sunset}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Forecast chart */}
      <div className="rounded-lg border border-border/50 bg-muted/30 p-2">
        {/* Day labels + icons */}
        <div className="flex justify-around mb-1">
          {chartData.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className="font-medium text-muted-foreground" style={{ fontSize: fs.label }}>{d.name}</span>
              {getWeatherIcon(d.condition, 16)}
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
                fontSize: fs.body,
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
              <span className="font-semibold text-foreground" style={{ fontSize: fs.heading }}>{d.high}°</span>
              <span className="text-muted-foreground" style={{ fontSize: fs.label }}>{d.low}°</span>
              {showPrecipitation && d.precipitation > 0 && (
                <span className="text-blue-400" style={{ fontSize: Math.max(fs.label - 1, 8) }}>{d.precipitation} mm</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
