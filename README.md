# scorecard
Scorecard

## KPI Dashboard

This repository includes a simple Next.js 14 application located in `kpi-dashboard/`. The app is written in TypeScript and styled with Tailwind CSS. It provides a personal KPI scorecard dashboard with the ability to manage multiple scorecards, update KPI values, and import/export data.

### Features
- Create, rename, and remove scorecards
- Add, edit, duplicate, and remove KPI tiles
- Input page to update values (with delta and trend updates)
- Drag-and-drop tile rearrangement using `@dnd-kit`
- LocalStorage persistence, light/dark mode, and data import/export (JSON/CSV)

To run the project locally you would normally install dependencies and start the dev server:

```bash
cd kpi-dashboard
npm install
npm run dev
```

However this container environment does not have internet access, so `npm install` cannot be executed here.
