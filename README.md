# Phish Show Finder

Enter a date, see the Phish show played that day: venue, tour, setlist,
soundcheck and show notes, straight from the [Phish.net API](https://phish.net/api).

Live at <https://kmmccorm.github.io/phish-show-finder/>.

## Using it

Type a date in almost any form (`12/31/1995`, `12/31/95`, `Dec 31 1995`,
`1995-12-31`) or pick one from the calendar. The date is kept in the URL
(`?date=1995-12-31`), so any show can be bookmarked or shared.

Phish.net also tracks the band members' side projects. When more than one show
was played on a date, all of them are listed with Phish first.

## Running locally

Requires Node.js 20+ and a free [Phish.net API key](https://phish.net/api).

```sh
npm install
cp .env.example .env.local   # then put your key in .env.local
npm run dev                  # http://localhost:8080
```

| Command             | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Start the dev server                  |
| `npm test`          | Run the unit tests (Vitest)           |
| `npm run lint`      | Lint with ESLint                      |
| `npm run typecheck` | Type-check with TypeScript            |
| `npm run build`     | Production build into `dist/`         |

## How it works

```
src/
  pages/Index.tsx            page: date in the URL -> query -> show cards
  components/DateSelector    text box + calendar
  components/ShowDetails     one show's card
  services/
    date-utils.ts            parsing and formatting dates
    api-client.ts            HTTP + error mapping for api.phish.net/v5
    shows-api.ts             fetch the shows for a date
    show-processor.ts        one-row-per-song API rows -> Show objects
    setlist-utils.ts         grouping and ordering sets
    api-errors.ts            typed errors with user-facing messages
  lib/
    encoding.ts              repairs mis-encoded text from the API
    sanitize.ts              DOMPurify wrapper for the HTML show notes
```

The app is a static site: the browser calls Phish.net directly. That means the
API key is embedded in the published JavaScript and anyone can read it. Use a
key you're comfortable exposing, or put a small proxy in front of the API.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which lints, type-checks,
tests, builds and publishes to GitHub Pages. The build reads the API key from
the `VITE_PHISH_API_KEY` repository secret.

The site is served from `/phish-show-finder/`; if the repository is renamed or
moved to a custom domain, update `base` in `vite.config.ts` and the `og:image`
URL in `index.html`.

## Built with

Vite, React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query.
