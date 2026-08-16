# Repository Guidelines

## Project Structure & Module Organization

Jellysterr is a React 19/TypeScript frontend built with Vite. Entry points (`index.tsx`, `App.tsx`), compiled Tailwind styles (`index.css`), and shared types (`types.ts`) live at the root. Reusable UI belongs in `components/`; Jellyfin and TMDB requests belong in `services/`. Translation code and dictionaries are under `src/`, especially `src/locales/{en,fr}.json`. `Dockerfile`, `docker-compose.yml`, `nginx.conf`, and `entrypoint.sh` define production deployment. Do not commit `dist/`, `node_modules/`, `.env`, or `*.bak` files.

## Build, Test, and Development Commands

- `npm install` installs project dependencies.
- `npm run dev` starts Vite on port 3000 and listens on all interfaces.
- `npm test` runs the Vitest suite once.
- `npm run typecheck` validates TypeScript without emitting files.
- `npm run build` creates the production bundle in `dist/`.
- `npm run preview` serves the built bundle for a local production-style check.
- `npx tsc --noEmit` performs a standalone TypeScript check.
- `docker compose up -d --build` builds and runs the Nginx deployment at `http://localhost:3000`.

## Coding Style & Naming Conventions

Use TypeScript and functional React components. Follow two-space indentation, single quotes, and semicolons. Name components and interfaces in `PascalCase`, functions and variables in `camelCase`, and immutable configuration constants in `UPPER_SNAKE_CASE`. Prefer named exports and typed props. Keep API URL construction in `services/jellyfinService.ts`. Add every user-facing translation key to both locale files and access it through `t()`.

No formatter or linter is configured, so preserve nearby style.

## Testing Guidelines

Tests use Vitest; there is no coverage threshold. At minimum, run `npm test` and `npm run build`. Manually verify login, library loading, search/filter behavior, media details, responsive views, and relevant languages. Name tests `*.test.ts` or `*.test.tsx`.

## Commit & Pull Request Guidelines

History favors short, imperative subjects such as `Fix: jellyfin url is properly set and use`. Keep each commit focused; an optional `Fix:` or `Feature:` prefix is appropriate. Pull requests should explain the behavior change, list validation performed, link related issues, and include screenshots for visible UI changes. Call out configuration or deployment effects explicitly.

## Security & Configuration

Keep `TMDB_API_KEY`, Jellyfin credentials, and private server URLs out of source control. Use the ignored `.env` file for `JELLYFIN_URL`, `APP_LANGUAGE`, and `TMDB_API_KEY`; preserve the Nginx proxy so TMDB secrets are not exposed to browser code.
