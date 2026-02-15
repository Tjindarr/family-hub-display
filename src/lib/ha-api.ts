import { DashboardConfig, HAState, HACalendarEvent, ElectricityPrice } from "./config";

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
}

export function createHAClient(config: DashboardConfig): HomeAssistantAPI {
  return new HomeAssistantAPI(config);
}

// Generate mock data for demo/unconfigured state
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

export function generateMockElectricityPrices(): ElectricityPrice[] {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const prices: ElectricityPrice[] = [];
  for (let i = -6; i < 18; i++) {
    const t = new Date(now.getTime() + i * 3600000);
    const hour = t.getHours();
    // Simulate higher prices during peak hours
    const base = hour >= 7 && hour <= 9 ? 0.35 : hour >= 17 && hour <= 20 ? 0.40 : 0.15;
    prices.push({
      time: t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      price: +(base + (Math.random() - 0.5) * 0.1).toFixed(3),
    });
  }
  return prices;
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
