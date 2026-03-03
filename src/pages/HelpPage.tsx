import { useState } from "react";
import { ArrowLeft, Search, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

interface Section {
  id: string;
  icon: string;
  title: string;
  content: React.ReactNode;
}

function HelpSection({ section, open, onToggle }: { section: Section; open: boolean; onToggle: () => void }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/30 transition-colors"
      >
        <span className="text-xl">{section.icon}</span>
        <span className="flex-1 font-medium">{section.title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border pt-3 prose prose-sm prose-invert max-w-none">
          {section.content}
        </div>
      )}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-base text-muted-foreground leading-relaxed mb-3">{children}</p>;
}
function H4({ children }: { children: React.ReactNode }) {
  return <h4 className="text-base font-semibold text-foreground mt-4 mb-2">{children}</h4>;
}
function Code({ children }: { children: React.ReactNode }) {
  return <code className="text-sm bg-secondary px-1.5 py-0.5 rounded text-primary">{children}</code>;
}
function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="text-base text-muted-foreground space-y-1 ml-4 list-disc mb-3">{children}</ul>;
}
function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto mb-3">
      <table className="text-sm w-full border border-border rounded">
        <thead><tr className="bg-secondary/50">{headers.map((h, i) => <th key={i} className="px-3 py-2 text-left font-medium text-foreground">{h}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i} className="border-t border-border">{row.map((cell, j) => <td key={j} className="px-3 py-2 text-muted-foreground">{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

const sections: Section[] = [
  {
    id: "getting-started",
    icon: "🚀",
    title: "Getting Started",
    content: (
      <>
        <P>HomeDash is a smart home dashboard that connects to Home Assistant via WebSocket. It displays real-time data from your sensors, cameras, calendars, and more in a customizable grid layout.</P>
        <H4>Requirements</H4>
        <Ul>
          <li>A running Home Assistant instance</li>
          <li>A Long-Lived Access Token from HA (Profile → Security → Long-Lived Access Tokens)</li>
          <li>CORS configured in HA if running on a different domain</li>
        </Ul>
        <H4>Quick Setup</H4>
        <Ul>
          <li>Open the ⚙️ Settings panel (gear icon in the header)</li>
          <li>Enter your HA URL (e.g. <Code>http://192.168.1.100:8123</Code>)</li>
          <li>Paste your Long-Lived Access Token</li>
          <li>Click Save — the dashboard will connect and start showing data</li>
        </Ul>
        <H4>CORS Configuration</H4>
        <P>Add this to your Home Assistant <Code>configuration.yaml</Code>:</P>
        <pre className="text-sm bg-secondary p-3 rounded mb-3 overflow-x-auto">
{`http:
  cors_allowed_origins:
    - "http://YOUR_DASHBOARD_IP:3000"
    - "http://localhost:3000"`}
        </pre>
      </>
    ),
  },
  {
    id: "deployment",
    icon: "🐳",
    title: "Docker & Deployment",
    content: (
      <>
        <H4>Docker Compose</H4>
        <pre className="text-sm bg-secondary p-3 rounded mb-3 overflow-x-auto">
{`version: "3.8"
services:
  homedash:
    build: .
    ports:
      - "3000:80"
    volumes:
      - config-data:/data
    restart: unless-stopped
volumes:
  config-data:`}
        </pre>
        <H4>Unraid</H4>
        <Ul>
          <li>Go to Docker → Add Container</li>
          <li>Set Repository to your built image or Docker Hub tag</li>
          <li>Port: Host <Code>3000</Code> → Container <Code>80</Code></li>
          <li>Path: Host <Code>/mnt/user/appdata/homedash</Code> → Container <Code>/data</Code></li>
          <li>Click Apply</li>
        </Ul>
        <P>The <Code>/data</Code> directory stores <Code>config.json</Code>, <Code>chores.json</Code>, and uploaded photos. Map it to persistent storage to survive container updates.</P>
        <H4>Kiosk Mode</H4>
        <P>Append <Code>?kiosk</Code> to the URL to hide the header and settings button. Ideal for wall-mounted tablets. Combine with the blackout schedule for automatic screen dimming at night.</P>
      </>
    ),
  },
  {
    id: "layout",
    icon: "📐",
    title: "Layout & Grid System",
    content: (
      <>
        <P>The dashboard uses a CSS grid layout. You can customize columns, rows, and widget placement.</P>
        <H4>Edit Layout Mode</H4>
        <P>Click the "Edit Layout" button in the header to enter layout mode. Here you can:</P>
        <Ul>
          <li>Drag widgets to reorder them</li>
          <li>Set column span (1-6) for each widget</li>
          <li>Assign widgets to rows</li>
          <li>Set row span for multi-row widgets</li>
          <li>Group widgets (A-H) to stack them in one card</li>
          <li>Set per-row column count and height overrides</li>
          <li><strong>Lock Widget Heights</strong> — prevents widgets from expanding beyond their grid cell</li>
        </Ul>
        <H4>Mobile</H4>
        <P>On mobile devices, the grid collapses to a single column. Column spans, row spans, and fixed heights are ignored for natural stacking.</P>
      </>
    ),
  },
  {
    id: "widgets",
    icon: "🧩",
    title: "Widgets Overview",
    content: (
      <>
        <P>HomeDash includes the following widget types. Each is configured in the Widgets tab of Settings.</P>
        <Table
          headers={["Widget", "Description", "Key Settings"]}
          rows={[
            ["🌡️ Temperature", "Shows temperature + humidity from HA sensors with optional background chart", "Entity, label, color, group, chart type, rounding"],
            ["🌤️ Weather", "Current weather, sun times, and multi-day forecast chart", "Entity, forecast days, precipitation, sunrise/sunset"],
            ["📅 Calendar", "Upcoming events from HA calendar entities", "Entities, prefix, color, forecast days, week number"],
            ["⚡ Electricity", "Real-time electricity prices with hourly chart (Nordpool)", "Price entity, forecast entity, surcharge"],
            ["📷 Photos", "Rotating photo gallery with transition effects", "Interval, display mode, transition (fade/slide/zoom/flip/blur)"],
            ["👤 Person", "Person tracking with location, battery, distance", "Entity, avatar size, custom sensors"],
            ["🍽️ Food Menu", "School/restaurant menu from calendar or Skolmaten", "Source, entity, days, display mode"],
            ["📊 General Sensor", "Flexible sensor card with chart and info rows", "Chart series, top/bottom info, history, aggregation"],
            ["📋 Sensor Grid", "Compact multi-cell grid of sensors", "Rows, columns, intervals, value maps, visibility filters"],
            ["📰 RSS News", "RSS feed reader via server proxy", "Feed URL, max items, label"],
            ["🔔 Notifications", "HA persistent notifications + custom alert rules", "Alert entity, condition, threshold, icon"],
            ["🚗 Vehicle", "Vehicle data organized in sections", "Sections, entities, icons, colors"],
            ["🌿 Pollen", "Pollen levels with severity dots and forecast", "Sensors, forecast days, show label/forecast"],
            ["✅ Chores", "HomeChores status widget (requires enabling)", "Auto-configured, click to manage"],
          ]}
        />
      </>
    ),
  },
  {
    id: "temperature",
    icon: "🌡️",
    title: "Temperature Widget",
    content: (
      <>
        <P>Displays temperature and optionally humidity from HA sensor entities. Multiple sensors can be grouped into a single widget card.</P>
        <H4>Configuration</H4>
        <Ul>
          <li><strong>Entity ID</strong> — temperature sensor (e.g. <Code>sensor.living_room_temperature</Code>)</li>
          <li><strong>Humidity Entity</strong> — optional humidity sensor</li>
          <li><strong>Label</strong> — display name</li>
          <li><strong>Color</strong> — accent color for icon and values</li>
          <li><strong>Group</strong> — sensors with same group number share one widget card</li>
          <li><strong>Show Chart</strong> — 24h history chart in background</li>
          <li><strong>Chart Type</strong> — line, bar, area, step, or scatter</li>
          <li><strong>Round Temperature</strong> — round to nearest integer</li>
        </Ul>
        <H4>Styling</H4>
        <P>Per-sensor overrides for icon size, icon color, label/value color, and text sizes.</P>
      </>
    ),
  },
  {
    id: "weather",
    icon: "🌤️",
    title: "Weather Widget",
    content: (
      <>
        <P>Shows current temperature, conditions, sunrise/sunset times, and a multi-day forecast chart.</P>
        <H4>Configuration</H4>
        <Ul>
          <li><strong>Entity ID</strong> — weather entity (e.g. <Code>weather.home</Code>)</li>
          <li><strong>Forecast Days</strong> — number of days in forecast (default 5)</li>
          <li><strong>Show Precipitation</strong> — rain probability in forecast</li>
          <li><strong>Show Sunrise/Sunset</strong> — sun times display</li>
          <li><strong>Show Date</strong> — current date display</li>
        </Ul>
        <H4>Styling</H4>
        <P>Granular control over clock text size/color, temperature icon/text size/color, sun icon/text size/color, chart day text, and date display.</P>
      </>
    ),
  },
  {
    id: "calendar",
    icon: "📅",
    title: "Calendar Widget",
    content: (
      <>
        <P>Displays upcoming events from one or more HA calendar entities.</P>
        <H4>Configuration</H4>
        <Ul>
          <li><strong>Calendar Entities</strong> — add multiple calendars with prefix and color</li>
          <li><strong>Forecast Days</strong> — how many days ahead to show (default 7, per-calendar override available)</li>
          <li><strong>Show Event Body</strong> — display event description</li>
          <li><strong>Show End Date</strong> — display event end time</li>
          <li><strong>Show Week Number</strong> — ISO week numbers</li>
          <li><strong>First Day of Week</strong> — Sunday, Monday, or Saturday</li>
          <li><strong>Limit Events</strong> — cap max events shown</li>
        </Ul>
        <H4>Display</H4>
        <P>Font sizes for day label, time, title, and body are individually configurable.</P>
      </>
    ),
  },
  {
    id: "electricity",
    icon: "⚡",
    title: "Electricity Price Widget",
    content: (
      <>
        <P>Shows real-time electricity prices with an hourly bar chart, current price badge, and daily stats (min/avg/max).</P>
        <H4>Configuration</H4>
        <Ul>
          <li><strong>Price Entity</strong> — Nordpool sensor entity</li>
          <li><strong>Forecast Entity</strong> — optional tomorrow's prices entity</li>
          <li><strong>Surcharge</strong> — fixed kr/kWh added to all prices</li>
        </Ul>
        <H4>Styling</H4>
        <P>Price text, unit text, stats text, and axis text sizes and colors.</P>
      </>
    ),
  },
  {
    id: "general-sensor",
    icon: "📊",
    title: "General Sensor Widget",
    content: (
      <>
        <P>A flexible sensor card with a chart and up to 4 info items at top and bottom.</P>
        <H4>Configuration</H4>
        <Ul>
          <li><strong>Chart Series</strong> — add sensors to plot (entity, label, color, chart type)</li>
          <li><strong>Top/Bottom Info</strong> — up to 4 sensor values each (entity, label, unit, color)</li>
          <li><strong>History</strong> — 1h, 6h, 24h, or 7 days</li>
          <li><strong>Chart Grouping</strong> — aggregate by minute, hour, or day</li>
          <li><strong>Aggregation</strong> — average, max, min, sum, last, or delta</li>
        </Ul>
        <H4>Delta Aggregation</H4>
        <P>When using delta (common for cumulative energy meters), the chart calculates differences between time buckets. Negative deltas (meter resets) are automatically handled — the new value is used instead of showing a large negative spike.</P>
      </>
    ),
  },
  {
    id: "sensor-grid",
    icon: "📋",
    title: "Sensor Grid Widget",
    content: (
      <>
        <P>A compact grid of sensor cells with icons, values, and optional features.</P>
        <H4>Cell Features</H4>
        <Ul>
          <li><strong>Intervals</strong> — conditional icon and color based on numeric value ranges</li>
          <li><strong>Value Maps</strong> — rewrite raw values to display text (e.g. "on" → "Active")</li>
          <li><strong>Visibility Filters</strong> — hide cells based on value range or exact match</li>
          <li><strong>Column/Row Span</strong> — cells can span multiple grid positions</li>
          <li><strong>Background Chart</strong> — mini chart like the temperature widget</li>
        </Ul>
      </>
    ),
  },
  {
    id: "photos",
    icon: "📷",
    title: "Photo Gallery",
    content: (
      <>
        <P>A rotating photo gallery that displays uploaded images with configurable transitions.</P>
        <H4>Photo Management</H4>
        <P>Go to the Photos tab in Settings to upload, sort, and delete photos. Photos are stored server-side in <Code>/data/photos/</Code>. Photos can be sorted by newest, oldest, largest, or smallest.</P>
        <H4>Display Modes</H4>
        <Ul>
          <li><strong>Contain</strong> — full image visible, letterboxed</li>
          <li><strong>Cover</strong> — fills the area, crops edges</li>
          <li><strong>Blur-fill</strong> — image centered with blurred version as background</li>
        </Ul>
        <H4>Transition Effects</H4>
        <Table
          headers={["Transition", "Description"]}
          rows={[
            ["None", "Instant switch, no animation"],
            ["Fade", "Smooth opacity crossfade (default)"],
            ["Slide", "Horizontal slide between photos"],
            ["Zoom", "Zoom in/out transition"],
            ["Flip", "3D card flip effect"],
            ["Blur", "Blur out old photo, blur in new"],
          ]}
        />
      </>
    ),
  },
  {
    id: "entity-attributes",
    icon: "🔗",
    title: "Entity Attribute Access",
    content: (
      <>
        <P>All entity ID fields support dot-notation attribute access for reading specific attributes from an entity instead of its main state.</P>
        <H4>Format</H4>
        <pre className="text-sm bg-secondary p-3 rounded mb-3">
{`domain.object_id                → main state value
domain.object_id.attribute_name  → specific attribute

Examples:
sensor.temperature               → "21.5"
sensor.phone.battery_level       → "85"
climate.living_room.current_temperature → "22.0"`}
        </pre>
        <P>This works across all widget types: temperature, sensor grid, general sensor, vehicle, person, notification rules, and pollen.</P>
      </>
    ),
  },
  {
    id: "themes",
    icon: "🎨",
    title: "Themes & Styling",
    content: (
      <>
        <P>HomeDash ships with 6 built-in themes. Select your theme in Settings → General → Theme.</P>
        <Table
          headers={["Theme", "Description"]}
          rows={[
            ["Midnight Teal", "Dark blue-gray with teal accent (default)"],
            ["Charcoal", "Neutral grays with amber accent"],
            ["Deep Ocean", "Blue tones with blue accent"],
            ["Warm Ember", "Dark warm tones with orange/red accent"],
            ["AMOLED Black", "Pure black background, no shadows"],
            ["macOS Dark", "Dark gray with blue accent, macOS-inspired"],
          ]}
        />
        <H4>Global Font Sizes</H4>
        <P>Four global font size categories affect all widgets: Heading, Value, Body, and Label. Per-widget overrides are available in each widget's settings.</P>
        <H4>Widget Styles</H4>
        <P>Most widgets support per-widget style overrides for icon size, icon color, text color, label color, value color, and heading color.</P>
      </>
    ),
  },
  {
    id: "homechores",
    icon: "✅",
    title: "HomeChores — Chore Tracking",
    content: (
      <>
        <P>HomeChores is a family chore tracking system built into HomeDash. Enable it in Settings → General → HomeChores.</P>
        <H4>Parent Page (/parent)</H4>
        <P>The parent dashboard uses a mobile-friendly hamburger menu with 7 tabs. A persistent badge on the menu icon shows pending approvals.</P>
        <Ul>
          <li><strong>Chores</strong> — Create, edit, pause, and delete chores. Set recurrence, points, difficulty, time of day, deadlines with early bonuses, photo requirements, and approval mode.</li>
          <li><strong>Kids</strong> — Add kids with emoji or photo avatars and colors. View their points, streaks, levels, and earned badges.</li>
          <li><strong>Rewards</strong> — Define rewards with point costs. Kids can claim rewards when they have enough points.</li>
          <li><strong>Leaderboard</strong> — Compare streaks, weekly/total points, and levels across all kids.</li>
          <li><strong>Approvals</strong> — Review pending chore completions and custom chore submissions from kids. Reject with optional reason.</li>
          <li><strong>History</strong> — Browse completed chores with expandable detail cards, proof photos, and filters by kid/date.</li>
          <li><strong>Settings</strong> — Configure rotation, categories (optional), streak bonuses, and suggestions.</li>
        </Ul>
        <H4>Kids Page (/kids)</H4>
        <P>A mobile-first page designed for kids. Features:</P>
        <Ul>
          <li>Kid selection screen with large avatar buttons</li>
          <li>Chores grouped by time of day (Morning, Afternoon, Evening, Anytime)</li>
          <li>One-tap completion with 5-minute undo window</li>
          <li>Photo capture for chores that require proof</li>
          <li>Custom chore submissions — kids can suggest their own tasks for parent approval</li>
          <li>Stats: total points, day streak, weekly points, level progress</li>
          <li>Badge collection display</li>
          <li>Reward shop with progress bars</li>
        </Ul>
        <H4>Installing as iPhone App</H4>
        <P>Both the Kids and Parent pages are PWAs. To install on iPhone:</P>
        <Ul>
          <li>Open <Code>http://YOUR_IP:3000/kids</Code> (or <Code>/parent</Code>) in Safari</li>
          <li>Tap the Share button → "Add to Home Screen" → "Add"</li>
        </Ul>
        <H4>Recurrence</H4>
        <Table
          headers={["Type", "Description"]}
          rows={[
            ["Once", "Appears once, disappears when completed"],
            ["Daily", "Resets every day"],
            ["Every X days", "Reappears X days after last completion"],
            ["Weekly", "Appears on selected weekdays, resets each occurrence"],
          ]}
        />
        <H4>Categories</H4>
        <P>Chore categories (e.g. Kitchen, Bedroom, Outdoor) are <strong>optional and off by default</strong>. Enable in Settings → Categories toggle. When enabled, chores can be tagged and filtered by category.</P>
        <H4>Streak Bonuses</H4>
        <P>Configure milestone-based point multipliers in Settings → Streak Bonuses. When a kid maintains a consecutive daily streak, the highest qualifying multiplier applies automatically.</P>
        <Table
          headers={["Example Config", "Effect"]}
          rows={[
            ["7 days → 2×", "All points doubled after 7 consecutive days"],
            ["14 days → 3×", "All points tripled after 14 consecutive days"],
          ]}
        />
        <H4>Leveling System</H4>
        <Table
          headers={["Level", "Icon", "Points"]}
          rows={[
            ["Beginner", "🌱", "0"],
            ["Helper", "🤝", "50"],
            ["Worker", "⚒️", "150"],
            ["Pro", "⭐", "350"],
            ["Expert", "💎", "700"],
            ["Master", "👑", "1,500"],
            ["Legend", "🏆", "3,000"],
          ]}
        />
        <H4>Gamification</H4>
        <Ul>
          <li><strong>Points</strong> — each chore has a point value, harder chores = more points</li>
          <li><strong>Streaks</strong> — consecutive days with at least one chore completed</li>
          <li><strong>Streak Bonuses</strong> — configurable multipliers at streak milestones</li>
          <li><strong>Deadlines</strong> — optional deadline with early completion bonus points</li>
          <li><strong>Badges</strong> — auto-awarded for chore count, streak, and point milestones</li>
          <li><strong>Levels</strong> — 7 tiers from Beginner to Legend based on total points</li>
          <li><strong>Rewards</strong> — parent-defined prizes, kids see progress and can claim</li>
          <li><strong>Per-kid mode</strong> — each kid completes independently</li>
          <li><strong>Rotation</strong> — auto-rotate assignment among selected kids</li>
          <li><strong>Fairness suggestions</strong> — suggests whose turn based on history</li>
        </Ul>
        <H4>Dashboard Widget</H4>
        <P>When enabled, a Chores widget appears on the main dashboard showing today's due chores with color-coded urgency dots, completions, countdowns, and weekly scoreboard.</P>
        <H4>Push Notifications</H4>
        <P>HomeChores supports real-time push notifications via the Web Push API. Parents are notified of submissions and completions, kids are notified of approvals and rejections.</P>
        <Ul>
          <li><strong>Requirement</strong>: HTTPS with a valid SSL certificate (see Push Notifications section below)</li>
          <li><strong>iOS</strong>: Requires iOS 16.4+ and the page must be installed as a PWA via "Add to Home Screen" in Safari</li>
          <li>Toggle the 🔔 bell icon on the Parent or Kids page to subscribe</li>
        </Ul>
        <H4>Daily Chore Reminders</H4>
        <P>An optional daily push notification sent to kids listing today's scheduled chores. Enable in Settings → General → HomeChores.</P>
        <Table
          headers={["Setting", "Default", "Description"]}
          rows={[
            ["Enable reminder", "Off", "Master toggle for daily reminders"],
            ["Weekday hour", "16", "Hour (0–23) to send on Mon–Fri"],
            ["Weekend hour", "10", "Hour (0–23) to send on Sat–Sun"],
            ["Max chores shown", "3", "Chore names included in the notification"],
          ]}
        />
        <P>Days with no scheduled chores are automatically skipped.</P>
      </>
    ),
  },
  {
    id: "push-notifications",
    icon: "🔔",
    title: "Push Notifications & HTTPS Setup",
    content: (
      <>
        <P>Push notifications require <strong>HTTPS</strong> with a valid SSL certificate. Service Workers and the Push API only work in secure contexts. Here are several ways to set up HTTPS for HomeDash:</P>
        
        <H4>Option 1: Nginx + Let's Encrypt (Recommended)</H4>
        <P>Set up Nginx as a reverse proxy with free Let's Encrypt SSL certificates:</P>
        <pre className="text-sm bg-secondary p-3 rounded mb-3 overflow-x-auto">
{`server {
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
}`}
        </pre>
        <P>Generate certificates with Certbot:</P>
        <pre className="text-sm bg-secondary p-3 rounded mb-3 overflow-x-auto">
{`sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d homedash.yourdomain.com`}
        </pre>

        <H4>Option 2: Nginx Proxy Manager (Unraid / NAS)</H4>
        <P>If you run Unraid or a NAS with Nginx Proxy Manager:</P>
        <Ul>
          <li>Add a new <strong>Proxy Host</strong> pointing to your HomeDash container IP and port (e.g. <Code>192.168.1.50:3000</Code>)</li>
          <li>Set the domain to your hostname (e.g. <Code>homedash.yourdomain.com</Code>)</li>
          <li>Go to the <strong>SSL</strong> tab → "Request a new SSL Certificate" with Let's Encrypt</li>
          <li>Enable <strong>Force SSL</strong> and <strong>WebSocket Support</strong></li>
        </Ul>

        <H4>Option 3: Caddy (Automatic HTTPS)</H4>
        <P>Caddy automatically provisions Let's Encrypt certificates with zero configuration:</P>
        <pre className="text-sm bg-secondary p-3 rounded mb-3 overflow-x-auto">
{`homedash.yourdomain.com {
    reverse_proxy localhost:3000
}`}
        </pre>

        <H4>Option 4: Cloudflare Tunnel</H4>
        <P>No open ports needed. Cloudflare handles SSL automatically:</P>
        <Ul>
          <li>Install <Code>cloudflared</Code> on your server</li>
          <li>Create a tunnel: <Code>cloudflared tunnel create homedash</Code></li>
          <li>Configure it to route your domain to <Code>http://localhost:3000</Code></li>
        </Ul>

        <H4>Subscribing to Notifications</H4>
        <Ul>
          <li>Ensure HomeDash is accessible over HTTPS</li>
          <li>Enable HomeChores in Settings → General</li>
          <li>Open the Parent (<Code>/parent</Code>) or Kids (<Code>/kids</Code>) page</li>
          <li>Toggle the 🔔 notification bell to subscribe</li>
          <li>Accept the browser notification permission prompt</li>
        </Ul>
        <P><strong>iOS note:</strong> Push notifications require iOS 16.4+ and the page must be installed as a PWA ("Add to Home Screen" from Safari). They do not work in regular Safari tabs.</P>

        <H4>Data Files</H4>
        <Table
          headers={["File", "Description"]}
          rows={[
            ["/data/vapid-keys.json", "Auto-generated VAPID key pair for push encryption"],
            ["/data/push-subscriptions.json", "Active push notification subscriptions"],
          ]}
        />
      </>
    ),
  },
  {
    id: "date-time",
    icon: "🕐",
    title: "Date & Time Formats",
    content: (
      <>
        <P>Global date and time format settings affect all widgets. Configure in Settings → General.</P>
        <Table
          headers={["Format", "Example"]}
          rows={[
            ["yyyy-MM-dd (ISO)", "2025-02-21"],
            ["dd/MM/yyyy", "21/02/2025"],
            ["MM/dd/yyyy", "02/21/2025"],
            ["dd.MM.yyyy", "21.02.2025"],
          ]}
        />
        <P>Time format: 24-hour (14:30) or 12-hour (2:30 PM).</P>
      </>
    ),
  },
  {
    id: "api",
    icon: "⚙️",
    title: "Server API & Technical",
    content: (
      <>
        <P>HomeDash runs an Express server that serves the frontend and handles API requests.</P>
        <H4>API Endpoints</H4>
        <Table
          headers={["Method", "Path", "Description"]}
          rows={[
            ["GET", "/api/config", "Get dashboard configuration"],
            ["PUT", "/api/config", "Save dashboard configuration"],
            ["GET", "/api/config/backups", "List config backups"],
            ["POST", "/api/config/backups/restore/:file", "Restore a config backup"],
            ["GET", "/api/photos", "List uploaded photos"],
            ["POST", "/api/photos/upload", "Upload photos (base64 JSON)"],
            ["DELETE", "/api/photos/:filename", "Delete a photo"],
            ["GET", "/api/rss?url=...", "Proxy RSS feed (avoids CORS)"],
            ["GET", "/api/chores", "Get all chores data"],
            ["POST", "/api/chores/kids", "Add a kid"],
            ["POST", "/api/chores/chores", "Add a chore"],
            ["POST", "/api/chores/logs", "Complete a chore"],
            ["PUT", "/api/chores/logs/:id/undo", "Undo a completion"],
            ["PUT", "/api/chores/logs/:id/approve", "Approve a completion"],
            ["PUT", "/api/chores/logs/:id/reject", "Reject a completion"],
            ["DELETE", "/api/chores/logs/:id", "Delete a log entry"],
            ["POST", "/api/chores/rewards", "Add a reward"],
            ["POST", "/api/chores/rewards/claim", "Claim a reward"],
            ["GET", "/api/push/vapid-public-key", "Get VAPID public key"],
            ["POST", "/api/push/subscribe", "Register push subscription"],
            ["POST", "/api/push/unsubscribe", "Remove push subscription"],
          ]}
        />
        <H4>Data Persistence</H4>
        <Ul>
          <li><Code>/data/config.json</Code> — dashboard configuration (with automatic backups)</li>
          <li><Code>/data/chores.json</Code> — chores, kids, logs, badges, rewards</li>
          <li><Code>/data/photos/</Code> — uploaded photo files</li>
          <li><Code>/data/vapid-keys.json</Code> — VAPID keys for push notifications</li>
          <li><Code>/data/push-subscriptions.json</Code> — active push subscriptions</li>
        </Ul>
        <H4>WebSocket Connection</H4>
        <P>The dashboard connects to Home Assistant via WebSocket for real-time state updates. The connection indicator in the header shows: connecting (yellow), connected (green), or disconnected (red).</P>
      </>
    ),
  },
  {
    id: "import-export",
    icon: "💾",
    title: "Import / Export Configuration",
    content: (
      <>
        <P>You can export your entire dashboard configuration as a JSON file and import it on another instance.</P>
        <H4>Export</H4>
        <P>Settings → General → Import/Export → Export. Downloads a <Code>homedash-config.json</Code> file.</P>
        <H4>Import</H4>
        <P>Click Import and select a previously exported JSON file. The configuration will be loaded and saved immediately.</P>
        <P>⚠️ Importing replaces your entire configuration. Export a backup first.</P>
      </>
    ),
  },
  {
    id: "config-backups",
    icon: "💾",
    title: "Configuration Backups",
    content: (
      <>
        <P>The server automatically creates timestamped backups of your configuration whenever it is saved.</P>
        <H4>Automatic Backups</H4>
        <P>Each save to <Code>/api/config</Code> creates a backup file in <Code>/data/</Code>. Use the API to list and restore backups:</P>
        <Table
          headers={["Action", "Endpoint"]}
          rows={[
            ["List backups", "GET /api/config/backups"],
            ["Restore a backup", "POST /api/config/backups/restore/:filename"],
          ]}
        />
        <H4>Manual Export / Import</H4>
        <P>Go to Settings → General → Import/Export to download your full config as JSON, or upload a previously exported file.</P>
        <P>⚠️ Importing replaces your entire configuration. Always export a backup first.</P>
      </>
    ),
  },
  {
    id: "troubleshooting",
    icon: "🔧",
    title: "Troubleshooting",
    content: (
      <>
        <P>Common issues and their solutions:</P>
        <Table
          headers={["Issue", "Solution"]}
          rows={[
            ["Blank dashboard / no data", "Verify HA URL and token in Settings → Connection. Check CORS config in HA."],
            ["WebSocket disconnects", "Ensure HA is reachable. Check reverse proxy WebSocket support (Upgrade headers)."],
            ["CORS errors in console", "Add dashboard origin to cors_allowed_origins in HA's configuration.yaml and restart HA."],
            ["Photos not loading", "Ensure /data volume is mounted and writable. Check server logs."],
            ["Push notifications not working", "HTTPS required. Verify SSL cert. On iOS, page must be installed as PWA."],
            ["Calendar shows no events", "Check entity ID. Verify calendar has events within forecast range."],
            ["Electricity prices missing", "Confirm Nordpool entity exists with raw_today/raw_tomorrow attributes."],
            ["Chores not saving", "Ensure /data directory is writable by container process."],
            ["Kiosk mode stuck", "Triple-click anywhere to exit kiosk mode."],
          ]}
        />
      </>
    ),
  },
];

export default function HelpPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["getting-started"]));

  const toggle = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setOpenSections(new Set(sections.map((s) => s.id)));
  const collapseAll = () => setOpenSections(new Set());

  const filtered = search.trim()
    ? sections.filter(
        (s) =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.id.toLowerCase().includes(search.toLowerCase())
      )
    : sections;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">📖 HomeDash Documentation</h1>
            <p className="text-sm text-muted-foreground">Complete guide to setup and configuration</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Search + controls */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documentation..."
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={expandAll}>Expand all</Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>Collapse</Button>
        </div>

        {/* Table of contents */}
        <div className="border border-border rounded-lg p-3">
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">Contents</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => { setOpenSections((prev) => new Set(prev).add(s.id)); document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: "smooth" }); }}
                className="text-sm text-left text-muted-foreground hover:text-foreground px-2 py-1.5 rounded hover:bg-secondary/50 transition-colors truncate"
              >
                {s.icon} {s.title}
              </button>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-2">
          {filtered.map((section) => (
            <div key={section.id} id={`section-${section.id}`}>
              <HelpSection
                section={section}
                open={openSections.has(section.id)}
                onToggle={() => toggle(section.id)}
              />
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No sections match your search.</p>
        )}

        <div className="text-center text-sm text-muted-foreground py-8 border-t border-border">
          HomeDash — Smart Home Dashboard
        </div>
      </div>
    </div>
  );
}
