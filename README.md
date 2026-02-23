# 🏠 HomeDash

A high-density Home Assistant dashboard for wall-mounted displays. Built with React, Vite, and Tailwind CSS.

---

## 📦 Installation

### Docker (Recommended)

```bash
git clone <YOUR_GIT_URL>
cd homedash
docker compose up -d
```

Dashboard available at `http://localhost:3000`. Config and photos persist in a Docker volume (`config-data` → `/data`).

### Manual / Development

Requires **Node.js 18+**.

```bash
npm install
npm run dev          # development server (frontend only)
npm run build        # production build
node server.js       # production server (frontend + API)
```

---

## ⚙️ Initial Setup

1. Open the dashboard and click the **⚙️ gear icon** (top-right)
2. Go to the **Connection** tab
3. Enter your **Home Assistant URL** (e.g. `http://192.168.1.100:8123`)
4. Enter a **Long-Lived Access Token** (HA → Profile → Security → Long-Lived Access Tokens)
5. Set **Refresh Interval** (seconds between REST data fetches, default: 30)
6. Click **Save**

> **CORS**: Direct browser communication with the HA REST API requires adding your dashboard origin to `cors_allowed_origins` in HA's `configuration.yaml`.

---

## 🔌 Technical Architecture

### Communication with Home Assistant

HomeDash uses a **hybrid WebSocket + REST** approach:

#### WebSocket (real-time state)

- Connects via `ws://` or `wss://` to `/api/websocket`
- Authenticates with the long-lived access token
- Fetches all entity states on connect via `get_states`
- Subscribes to `state_changed` events for instant updates
- Sends keepalive pings every 30 seconds
- Auto-reconnects with exponential backoff (up to 30s delay)
- A `__bulk_load__` signal is emitted after initial state fetch to trigger all data hooks to refresh

#### REST API (history, calendars, weather)

Used for data that WebSocket doesn't provide:

| Endpoint | Purpose | Refresh Interval |
|---|---|---|
| `GET /api/history/period/{start}` | Sensor history (charts) | Every 5 minutes |
| `GET /api/calendars/{entity}?start=&end=` | Calendar events | Config interval |
| `POST /api/services/weather/get_forecasts` | Weather forecast | Every 30 minutes |

All REST requests use `Authorization: Bearer <token>` headers. Calendar date parameters omit milliseconds for HA 2026.2+ compatibility.

#### Connection Status

A dynamic status indicator in the header reflects the WebSocket state: **connecting**, **connected**, or **disconnected**.

### Server-Side API (Express)

The built-in Express server (port 80 in Docker) provides:

| Endpoint | Method | Description |
|---|---|---|
| `/api/config` | GET | Load dashboard configuration |
| `/api/config` | PUT | Save dashboard configuration (JSON body) |
| `/api/photos` | GET | List uploaded photos |
| `/api/photos/upload` | POST | Upload photos (JSON with base64 `files` array) |
| `/api/photos/file/:name` | GET | Serve full-size photo |
| `/api/photos/thumb/:name` | GET | Serve thumbnail |
| `/api/photos/:name` | DELETE | Delete a photo |
| `/api/rss?url=` | GET | RSS feed proxy (avoids CORS) |

### Configuration Persistence

1. **Server-side** (primary): Stored as `/data/config.json` via the Express API
2. **localStorage** (fallback): Used when server API is unavailable
3. **External backend** (optional): Custom REST endpoint configurable in Connection settings

---

## 📐 Layout System

Layout is managed through the interactive **Edit Layout** mode (click the edit icon in the header).

### Grid Structure

- Row-based grid with 5px spacing between widgets and page edges
- Each widget has a **row assignment**, **column span**, and **row span**
- The last widget in each row auto-stretches to fill remaining space
- Rows without a defined height default to 120px minimum

### Edit Layout Mode

Provides drag-and-drop reordering plus explicit controls for:
- Column and row spans per widget
- Row assignments
- Global grid column count (1–6)
- Per-row column overrides
- Widget grouping (group ID A–H)

### Widget Grouping

Widgets with the same group ID (A–H) stack vertically inside a shared card. The first widget in the group defines the card's grid dimensions. In Edit Layout mode, groups move as a single unit.

---

## 🎨 General Settings

### Themes

Six themes optimized for always-on displays:

| Theme | Description |
|---|---|
| **Midnight Teal** | Dark background with teal accents |
| **Charcoal** | Neutral dark grey tones |
| **Deep Ocean** | Deep blue palette |
| **Warm Ember** | Dark with warm orange/amber accents |
| **AMOLED Black** | Pure black for OLED screens |
| **macOS Dark** | Dark gray with blue accent |

### Global Font Sizes

Four text roles sized independently (px):

| Role | Default | Usage |
|---|---|---|
| Heading | 12 | Section headers, widget titles |
| Value | 18 | Primary data values |
| Body | 14 | Readable text, descriptions |
| Label | 10 | Small labels, units, timestamps |

Per-widget font size overrides are available in each widget's settings.

### Date & Time Format

- **Date format**: `yyyy-MM-dd`, `dd/MM/yyyy`, `MM/dd/yyyy`, `dd.MM.yyyy`
- **Time format**: `24h` or `12h`

### Screen Blackout

Turns the screen black during a configurable time window (e.g. 23:00–06:00). Only active in kiosk mode.

### Kiosk Mode

Append `?kiosk` to the URL to hide settings UI. Triple-click anywhere to exit. Can also be entered via the monitor icon in the header.

---

## 🧩 Widgets

### 🕐 Clock & Weather

Displays current time, date, outdoor temperature, and a multi-day forecast chart.

| Setting | Description |
|---|---|
| Weather Entity | `weather.*` entity from HA |
| Forecast Days | Number of days to forecast (1–7) |
| Show Precipitation | Toggle precipitation bars on chart |
| Show Sunrise | Toggle sunrise time display |
| Show Sunset | Toggle sunset time display |
| Show Date | Toggle date display |

**Styling options**: Clock text size/color, temperature text size/color, sun icon size/color/text size/color, date text size/color, chart day text size/color, chart icon size.

---

### 📅 Calendar

Shows upcoming events from one or more HA calendar entities.

**Per-entity settings:**

| Setting | Description |
|---|---|
| Entity ID | `calendar.*` entity |
| Prefix | Text prepended to event names |
| Color | Event text color (HSL) |
| Forecast Days | Per-entity override for days to show |

**Display settings:**

| Setting | Description |
|---|---|
| Global Forecast Days | Default days to show (default: 7) |
| Day Label Color | Override color for day headers |
| Time Color | Override color for timestamps |
| Show Event Body | Toggle event description |
| Show End Date | Toggle end date/time |
| Hide All-Day Text | Hide "All day" label |
| Hide Clock Icon | Hide clock icon on timed events |
| Show Week Number | Show ISO week number in day headers |
| First Day of Week | Sunday (0), Monday (1), or Saturday (6) |

**Font sizes**: Day, Time, Title, Body (independent px values).

---

### 🌡️ Temperature Sensors

Displays temperature and optional humidity with colored labels. Sensors with the same **Group** number render together in one widget.

| Setting | Description |
|---|---|
| Entity ID | `sensor.*` temperature entity |
| Humidity Entity | Optional humidity sensor |
| Label | Display name |
| Color | Sensor color (HSL) |
| Group | Group number (same = grouped together) |
| Show Chart | Toggle 24h history chart |
| Chart Type | Line, Bar, Area, Step, or Scatter |
| Round Temperature | Round to nearest integer |

**Styling**: Icon size, icon color, secondary icon color, label color, value color, label text size, value text size, humidity text size.

---

### ⚡ Electricity Prices

48-hour stepline chart showing Nordpool electricity prices with current price, daily min/max, and Low/Medium/High badge.

| Setting | Description |
|---|---|
| Price Entity | Nordpool `sensor.*` entity |
| Forecast Entity | Optional forecast entity for tomorrow |
| Surcharge | kr/kWh added to all prices |

**Styling**: Price text size/color, unit text size/color, stats text size/color, axis text size/color.

---

### 👤 Person Tracking

Two-column card with avatar, battery level (with charging indicator), location, and distance from home.

| Setting | Description |
|---|---|
| Name | Display name |
| Entity Picture | URL to avatar image |
| Location Entity | `device_tracker.*` or `person.*` entity |
| Battery Entity | Battery level sensor |
| Battery Charging Entity | Binary sensor for charging state |
| Distance Entity | Distance from home sensor |
| Avatar Size | Avatar diameter in px (default: 80) |

**Font sizes**: Location, Battery, Distance (independent px values).

---

### 🍽️ Food Menu

Displays upcoming meals from a calendar entity or Skolmaten sensor.

| Setting | Description |
|---|---|
| Source | `calendar` or `skolmaten` |
| Calendar Entity | Calendar entity for meal events |
| Skolmaten Entity | Sensor entity for Skolmaten integration |
| Days | Days to display (1–14, default: 5) |
| Skip Weekends | Skip Saturday/Sunday |
| Display Mode | `compact` (side-by-side) or `menu` (restaurant style) |
| Show Title | Show "MENU" title with icon |

**Styling**: Day color, date color, meal color, day/date/meal font sizes, day/meal font families.

---

### 📊 General Sensor Card

Versatile widget with icon, label, top/bottom info rows (up to 4 sensors each), and a historical chart with multiple series.

| Setting | Description |
|---|---|
| Label | Card title |
| Show Label | Toggle label visibility |
| Icon | Icon name (MDI format, e.g. `mdi:thermometer`) |
| Icon Size | Icon size in px (default: 20) |
| Show Graph | Toggle history chart |
| History Hours | Data range: 1, 6, 24, or 168 hours |
| Chart Grouping | Aggregate by minute, hour, or day |
| Chart Aggregation | Combine method: average, max, min, sum, last, delta |

**Chart series** (multiple): Entity, label, color, chart type (line/bar/area/step/scatter).

**Top/Bottom info** (up to 4 each): Entity, label, unit, color.

**Per-widget font sizes**: Heading, value, body, label.

---

### 🔲 Sensor Grid

Configurable grid (up to 6×6) of sensor cells with icons, labels, values, and conditional formatting.

**Grid settings:**

| Setting | Description |
|---|---|
| Rows / Columns | Grid dimensions (1–6 each) |

**Per-cell settings:**

| Setting | Description |
|---|---|
| Entity ID | Sensor entity |
| Label | Cell label |
| Icon | Icon name |
| Unit | Display unit |
| Color | Default icon color |
| Value Color | Separate value text color (falls back to icon color) |
| Icon Size | Icon size in px (default: 16) |
| Font Size | Value font size in px |
| Label Font Size | Label font size in px |
| Col Span / Row Span | Cell spanning (default: 1) |
| Order | CSS order for custom positioning |
| Show Chart | Background history chart |
| Chart Type | Chart type for background (default: line) |
| Use Intervals | Enable conditional icon/color by value |
| Intervals | 4 numeric ranges with conditional icon + color |
| Value Maps | String rewrite rules (from → to, with optional icon/color) |
| Visibility Filter | Conditionally hide cell (range or exact match) |

---

### 🚗 Vehicle

Customizable vehicle monitoring card with sections for battery, fuel, location, climate, doors, tires, or custom data.

| Setting | Description |
|---|---|
| Name | Vehicle name (e.g. "My Tesla") |
| Icon | MDI icon (e.g. `mdi:car-electric`) |

**Per-section**: Type (battery/fuel/location/climate/doors/tires/custom), label, and entity list.

**Per-entity**: Entity ID, label, icon, unit, color.

**Styling**: Icon size, icon color, label color, value color, heading color.

Battery/fuel sections show percentage progress bars. Door sections use green/red coloring for locked/unlocked states.

---

### 📰 RSS News

Single-item carousel cycling through headlines from an RSS feed.

| Setting | Description |
|---|---|
| Label | Feed name |
| Feed URL | URL to RSS/Atom feed |
| Max Items | Maximum headlines (default: 15) |

> Feeds are fetched via server-side proxy (`/api/rss`) to avoid CORS issues.

---

### 🔔 Notifications

Displays Home Assistant persistent notifications and custom sensor-based alert rules.

| Setting | Description |
|---|---|
| Show HA Notifications | Toggle persistent_notification display |

**Alert rules** (multiple):

| Setting | Description |
|---|---|
| Entity ID | Sensor to monitor |
| Label | Alert label |
| Condition | `above`, `below`, or `equals` |
| Threshold | Numeric threshold value |
| Icon | Icon name |
| Color | Alert color |
| Icon Size | Icon size in px |
| Label Color | Label text color |
| Value Color | Value text color |

---

### 🖼️ Photo Gallery

Rotating photo slideshow with configurable display modes. Photos stored server-side in `/data/photos/`.

| Setting | Description |
|---|---|
| Interval | Seconds between transitions |
| Display Mode | `contain` (fit), `cover` (fill + crop), `blur-fill` (fit + blurred bg) |

Manage photos in Settings → **Photos** tab (upload/delete).

---

## 🐳 Docker

```yaml
services:
  ha-dashboard:
    build: .
    container_name: ha-dashboard
    ports:
      - "3000:80"
    volumes:
      - config-data:/data
    restart: unless-stopped
```

The `/data` volume stores `config.json` and `photos/`.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **UI**: shadcn/ui, Radix UI
- **Charts**: Recharts
- **Icons**: Iconify (MDI)
- **Drag & Drop**: dnd-kit
- **Backend**: Express.js
- **Deployment**: Docker (multi-stage build)

---

## 📄 License

MIT
