## Goal

Make the Mobile page a fully independent, customizable dashboard — with its own widgets, layout, ordering, and sizing — instead of only referencing widgets configured on the main dashboard.

## Current state

- Main dashboard: full grid system (`widgetOrder`, `widgetLayouts`, `rowColumns`, `rowHeights`, `gridColumns`) plus a rich set of widget definitions (weather, calendar, temperature, electricity, persons, sensors, vehicles, action widgets, camera grids, RSS, pollen, photo, food menu, chores).
- Mobile page (`MobilePage.tsx`): only renders `config.mobileLayout.sections[]` containing items that point by `refId` to entries already configured on the main dashboard (`sensorGrid` / `generalSensor` / `actionWidget` / `cameraGrid` / generic `widget`). No independent widget configs, no per-mobile sizing, no drag-to-reorder grid.

## Target behavior

The mobile page becomes a parallel dashboard with its own:

1. **Independent widget instances** — create/edit/delete widgets that live only on mobile (e.g. a sensor grid that exists only on the mobile page).
2. **Independent layout** — order, column span, row, row-span, per-row column count, row heights, lock-heights — same primitives as the main dashboard, but stored separately.
3. **Independent grid columns** — typically 1–2 columns by default for narrow viewports, user-configurable.
4. **Optional "mirror from main"** — keep the existing ability to include a widget that already exists on the main page (no duplication needed), as a non-breaking compatibility path.
5. **Edit Layout overlay on mobile** — reuse the same DashboardEditOverlay UX so the mobile grid is drag-and-drop editable.

## Plan

### 1. Data model (`src/lib/config-types.ts` + `config-defaults.ts`)

Add a `mobileDashboard` block to `DashboardConfig`, parallel to the main dashboard fields:

```text
mobileDashboard: {
  gridColumns: number;              // default 2
  widgetOrder: string[];            // ids of mobile-owned widgets + "mirror:<mainWidgetId>" entries
  widgetLayouts: Record<string, WidgetLayout>;
  rowColumns: Record<number, number>;
  rowHeights: Record<number, number>;
  lockWidgetHeights: boolean;

  // Mobile-only instances of the existing widget types:
  generalSensors: GeneralSensorConfig[];
  sensorGrids:    SensorGridConfig[];
  actionWidgets:  ActionWidgetConfig[];
  cameraGrids:    CameraGridConfig[];
  rssFeeds:       RssNewsConfig[];
  vehicles:       VehicleConfig[];
  // Singleton widgets (weather/calendar/electricity/photo/foodMenu/pollen/notifications/chores)
  // remain configured once in the main config; mobile references them via "mirror:<id>".
}
```

The existing `mobileLayout.sections` is preserved and treated as a legacy/optional grouping layer (still rendered if present, but the primary mobile UI shifts to the grid). A small one-time migration on load can convert old `mobileLayout` items into the new `widgetOrder` if `mobileDashboard` is empty.

### 2. Mobile widget rendering (`src/pages/MobilePage.tsx`)

- Replace the section-list renderer with a grid renderer that mirrors `Index.tsx`:
  - Read `mobileDashboard.widgetOrder` and place each item into the grid using `mobileDashboard.widgetLayouts`, `rowColumns`, `rowHeights`, `gridColumns`.
  - For an id like `mirror:<mainId>`, render the corresponding main-dashboard widget using existing data hooks (already wired in this file).
  - For mobile-owned ids, render the mobile instance from `mobileDashboard.generalSensors / sensorGrids / actionWidgets / cameraGrids / rssFeeds / vehicles`. Reuse the same widget components (`SensorGridWidget`, `GeneralSensorWidget`, `ActionWidget`, `CameraGridWidget`, `RssNewsWidget`, `VehicleWidget`).
- Continue to render `WallpaperBackground` and respect `wallpaper.applyToMobile`.
- Keep the existing data hooks; extend `useSensorGridData`, `useGeneralSensorData`, `useRssNews`, `useVehicleData` calls to also pull from the mobile-owned configs (simplest: merge `config.sensorGrids` with `config.mobileDashboard.sensorGrids` before passing to the hook, namespacing mobile ids with a prefix like `m:` to avoid id collisions).

### 3. Edit Layout overlay

- `DashboardEditOverlay` currently operates on the main `widgetOrder` / `widgetLayouts`. Generalize it to accept a "scope" (main vs. mobile) — either by passing in `order`, `layouts`, `rowColumns`, `rowHeights`, `gridColumns`, `lockWidgetHeights` and `on*Change` callbacks, or by adding a `scope: "main" | "mobile"` prop that reads/writes the corresponding config slice.
- On the mobile page, add a floating "Edit layout" button (mirroring the main page button) that opens the overlay in mobile scope.

### 4. Config panel (`src/components/ConfigPanel.tsx` + `MobileConfigTab.tsx`)

Rework the Mobile tab into two parts:

1. **Mobile widgets** — full editors for the mobile-owned arrays (general sensors, sensor grids, action widgets, camera grids, RSS feeds, vehicles). Reuse the existing editor components used on the main Widgets tab, just pointing them at `mobileDashboard.*` state and `setMobile*` setters.
2. **Mirror from main dashboard** — multi-select of existing main-dashboard widget ids to add as `mirror:<id>` entries in the mobile order.
3. **Mobile layout** — `gridColumns` input, `lockWidgetHeights` toggle, and a button to open the Edit Layout overlay in mobile scope.

The legacy `MobileLayoutEditor` (sections + items) can be moved under a collapsible "Legacy sections" panel for users who already configured it, with a one-click "Convert to grid" action that pushes those items into `mobileDashboard.widgetOrder` and clears `mobileLayout.sections`.

### 5. Migration / defaults

- `DEFAULT_CONFIG.mobileDashboard` initialised with empty arrays, `gridColumns: 2`, `lockWidgetHeights: false`, empty layouts.
- On first load, if `mobileDashboard` is missing but `mobileLayout.sections` has items, auto-populate `widgetOrder` with the section items so existing users see no regression.

## Technical details

- Id namespacing: mobile-owned widgets get a `m:` prefix in `widgetOrder` (e.g. `m:sg_kitchen`, `m:gs_power`) and in the corresponding config arrays' `id` fields, so they never collide with main ids and the renderer can dispatch cleanly. Mirrored widgets use `mirror:<mainId>`.
- Widget grid placement: reuse the same row/col/colSpan/rowSpan math from `Index.tsx`. Extract a small helper (e.g. `src/lib/grid-layout.ts`) used by both pages to avoid duplication.
- Data hooks: the cleanest path is to keep one hook call but feed it a merged config (e.g. `{ ...config, sensorGrids: [...config.sensorGrids, ...mobileSensorGridsWithPrefixedIds] }`). No changes to the hooks themselves.
- Singleton widgets (weather, calendar, electricity, food menu, photo, pollen, notifications, chores, persons, temperature group) stay configured once globally. On mobile they appear via `mirror:` entries — which matches user intent ("don't just pull from main" applies to instance-style widgets; truly global ones like weather should not be duplicated).
- No backend changes — all persisted via the existing `/api/config` JSON file.

## Out of scope

- Per-widget mobile-only styling overrides (font sizes, colors). Current global/per-widget style maps continue to apply to mobile. Can be added later if needed.
- Independent themes per page.
