## Add screenshots to README

### 1. Save the user-uploaded main page screenshot
- Save the uploaded image to `docs/screenshots/dashboard-main.png` (user's own shot, takes priority for the hero image).

### 2. Capture additional screenshots from the live preview
Use the browser tool against the sandbox preview (demo mode kicks in when HA isn't configured, so widgets render with mock data). Save each as a PNG under `docs/screenshots/`:

| File | Route | Viewport |
|---|---|---|
| `dashboard-demo.png` | `/` | 1685×1153 (desktop) |
| `edit-layout.png` | `/` then open Edit Layout overlay | 1685×1153 |
| `settings.png` | `/` then open Settings (gear icon) | 1685×1153 |
| `parent.png` | `/parent` | 1685×1153 |
| `kids.png` | `/kids` | 414×896 (mobile, since Kids UI is mobile-first) |

If any view requires interaction that the browser can't reliably trigger, fall back to a single full-page screenshot of that route and note it.

### 3. Add a `## 📸 Screenshots` section to `README.md`
Insert it just after the intro (around line 7, before `## 📦 Installation`) so it's the first thing users see. Layout:

```md
## 📸 Screenshots

### Main Dashboard
![Main dashboard](docs/screenshots/dashboard-main.png)

### Edit Layout Mode
![Edit layout overlay](docs/screenshots/edit-layout.png)

### Settings
![Settings panel](docs/screenshots/settings.png)

### HomeChores — Parent
![Parent interface](docs/screenshots/parent.png)

### HomeChores — Kids (mobile)
<img src="docs/screenshots/kids.png" alt="Kids interface" width="320" />
```

The mobile shot uses an `<img>` tag with a fixed width so it doesn't render full-width on GitHub.

### 4. Verify
- Confirm all referenced files exist in `docs/screenshots/`.
- Re-read the modified README section to confirm formatting.

### Notes
- No code changes outside `README.md` and the new `docs/screenshots/` folder.
- Demo data will be visible in captured shots; that's acceptable for marketing/preview purposes and matches what a fresh install looks like.
