# 🏠 HomeDash

A sleek, high-density Home Assistant dashboard designed for wall-mounted displays. Built with React, Vite, and Tailwind CSS, HomeDash connects to your Home Assistant instance via its REST API to display real-time sensor data, calendars, weather, and more — all in a fully customizable grid layout.

---

## ✨ Features

- **Real-time data** from Home Assistant via REST API
- **Drag-and-drop grid layout** with per-row column/height configuration
- **Multiple themes** — Midnight Teal, Charcoal, Deep Ocean, Warm Ember, AMOLED Black, macOS Dark
- **Kiosk mode** — auto-hides settings for dedicated displays
- **Granular font sizing** — global + per-widget overrides for 4 text roles
- **Server-side config persistence** — settings sync across all devices
- **Docker-ready** — single container deployment with persistent storage

---

## 📦 Installation

### Docker (Recommended)

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd homedash

# Build and run with Docker Compose
docker compose up -d
```

The dashboard will be available at `http://localhost:3000`.

Configuration and photos are persisted in a Docker volume (`config-data` → `/data`).

### Manual / Development

Requires **Node.js 18+**.

```bash
# Install dependencies
npm install

# Start development server (frontend only)
npm run dev

# Build for production
npm run build

# Run production server (serves frontend + API)
node server.js
```

---

## ⚙️ Initial Setup

1. Open the dashboard in your browser
2. Click the **⚙️ gear icon** (top-right) to open Settings
3. Go to the **Connection** tab
4. Enter your **Home Assistant URL** (e.g. `http://192.168.1.100:8123`)
5. Enter a **Long-Lived Access Token** (create one in HA → Profile → Security → Long-Lived Access Tokens)
6. Set the **Refresh Interval** (seconds between data updates, default: 30)
7. Click **Save**

---

## 🧩 Widgets

### 🕐 Clock & Weather

Displays the current time, date, and outdoor temperature with a multi-day weather forecast chart.

| Setting | Description |
|---|---|
| `Weather Entity` | A `weather.*` entity from Home Assistant |
| `Forecast Days` | Number of days to show in the forecast (1–7) |
| `Show Precipitation` | Toggle precipitation bars on the chart |
| `Show Sunrise / Sunset` | Toggle sun time display |

---

### 📅 Calendar

Shows upcoming events from one or more Home Assistant calendar entities with rich display options.

| Setting | Description |
|---|---|
| `Calendar Entities` | List of `calendar.*` entities |
| `Prefix` | Text prepended to event names (per entity) |
| `Color` | Text color for events from this entity (HSL) |
| `Day Label Color` | Override color for day headers ("Today", "Tomorrow") |
| `Time Color` | Override color for event timestamps |
| `Show Event Body` | Toggle event description display |
| `Show End Date` | Toggle end date/time display |
| `Hide All-Day Text` | Hide the "All day" label for all-day events |
| `Show Week Number` | Show the ISO week number in day headers |
| `Font Sizes` | Independent font sizes for day, time, title, and body text |

---

### 🌡️ Temperature Sensors

Displays temperature (and optional humidity) readings with colored labels. Sensors can be grouped into a single widget using **Group IDs**.

| Setting | Description |
|---|---|
| `Entity ID` | A `sensor.*` temperature entity |
| `Humidity Entity` | Optional `sensor.*` humidity entity |
| `Label` | Display name |
| `Color` | Sensor color (HSL) |
| `Group` | Group number — sensors with the same group render together |
| `Show Chart` | Toggle 24-hour history chart behind the reading |
| `Chart Type` | Line, Bar, Area, Step, or Scatter |
| `Round Temperature` | Round temperature to nearest integer |

---

### ⚡ Electricity Prices

A 48-hour stepline chart showing Nordpool electricity prices with current price, daily min/max, and a Low/Medium/High status badge.

| Setting | Description |
|---|---|
| `Price Entity` | A Nordpool `sensor.*` entity |
| `Forecast Entity` | Optional forecast entity for tomorrow's prices |

---

### 👤 Person Tracking

Two-column card with a profile picture, battery level (with charging indicator), location, and distance from home. Per-card font sizes for location, battery, and distance text.

| Setting | Description |
|---|---|
| `Name` | Display name |
| `Entity Picture` | URL to avatar image |
| `Location Entity` | `device_tracker.*` or `person.*` entity |
| `Battery Entity` | Battery level sensor |
| `Battery Charging Entity` | Binary sensor or string state for charging |
| `Distance Entity` | Distance from home sensor |
| `Avatar Size` | Avatar diameter in pixels (default: 80) |

---

### 🍽️ Food Menu

Displays upcoming meals by reading events from a Home Assistant calendar entity.

| Setting | Description |
|---|---|
| `Calendar Entity` | A `calendar.*` entity containing meal events |
| `Days` | Number of days to display (1–14, default: 5) |
| `Skip Weekends` | Skip Saturday and Sunday when counting days forward |

---

### 📊 General Sensor Card

A highly versatile widget for building custom monitoring cards. Supports an icon, label, top/bottom info rows (up to 4 sensors each), and a central historical chart with multiple series.

| Setting | Description |
|---|---|
| `Label` | Card title |
| `Icon` | Icon name (MDI format, e.g. `mdi:thermometer`) |
| `Icon Size` | Icon size in pixels (default: 20) |
| `Show Label` | Toggle label visibility |
| `Show Graph` | Toggle the history chart |
| `History Hours` | Data range: 1, 6, 24, or 168 hours |
| `Chart Grouping` | Aggregate by minute, hour, or day |
| `Chart Aggregation` | How to combine values per bucket: average, max, min, sum, last, or delta |
| `Chart Series` | Sensors to plot (entity, label, color, chart type: line/bar/area/step/scatter) |
| `Top / Bottom Info` | Up to 4 sensors each (entity, label, unit, color) |
| `Font Sizes` | Per-widget font size overrides (heading, value, body, label) |

Top info values display as whole numbers. Chart tooltips display values with one decimal place. The bottom row includes automatic Avg/Min/Max statistics for the first chart series.

---

### 🔲 Sensor Grid

A configurable grid (up to 6×6) of sensor cells, each showing an icon, label, value, and unit. Supports advanced conditional logic and dense layouts.

| Setting | Description |
|---|---|
| `Rows / Columns` | Grid dimensions (1–6 each) |
| `Cell Entity` | Sensor entity for each cell |
| `Icon` | Icon name |
| `Unit` | Display unit |
| `Color` | Default icon color |
| `Value Color` | Separate color for value text (optional, falls back to icon color) |
| `Icon Size` | Icon size in pixels (default: 16) |
| `Font Size` | Value font size in pixels |
| `Label Font Size` | Label font size in pixels |
| `Intervals` | 4 numeric ranges with conditional icon + color |
| `Value Maps` | String rewrite rules (from → to) |

---

### 📰 RSS News

A single-item carousel cycling through headlines from an RSS feed.

| Setting | Description |
|---|---|
| `Label` | Feed name |
| `Feed URL` | URL to the RSS/Atom feed |
| `Max Items` | Maximum headlines to display (default: 15) |

> RSS feeds are fetched via a server-side proxy (`/api/rss`) to avoid CORS issues.

---

### 🖼️ Photo Gallery

A rotating photo slideshow with configurable display modes. Photos are stored server-side in `/data/photos/`.

| Setting | Description |
|---|---|
| `Interval` | Seconds between photo transitions |
| `Display Mode` | `contain` (fit), `cover` (fill + crop), or `blur-fill` (fit + blurred background) |

**Managing photos:**
1. Open Settings → **Photos** tab
2. Click **Upload Photos** to add images
3. Hover over a thumbnail and click 🗑️ to delete

---

## 📐 Layout System

The dashboard uses a row-based grid system with 5px spacing between widgets and around the page edges. Each widget is assigned to a **row** and configured with a **column span**.

### Global Settings (Layout Tab)

| Setting | Description |
|---|---|
| `Grid Columns` | Default number of columns per row (1–6) |
| `Row Heights` | Per-row height in pixels |
| `Row Columns` | Per-row column count override |

### Per-Widget Layout

| Setting | Description |
|---|---|
| `Row` | Which row the widget appears in (1-based) |
| `Column Span` | How many columns the widget occupies |
| `Row Span` | How many rows the widget spans vertically |
| `Widget Group` | Group ID — widgets with the same group stack inside one card |

### Widget Order

Widgets can be **reordered via drag-and-drop** in the Layout tab. The last widget in each row automatically stretches to fill remaining space.

---

## 🎨 Themes

Six built-in themes optimized for always-on displays:

| Theme | Description |
|---|---|
| **Midnight Teal** | Dark background with teal accents |
| **Charcoal** | Neutral dark grey tones |
| **Deep Ocean** | Deep blue palette |
| **Warm Ember** | Dark with warm orange/amber accents |
| **AMOLED Black** | Pure black background for OLED screens |
| **macOS Dark** | Dark gray with blue accent, inspired by macOS dark mode |

Select a theme in the **Layout** tab of Settings.

---

## 🔤 Font Customization

Four text roles can be sized independently (in pixels):

| Role | Default | Usage |
|---|---|---|
| **Heading** | 12px | Section headers, widget titles |
| **Value** | 18px | Primary data values |
| **Body** | 14px | Readable text, descriptions |
| **Label** | 10px | Small labels, units, timestamps |

- **Global sizes** are set in the Layout tab
- **Per-widget overrides** are available in each widget's settings section

---

## 🖥️ Kiosk Mode

Append `?kiosk` to the URL to hide the settings gear icon — ideal for wall-mounted tablets:

```
http://localhost:3000/?kiosk
```

Triple-click anywhere to exit kiosk mode.

---

## 🗂️ Settings Organization

The configuration panel is organized into four tabs:

| Tab | Contents |
|---|---|
| **Connection** | Home Assistant URL, token, refresh interval, external config backend |
| **Widgets** | Collapsible sections for each widget type with all settings |
| **Photos** | Photo gallery management (upload/delete) |
| **Layout** | Grid columns, row heights, theme selection, font sizes, widget ordering |

The panel is a fixed 66% width overlay with a sticky header and footer containing the global Save button.

---

## 🗂️ Configuration Persistence

Configuration is saved in two ways:

1. **Server-side** (primary): Stored as `/data/config.json` via the built-in Express API
2. **localStorage** (fallback): Used when the server API is unavailable

An optional **external config backend URL** can be set in the Connection tab to sync config with a custom REST endpoint.

---

## 🐳 Docker Details

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

The `/data` volume stores:
- `config.json` — dashboard configuration
- `photos/` — uploaded photo gallery images

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI primitives
- **Charts**: Recharts
- **Icons**: Iconify (MDI icons)
- **Drag & Drop**: dnd-kit
- **Backend**: Express.js (lightweight API server)
- **Deployment**: Docker with multi-stage build

---

## 📄 License

MIT