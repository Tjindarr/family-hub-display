## Goal

The `/mobile` page should be a fully standalone dashboard:

1. **Picker exposes every widget type** — even ones not present on main.
2. **Independent copies** of singleton widgets (weather, calendar, electricity, photos, food menu, notifications, pollen, chores) with mobile-only config that overrides the main config.
3. **Mobile-only collection instances** added for parcels, general sensors, vehicles, persons, temperature groups (previously only sensor grids / actions / cameras / RSS).

## Changes

### 1. Types (`src/lib/config-types.ts`)

Extend `MobileDashboardConfig` with:

- Mobile-only collections (new): `parcelWidgets`, `personEntities`, `temperatureEntities`.
- Optional singleton overrides: `weatherConfig?`, `calendarEntityConfigs?` / `calendarDisplay?` / `calendarForecastDays?`, `electricityPriceEntity?` / `electricityForecastEntity?` / `electricitySurcharge?` / `electricityStyle?`, `photoWidget?`, `foodMenuConfig?`, `notificationConfig?`, `pollenConfig?`, `choreWidgetConfig?`. When unset → fall back to main config.

### 2. Defaults (`src/lib/config-defaults.ts`)

Initialize new collection arrays as `[]`. Singleton overrides stay `undefined` by default.

### 3. `src/pages/MobilePage.tsx`

- Build `viewConfig` so that each singleton uses `mobileDash.<key> ?? config.<key>`.
- Merge new mobile-only collections (`parcelWidgets`, `personEntities`, `temperatureEntities`) into `viewConfig` similar to existing ones.
- Update `renderWidget` to source from `viewConfig` for `weather`, `calendar`, `electricity`, `photos`, `food_menu`, `notifications`, `pollen`, `chores`, `person_*`, `temp_group_*`, `parcel_*`.
- Data hooks (`useWeatherData`, `useCalendarData`, etc.) take `viewConfig` instead of `config` so they read the overridden values.

### 4. `src/components/MobileConfigTab.tsx`

`MobileDashboardEditor`:

- **Picker:** "Add widget" dropdown lists every available widget ID (singletons + collection IDs from both main and mobile-only arrays) — not just those currently configured on main. Items are grouped:
  - "Mirror from main" (main-only IDs)
  - "Mobile-only" (📱 prefixed)
  - "Add singleton override" (weather, calendar, electricity, photos, food_menu, notifications, pollen, chores) — clicking creates a stub mobile override and adds the ID to `widgetOrder`.
- New mobile-only editor sections for parcels, persons, temperature entities, vehicles, general sensors (minimal viable inline editors; full-featured editing remains in main Widgets tab via mirroring).
- Singleton override sections: collapsible blocks with a "Use main dashboard config" toggle and the minimal fields needed for each (entityId for weather/calendar/electricity, photos list, etc.). Power users can still edit complex fields on the main tab and mirror.

### 5. `src/components/ConfigPanel.tsx`

Pass the full main `widgetItems` plus a list of "addable widget kinds" (the singletons + the typed collections) to `MobileDashboardEditor` so the picker is complete regardless of main state.

## Out of scope

- No drag-drop changes — the existing `DashboardEditOverlay` already handles layout for any id rendered by `renderWidget`.
- No new server-side schema changes — config is JSON.

## Notes

This keeps backward compatibility: empty mobile overrides mean current behavior (mirror main). Existing `mobileLayout.sections` legacy migration stays as-is.
