# Event Stats (WiseOldMan)

**Status**: ✅ Complete
**Created**: October 2026
**Last Updated**: October 2026

## Purpose
A public `/stats` page with three tabs: **EHB** (bar chart and table with the EHB, Efficient Hours Bossed, every participant gained during the event), **Bosses** (kills per team for every boss with at least 1 kill) and **Activities** (clue scrolls, GotR, Colosseum Glory, Collection Log per team). The data comes from a WiseOldMan (WOM) competition and is cached in our database, so WOM is called at most once every 15 minutes.

## User Story
As a participant, I want to see how much EHB, boss kills and activities every player and team has gained during the event, so that I can compare progress across all players or within my own team.

## Implementation Overview

### Key Components
| Component | Path | Purpose |
|-----------|------|---------|
| Stats page | `app/stats/page.js` | View tabs (EHB / Bosses / Activities), team filter ("All players" + one button per WOM team) |
| TeamMetricTable | `components/TeamMetricTable.jsx` | Metrics as rows, teams as columns, 👑 for the best team, click a row for the top 5 players |
| EhbBarChart | `components/EhbBarChart.jsx` | Horizontal CSS bar chart (`items: [{ label, value, sublabel? }]`), exports `formatEhb()` |
| EhbTable | `components/EhbTable.jsx` | Player table: rank, player (links to WOM), team, start, end, gained, last updated |
| Stats API | `app/api/stats/route.js` | Public GET, returns cached stats (lazy refresh) |
| Refresh API | `app/api/admin/stats/refresh/route.js` | Admin POST, forces a fetch from WOM |
| Admin settings | `app/admin/page.js` | "WiseOldMan Competition" block: competition ID, Save, Refresh now |

### Key Files
- `lib/wiseoldman.js`: `fetchCompetition(competitionId)` calls `GET /v2/competitions/:id` with `ehb` plus every boss and activity as `metrics` params (82 metrics, one request). It normalizes the result into `{ competition, teams, players }`. Each player has EHB `start`/`end`/`gained` and a `gains` object with only the non-zero boss/activity gains, which keeps the cache small (about 18 KB for 69 players instead of 0.7 MB raw). Players are sorted by EHB gained and teams by total EHB. WOM's `-1` (unranked) becomes `null`.
- `lib/statsMetrics.js`: `BOSS_METRICS` (71) and `ACTIVITY_METRICS` (10), `metricName()` for display names, and `buildMetricRows(players, metrics)`, which builds per-metric rows with team totals and top players and leaves out rows with 0.
- `lib/womStats.js`: `getCompetitionStats({ metric, force })` handles the database cache (`wom_cache`) and the refresh lock. `CACHE_TTL_MINUTES = 15`.

### Dependencies
- **Internal**: `settings` table (`wom_competition_id`), admin auth cookie
- **External**: WiseOldMan API v2, `@supabase/supabase-js`

## Technical Details

### Data Flow
1. The admin enters the WOM competition ID in Settings. On Save it is stored as `settings.wom_competition_id` and the cache is filled right away via `POST /api/admin/stats/refresh`.
2. `/stats` calls `GET /api/stats` on load and every 3 minutes.
3. The route reads the `wom_cache` row for `(competition_id, 'all')`:
   - **Fresh** (< 15 min): it is returned directly.
   - **Missing**: the route fetches from WOM, upserts the row and returns it.
   - **Stale**: the route "claims" the refresh with a conditional update (`fetched_at = now() WHERE fetched_at < threshold`). Only the request whose update matched a row calls WOM; concurrent requests get the existing cache.
4. If WOM fails while a cache exists, the old data is returned with `stale: true` and `fetched_at` is set so that a retry happens after about 1 minute. Without any cache, the route returns `502`.

### Next.js fetch cache
The Supabase client in `lib/womStats.js` passes `cache: 'no-store'` to every fetch. Without it, Next.js 14 stores Supabase responses in its fetch cache (the Vercel Data Cache, which survives deployments), even with `dynamic = 'force-dynamic'`. An empty `wom_competition_id` result then stayed cached and the API kept returning "No competition configured".

### State Management
Local React state on the stats page. The selected team is preselected from `?team=<name>`; the team pages link there with their own name. If the name is not a WOM team, the page falls back to "All players".

### Database Interaction
- **Tables Used**: `settings`, `wom_cache` (see [DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md))
- **Migration** (run once in the Supabase SQL Editor):
  ```sql
  CREATE TABLE wom_cache (
    competition_id INTEGER NOT NULL,
    metric TEXT NOT NULL DEFAULT 'all',
    data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (competition_id, metric)
  );

  -- Only accessed server-side with the service role key
  ALTER TABLE wom_cache ENABLE ROW LEVEL SECURITY;
  ```

## API Endpoints
- `GET /api/stats`: cached stats `{ competition, teams, players, fetchedAt, stale }`. Returns `404` if no competition is configured, `400` if the ID is not a number, and `502` if WOM fails and nothing is cached.
- `POST /api/admin/stats/refresh`: admin only; bypasses the TTL and fetches from WOM.

## Design Decisions

### Database cache with lazy refresh instead of a cron job
- **Rationale**: Visitors always read from our database, so the load on WOM does not depend on the number of visitors. The rate limit is about 20 requests/min without an API key. Vercel Hobby only allows cron jobs once per day, so a 15-minute cron is not possible there. Lazy refresh also never calls WOM when nobody is looking.
- **Trade-offs**: The first visitor after the TTL waits for one WOM call (about 1 s).
- **Alternatives**: Vercel Cron (plan limits), Next.js fetch cache only (per serverless instance, not shared).

### Team filter based on WOM `teamName`
- **Rationale**: WOM team competitions already group players by team. We don't need a mapping table between players and app teams.
- **Trade-offs**: The deep link from a team page only works if the team names in WOM and in the app are identical.

### Own CSS bar chart instead of a chart library
- **Rationale**: No new dependency, and it matches the inline-style approach of the rest of the app.

### All metrics in one request
- **Rationale**: WOM returns deltas for every metric passed in `metrics`, so EHB, bosses and activities cost a single request per 15 minutes. The `metric` column in `wom_cache` holds the dataset key (`'all'`), so a different dataset could be added later without a schema change.
- **Trade-offs**: The boss list is hardcoded in `lib/statsMetrics.js`; new WOM bosses must be added there.

### Activities selection
- **Decision**: Only counter-based activities. LMS, PvP Arena and Bounty Hunter are ratings, not counts, and Soul Wars zeal was not wanted.

## Usage Example
```js
import { getCompetitionStats } from '../lib/womStats'

import { buildMetricRows, BOSS_METRICS } from '../lib/statsMetrics'

const stats = await getCompetitionStats()
// stats.teams   -> [{ name, totalGained, playerCount }]   (EHB)
// stats.players -> [{ username, displayName, teamName, start, end, gained, gains: { vorkath: 12 }, updatedAt }]
const bossRows = buildMetricRows(stats.players, BOSS_METRICS)
// -> [{ metric, label, total, totals: { [teamName]: n }, topPlayers }]
```

## Testing Considerations
- [ ] Two calls within 15 minutes return the same `fetchedAt` (no WOM call)
- [ ] Setting `fetched_at` back 20 minutes in Supabase triggers a new fetch
- [ ] Invalid competition ID with an existing cache returns `stale: true`
- [ ] Non-team competition: no team filter buttons, only the full list
- [ ] `?team=` with an unknown name falls back to "All players"

## Known Limitations
- WOM only counts gains after a player has been updated on WOM. The table shows "Last updated" per player.
- New bosses on WOM are not shown until they are added to `BOSS_METRICS`.

## Future Improvements
- [ ] "Update all participants" button (WOM `POST /competitions/:id/update-all`, needs the verification code)
- [ ] Additional metrics (EHP, XP) as extra tabs
- [ ] Team colours in the charts
- [ ] Optional `WOM_API_KEY` for a higher rate limit (already supported in `lib/wiseoldman.js`)

## Related Features
- Admin Settings: the competition ID is stored next to the Discord webhook and the locked-tiles setting.
- Team pages: link to `/stats?team=<team name>`.
