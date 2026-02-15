import { DashboardConfig, HAState, HACalendarEvent } from "./config";
import type { NordpoolData } from "@/hooks/useDashboardData";
import type { WeatherData } from "@/components/WeatherWidget";

class HomeAssistantAPI {
  private baseUrl: string;
  private token: string;

  constructor(config: DashboardConfig) {
    this.baseUrl = config.haUrl.replace(/\/$/, "");
    this.token = config.haToken;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
    if (!res.ok) {
      throw new Error(`HA API error ${res.status}: ${await res.text()}`);
    }
    return res.json();
  }

  async getState(entityId: string): Promise<HAState> {
    return this.request<HAState>(`/states/${entityId}`);
  }

  async getStates(): Promise<HAState[]> {
    return this.request<HAState[]>("/states");
  }

  async getCalendarEvents(
    entityId: string,
    start: string,
    end: string
  ): Promise<HACalendarEvent[]> {
    return this.request<HACalendarEvent[]>(
      `/calendars/${entityId}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
    );
  }

  async getHistory(
    entityId: string,
    startTime: string,
    endTime?: string
  ): Promise<HAState[][]> {
    let path = `/history/period/${startTime}?filter_entity_id=${entityId}&minimal_response&no_attributes`;
    if (endTime) path += `&end_time=${endTime}`;
    return this.request<HAState[][]>(path);
  }

  async getWeatherForecast(entityId: string, type: "daily" | "hourly" | "twice_daily" = "daily"): Promise<any[]> {
    try {
      const result = await this.request<any>("/services/weather/get_forecasts", {
        method: "POST",
        body: JSON.stringify({
          target: { entity_id: entityId },
          type,
          return_response: true,
        }),
      });
      console.log("[Weather] Raw service response:", JSON.stringify(result).slice(0, 500));
      
      // The REST API may wrap in service_response
      const data = result?.service_response || result;
      
      if (data && typeof data === "object") {
        const key = Object.keys(data).find((k) => k === entityId) || Object.keys(data)[0];
        return data[key]?.forecast || [];
      }
      return [];
    } catch (err) {
      console.warn("weather.get_forecasts service call failed:", err);
      return [];
    }
  }
}

export function createHAClient(config: DashboardConfig): HomeAssistantAPI {
  return new HomeAssistantAPI(config);
}

// Mock data for demo/unconfigured state
export function generateMockTemperatureHistory(hours = 24): { time: string; value: number }[] {
  const now = new Date();
  const data: { time: string; value: number }[] = [];
  for (let i = hours; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 3600000);
    data.push({
      time: t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      value: 20 + Math.sin(i / 4) * 3 + (Math.random() - 0.5) * 2,
    });
  }
  return data;
}

export function generateMockElectricityPrices(): NordpoolData {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const today: { time: Date; price: number }[] = [];
  for (let i = 0; i < 24; i++) {
    const t = new Date(startOfDay.getTime() + i * 3600000);
    const hour = t.getHours();
    const base = hour >= 7 && hour <= 9 ? 0.85 : hour >= 17 && hour <= 20 ? 1.2 : 0.35;
    today.push({
      time: t,
      price: +(base + (Math.random() - 0.5) * 0.3).toFixed(3),
    });
  }

  const tomorrowStart = new Date(startOfDay.getTime() + 86400000);
  const tomorrow: { time: Date; price: number }[] = [];
  // Simulate: tomorrow data available after 13:00
  if (now.getHours() >= 13) {
    for (let i = 0; i < 24; i++) {
      const t = new Date(tomorrowStart.getTime() + i * 3600000);
      const hour = t.getHours();
      const base = hour >= 7 && hour <= 9 ? 0.75 : hour >= 17 && hour <= 20 ? 1.1 : 0.30;
      tomorrow.push({
        time: t,
        price: +(base + (Math.random() - 0.5) * 0.25).toFixed(3),
      });
    }
  }

  const currentHour = now.getHours();
  const currentPrice = today[currentHour]?.price || 0;

  return { today, tomorrow, currentPrice };
}

export function generateMockCalendarEvents(): HACalendarEvent[] {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().split("T")[0];
  return [
    { summary: "School Drop-off", start: { dateTime: `${today}T08:00:00` }, end: { dateTime: `${today}T08:30:00` } },
    { summary: "Grocery Shopping", start: { dateTime: `${today}T10:00:00` }, end: { dateTime: `${today}T11:00:00` } },
    { summary: "Soccer Practice", start: { dateTime: `${today}T16:00:00` }, end: { dateTime: `${today}T17:30:00` } },
    { summary: "Family Dinner", start: { dateTime: `${today}T18:30:00` }, end: { dateTime: `${today}T20:00:00` } },
    { summary: "Doctor Appointment", start: { dateTime: `${tomorrow}T09:00:00` }, end: { dateTime: `${tomorrow}T10:00:00` } },
    { summary: "Movie Night", start: { dateTime: `${tomorrow}T19:00:00` }, end: { dateTime: `${tomorrow}T21:30:00` } },
  ];
}

export function generateMockWeatherData(forecastDays = 5): WeatherData {
  const conditions = ["sunny", "partlycloudy", "cloudy", "rainy", "clear", "snowy", "thunderstorm"];
  const forecast = Array.from({ length: forecastDays }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    const high = 15 + Math.random() * 15;
    return {
      date: d.toISOString().split("T")[0],
      tempHigh: Math.round(high),
      tempLow: Math.round(high - 5 - Math.random() * 5),
      condition: conditions[Math.floor(Math.random() * conditions.length)],
      precipitation: +(Math.random() * 8).toFixed(1), // mm
      sunrise: "06:" + String(Math.floor(20 + Math.random() * 30)).padStart(2, "0"),
      sunset: "18:" + String(Math.floor(Math.random() * 50)).padStart(2, "0"),
    };
  });

  return {
    current: {
      temperature: 18 + Math.random() * 10,
      condition: conditions[Math.floor(Math.random() * conditions.length)],
      humidity: 40 + Math.random() * 40,
      windSpeed: Math.round(5 + Math.random() * 20),
      pressure: 1010 + Math.random() * 20,
      cloudCoverage: Math.round(Math.random() * 100),
      uvIndex: +(Math.random() * 6).toFixed(1),
      windGustSpeed: Math.round(10 + Math.random() * 30),
    },
    forecast,
  };
}
