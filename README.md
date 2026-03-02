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

### Unraid

1. In Unraid, go to **Docker → Add Container** (or use Community Applications to add a custom container)
2. Configure the container:

| Field | Value |
|---|---|
| **Name** | `homedash` |
| **Repository** | Build from the cloned repo, or push your image to Docker Hub/GHCR and reference it here |
| **Port Mapping** | Host: `3000` → Container: `80` |
| **Path Mapping** | Host: `/mnt/user/appdata/homedash` → Container: `/data` |

3. If building locally on Unraid:
```bash
cd /mnt/user/appdata/
git clone <YOUR_GIT_URL> homedash-build
cd homedash-build
docker build -t homedash .
```
Then set **Repository** to `homedash` in the Unraid Docker UI.

4. Click **Apply** — the dashboard will be available at `http://<UNRAID_IP>:3000`

> **Persistence**: The `/data` path stores `config.json` and uploaded photos. Mapping it to `/mnt/user/appdata/homedash` ensures data survives container updates.

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

### Entity Attribute Access

All entity ID fields across every widget support **dot-notation attribute access**:

```
sensor.phone.battery_level
```

Format: `domain.object_id.attribute_name`

- `sensor.temperature` → returns the entity's main state
- `sensor.phone.battery_level` → returns the `battery_level` attribute from `sensor.phone`

This works in temperature sensors, sensor grids, general sensor cards, vehicle widgets, person cards, notification rules, and pollen sensors.

### Server-Side API (Express)

The built-in Express server (port 80 in Docker) provides:

| Endpoint | Method | Description |
|---|---|---|
| `/api/config` | GET | Load dashboard configuration |
| `/api/config` | PUT | Save dashboard configuration (JSON body) |
| `/api/config/backups` | GET | List configuration backups |
| `/api/config/backups/restore/:file` | POST | Restore a config backup |
| `/api/photos` | GET | List uploaded photos |
| `/api/photos/upload` | POST | Upload photos (JSON with base64 `files` array) |
| `/api/photos/file/:name` | GET | Serve full-size photo |
| `/api/photos/thumb/:name` | GET | Serve thumbnail |
| `/api/photos/:name` | DELETE | Delete a photo |
| `/api/rss?url=` | GET | RSS feed proxy (avoids CORS) |
| `/api/push/vapid-public-key` | GET | Get VAPID public key for push subscriptions |
| `/api/push/subscribe` | POST | Register push notification subscription |
| `/api/push/unsubscribe` | POST | Remove push notification subscription |

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

#### Delta Aggregation & Meter Resets

When using **delta** aggregation (common for cumulative energy meters), the chart calculates the difference between consecutive time buckets. If a negative delta is detected (e.g. a meter resetting at the start of a new month), the chart automatically treats the new value as the delta instead of showing a large negative spike.

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

### 🌿 Pollen

Displays pollen levels from HA sensors with color-coded severity dots and optional multi-day forecast.

| Setting | Description |
|---|---|
| Show Label | Toggle "Pollen" heading |
| Show Forecast | Toggle forecast dots |

**Per-sensor settings:**

| Setting | Description |
|---|---|
| Entity ID | Pollen sensor entity |
| Label | Pollen type name (e.g. "Björk") |
| Icon | MDI icon name |
| Color | Icon color |

**Styling**: Heading font size/color, icon size, label font size, value font size. Per-sensor label/value font size overrides available.

Levels are color-coded from green (none) through yellow/orange (moderate) to red (high/very high).

---

## ✅ Chore System

A gamified chore management system for families with separate **Parent** (`/parent`) and **Kids** (`/kids`) pages.

### Parent Page (`/parent`)

Manage kids, chores, rewards, approvals, and settings via a hamburger-menu navigation with the following tabs:

| Tab | Description |
|---|---|
| **Chores** | Create, edit, pause, and delete chores. Assign difficulty, points, recurrence, deadlines, and photo/approval requirements |
| **Kids** | Add/remove kids with custom avatars (emoji or uploaded image) and colors |
| **Rewards** | Define rewards kids can redeem with earned points |
| **Leaderboard** | View streaks, weekly/total points, and levels for all kids |
| **Approvals** | Review pending chore completions and custom chore submissions from kids |
| **History** | Browse all completed chores with filters by kid and date |
| **Settings** | Configure rotation, categories, streak bonuses, and suggestions |

### Kids Page (`/kids`)

Kid-facing interface optimized for simplicity:

- **Kid picker** on launch — each kid sees only their chores
- **Today's chores** grouped by time of day (Morning, Afternoon, Evening, Anytime)
- **One-tap completion** with optional photo capture
- **Custom chore submissions** — kids can suggest chores for parent approval
- **Rewards shop** — redeem earned points for configured rewards
- **Progress tracking** — streaks, levels, badges, and XP progress bar

### Chore Configuration

| Setting | Description |
|---|---|
| Title & Icon | Display name and emoji icon |
| Points | Base points earned on completion |
| Difficulty | 1–5 star rating |
| Time of Day | Morning, Afternoon, Evening, or Anytime |
| Recurrence | Once, Daily, Every X days, or Weekly (specific days) |
| Deadline | Optional HH:MM deadline with early completion bonus |
| Require Photo | Kid must attach a photo when completing |
| Require Approval | Parent must approve before points are awarded |
| Per Kid | Each kid can complete independently |
| Rotation | Auto-rotate assignment among selected kids |
| Category | Optional tag (when categories are enabled) |

### Categories

Categories (e.g. Kitchen, Bedroom, Outdoor) are **optional and off by default**. Enable in Settings → Categories toggle. When enabled, chores can be tagged and filtered by category.

### Streak Bonuses

Configurable point multipliers that activate when a kid maintains a daily streak:

| Example Config | Effect |
|---|---|
| 7 days → 2x | After 7 consecutive days, all points are doubled |
| 14 days → 3x | After 14 consecutive days, all points are tripled |

The highest qualifying tier applies. Streak bonuses are configured in Settings → Streak Bonuses. Multipliers are applied automatically on chore completion.

### Leveling System

Kids level up based on total points earned:

| Level | Icon | Points Required |
|---|---|---|
| Beginner | 🌱 | 0 |
| Helper | 🤝 | 50 |
| Worker | ⚒️ | 150 |
| Pro | ⭐ | 350 |
| Expert | 💎 | 700 |
| Master | 👑 | 1,500 |
| Legend | 🏆 | 3,000 |

### Badges

Automatic achievements awarded for milestones:

- **Chore count**: 1, 10, 50, 100 chores completed
- **Streak days**: 3, 7, 30 consecutive days
- **Total points**: 100, 500 points earned

### Data Storage

Chore data is stored server-side at `/data/chores.json` via the Express API:

| Endpoint | Method | Description |
|---|---|---|
| `/api/chores` | GET | Load all chore data |
| `/api/chores/kids` | POST | Add a kid |
| `/api/chores/kids/:id` | PUT | Update a kid |
| `/api/chores/kids/:id` | DELETE | Delete a kid |
| `/api/chores/chores` | POST | Add a chore |
| `/api/chores/chores/:id` | PUT | Update a chore |
| `/api/chores/chores/:id` | DELETE | Delete a chore |
| `/api/chores/logs` | POST | Complete a chore |
| `/api/chores/logs/:id/approve` | PUT | Approve a completion |
| `/api/chores/logs/:id/reject` | PUT | Reject a completion |
| `/api/chores/logs/:id/undo` | PUT | Undo a completion |
| `/api/chores/logs/:id` | DELETE | Delete a log entry |
| `/api/chores/rewards` | POST | Add a reward |
| `/api/chores/rewards/:id` | PUT | Update a reward |
| `/api/chores/rewards/:id` | DELETE | Delete a reward |
| `/api/chores/rewards/claim` | POST | Claim a reward |
| `/api/chores/rewards/claims/:id/approve` | PUT | Approve a claim |
| `/api/chores/rewards/claims/:id/reject` | PUT | Reject a claim |

### Push Notifications

HomeChores supports real-time push notifications via the Web Push API. Notifications are sent to parents when kids complete or submit chores, and to kids when their submissions are approved or rejected.

#### Requirements

Push notifications require **HTTPS** with a valid SSL certificate. Service Workers and the Push API are only available in secure contexts. There are several ways to set this up:

##### Option 1: Nginx Reverse Proxy with Let's Encrypt (Recommended)

```nginx
server {
    listen 80;
    server_name homedash.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name homedash.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/homedash.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/homedash.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Generate certificates with Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d homedash.yourdomain.com
```

##### Option 2: Nginx Proxy Manager (Unraid / NAS)

If you run Unraid or a NAS with Nginx Proxy Manager:

1. Add a new **Proxy Host** pointing to your HomeDash container IP and port (e.g. `192.168.1.50:3000`)
2. Set the domain to your chosen hostname (e.g. `homedash.yourdomain.com`)
3. Go to the **SSL** tab → select "Request a new SSL Certificate" with Let's Encrypt
4. Enable **Force SSL** and **WebSocket Support**

##### Option 3: Caddy (Automatic HTTPS)

Caddy automatically provisions Let's Encrypt certificates:

```
homedash.yourdomain.com {
    reverse_proxy localhost:3000
}
```

##### Option 4: Cloudflare Tunnel

If you don't want to open ports, use a Cloudflare Tunnel:

1. Install `cloudflared` on your server
2. Create a tunnel: `cloudflared tunnel create homedash`
3. Configure it to route your domain to `http://localhost:3000`
4. Cloudflare handles SSL automatically

#### Setting Up Notifications

1. Ensure HomeDash is accessible over HTTPS
2. Enable HomeChores in Settings → General
3. Open the **Parent** (`/parent`) or **Kids** (`/kids`) page
4. Toggle the 🔔 notification bell to subscribe
5. Accept the browser notification permission prompt

**iOS (iPhone/iPad)**: Push notifications require iOS 16.4+ and the page must be installed as a PWA ("Add to Home Screen" from Safari). Push notifications do not work in regular Safari tabs.

#### Daily Chore Reminders

A configurable daily push notification can be sent to all kid subscribers listing today's scheduled chores. Configure in Settings → General → HomeChores:

| Setting | Default | Description |
|---|---|---|
| Enable reminder | Off | Master toggle for daily reminders |
| Weekday hour | 16 | Hour (0–23) to send on Mon–Fri |
| Weekend hour | 10 | Hour (0–23) to send on Sat–Sun |
| Max chores shown | 3 | Number of chore names in notification body |

Days with no scheduled chores are automatically skipped.

#### Data Files

| File | Description |
|---|---|
| `/data/vapid-keys.json` | Auto-generated VAPID key pair for push encryption |
| `/data/push-subscriptions.json` | Active push subscriptions |

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

The `/data` volume stores `config.json`, `chores.json`, `photos/`, `vapid-keys.json`, and `push-subscriptions.json`.

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
