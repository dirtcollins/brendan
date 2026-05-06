# Fence & Gate Builder Project Map

Use this file as the stable starting point before changing the app. Keep changes feature-sized and update this map when ownership changes.

## Runtime

- `index.html` loads React, ReactDOM, Supabase, Babel, then the app scripts in order.
- `server.mjs` serves the static app on `http://localhost:4173/`.
- `src/main.jsx` mounts `<App />`.
- `src/supabase-config.js` defines the Supabase project URL and publishable key.

## Source Files

- `src/app-core.jsx`
  - Shared constants and defaults.
  - Measurement parsing and formatting.
  - Gate and fence calculations.
  - Validation messages.
  - Material and cut-list row generation.
  - CSV/PDF export helpers.
  - Supabase auth/project hooks.
  - Auth screens.

- `src/builder-app.jsx`
  - `App` and `BuilderApp`.
  - Main shell, top bar, mode switch, saved builds, feature request routing.
  - Gate input panel: `Controls`.
  - Fence input panel: `FenceControls`.
  - Measurement input component: `NumberField`.
  - Shared navigation and summary components.

- `src/preview.jsx`
  - Gate live preview: `Drawing`.
  - Fence live preview: `FenceDrawing`.
  - Preview pan/zoom and view modes.
  - SVG drawing components for 2D, 3D, top-down, and plans views.
  - Dimension labels, gate leaf rendering, fence section rendering, and draggable fence gate openings.

- `src/results-panels.jsx`
  - Materials panels.
  - Purchase panels.
  - Cut list panel.
  - Settings panel.
  - Saved builds panel.
  - Feature request panel.
  - Build notes panels.

- `src/styles.css`
  - Global app styling.
  - Form/input styling.
  - Live preview styling.
  - Result panel styling.
  - Final responsive production layout overrides start near the comment:
    `Production responsive redesign overrides`.

## Work Rules

1. Change one feature at a time.
2. Start with the file that owns the behavior, not the largest file.
3. Keep calculation changes separate from preview/layout changes.
4. After each feature, run the local server and smoke test `http://localhost:4173/`.
5. Commit or checkpoint after each verified feature.

## Common Feature Paths

- Gate dimensions or picket math: `src/app-core.jsx`, then `src/builder-app.jsx` if inputs need changing, then `src/preview.jsx` if drawing labels need changing.
- Fence section math or gate placement: `src/app-core.jsx`, then `src/builder-app.jsx`, then `src/preview.jsx`.
- Live preview behavior: `src/preview.jsx` and relevant `.stage`, `.drawing-scroll`, `.preview-*` CSS in `src/styles.css`.
- Measurement entry/formatting: `src/app-core.jsx` for parsers/formatters and `src/builder-app.jsx` for `NumberField`.
- Materials, purchase, cut list, notes: `src/app-core.jsx` for row data and `src/results-panels.jsx` for display.
- Layout issues: `src/styles.css`, especially the final responsive override block.
