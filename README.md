# Scorecard KPI Dashboard

A personal KPI dashboard built with Next.js 14, TypeScript, Tailwind CSS, and [Flowbite](https://flowbite.com/). The application lets you track multiple scorecards, update key metrics, and persist data locally so you always have a quick snapshot of your performance.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Application Concepts](#application-concepts)
- [Import and Export](#import-and-export)
- [Styling](#styling)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)
- [Security & Privacy](#security--privacy)

## Features
- Manage any number of scorecards, each with configurable column counts for desktop layouts.
- Add, edit, duplicate, reorder (drag-and-drop), and remove KPI tiles.
- Dedicated edit mode with Flowbite modals for creating tiles and updating settings.
- Track metric history with sparklines, delta values, trend indicators, and last-updated timestamps.
- Choose value formatting options such as precision, units, and unit placement (left/right).
- Rename scorecards directly from the home page and delete them from the edit view.
- Import and export all scorecard data, including CSV import support.
- Persist scorecards locally using `localStorage`, and toggle between light/dark themes.

## Tech Stack
- [Next.js 14](https://nextjs.org/) with the App Router.
- [React 18](https://react.dev/) and TypeScript for type-safe UI components.
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling.
- [Flowbite](https://flowbite.com/docs/getting-started/introduction/) UI components.
- [@dnd-kit](https://docs.dndkit.com/) for accessible drag-and-drop interactions.

## Getting Started
1. **Prerequisites**
   - Node.js 18 or later.
   - npm 9 or later (ships with Node 18).
2. **Installation**
   ```bash
   npm install
   ```
3. **Start the development server**
   ```bash
   npm run dev
   ```
   The app is served at `http://localhost:3000` by default.

> **Note:** The provided container environment does not permit outbound network access, so `npm install` cannot be executed within the container itself. Run the commands locally instead.

## Available Scripts
| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start the development server with hot reloading. |
| `npm run build` | Create an optimized production build. |
| `npm start` | Launch the production server after running `npm run build`. |
| `npm run lint` | Run Next.js ESLint checks. |

## Project Structure
```
app/
  components/        # Reusable UI components
  globals.css        # Tailwind base styles and design tokens
  scorecards/        # App routes for scorecard CRUD, input, and add flows
next.config.js       # Next.js configuration
package.json         # Scripts and dependencies
tailwind.config.js   # Tailwind configuration
```

## Application Concepts
- **Scorecard** — A collection of KPI tiles. Each scorecard records its name, layout column count, and a unique identifier generated with `nanoid`.
- **Tile** — Represents a single KPI and stores the current value, previous value, historical series, timestamp, formatting preferences, and trend direction metadata.
- The `ScorecardsProvider` component supplies a React context that loads persisted scorecards from `localStorage` on mount and syncs changes back to the same key, keeping the UI stateful across sessions.

## Import and Export
- Export the current scorecards to JSON from the UI for backups or sharing.
- Import CSV data where each row maps to a KPI tile. Example format:
  ```csv
  "Scorecard","Title","Value","Previous","Timestamp","Units","Side"
  "My Scorecard","Revenue","100","90","2024-01-01T00:00:00Z","$","left"
  ```
- When importing CSV, ensure timestamps are ISO-8601 strings (`YYYY-MM-DDTHH:mm:ssZ`), and numeric values omit thousands separators.

## Styling
- The global font is [Share Tech Mono](https://fonts.google.com/specimen/Share+Tech+Mono) for a distinctive dashboard aesthetic.
- Tailwind CSS utilities handle layout, spacing, and color schemes, while Flowbite provides accessible UI primitives (modals, buttons, inputs).

## Deployment
1. Build the production bundle:
   ```bash
   npm run build
   ```
2. Start the production server:
   ```bash
   npm start
   ```
3. Deploy the `.next` output to your hosting platform of choice (Vercel, containerized environments, etc.).

## Contributing
1. Fork and clone the repository.
2. Create a feature branch from `main`.
3. Install dependencies and make your changes.
4. Run `npm run lint` and any relevant tests.
5. Commit, push, and open a pull request describing your changes.

## License
This project is released under the MIT License. See [`LICENSE.md`](./LICENSE.md) for full details.

## Security & Privacy
- The application does **not** bundle API keys, secrets, or credentials. Data is stored entirely in the browser via `localStorage` under the `kpi-scorecards` key.
- Review contributions to ensure sensitive information (API keys, personal data, secrets) is never committed to the repository.
