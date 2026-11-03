# WiseOldMan Tile Tracking

**Status**: ✅ Complete
**Created**: November 2026
**Last Updated**: November 2026

## Purpose
A tile can be linked to one WiseOldMan metric (skill XP, boss kc or activity) with a target. Once the tile unlocks for a team, the team's total gain since that moment is shown on the tile, based on the competition data that is already fetched (one WOM request for everything, cached for 10 minutes). When the total reaches the target, the tile completes automatically and the team gets a Discord message, without a screenshot or admin approval.

## User Story
As an admin, I want to create tiles like "5M Woodcutting XP" or "50 Vorkath kc" that complete themselves from WOM data, so that teams don't have to prove XP/kc with screenshots.

## Implementation Overview

### Key Components
| Component | Path | Purpose |
|-----------|------|---------|
| Tile editor | `app/admin/page.js` | Metric dropdown (Skills / Bosses / Activities) + target |
| WOM tiles API | `app/api/wom-tiles/route.js` | Public `GET ?team=<team id>`: syncs WOM tiles with the competition cache, returns the team's rows |
| SpiralBoard | `components/SpiralBoard.jsx` | Green `%` badge on active WOM tiles |
| TileModal | `components/TileModal.jsx` | Progress bar, top 5 contributors, "since / updated" times |
| Team page | `app/team/[slug]/page.js` | Loads WOM progress on load and every 3 minutes (before progress, so auto-completed tiles show up) |

### Key Files
- `lib/womTiles.js`: `getUnlockedAt()` derives the unlock time, `computeTileValue()` subtracts the baseline, `syncWomTiles({ force })` creates/updates rows and auto-completes, `getWomTileProgress(teamId)` syncs and returns the team's rows.
- `lib/tileCompletion.js`: `saveProgress()` (upsert with `ignoreDuplicates`, returns whether the tile is newly completed), `postWebhook()`, `notifyRingUnlock()`. Shared with the approve route.
- `lib/wiseoldman.js`: `fetchPlayerGained(username, startDate, endDate)` for historical baselines.
- `lib/statsMetrics.js`: `metricUnit()` (`XP` / `kc` / empty).

### Dependencies
- **Internal**: Event Stats (`wom_cache`: per-player `gains` for every metric, competition start, player → team mapping), Discord team webhooks, ring progression
- **External**: WOM `GET /players/:name/gained` (only for historical baselines)

## Technical Details

### Data Flow
1. A team page calls `GET /api/wom-tiles?team=<id>` on load and every 3 minutes.
2. `syncWomTiles()` reads the competition cache via `getCompetitionStats()` (WOM is called at most every 10 minutes, one request for all participants and metrics).
3. For each team × WOM tile that is unlocked and not completed:
   - **New unlock / changed metric / changed unlock time**: a new baseline is stored: the team players' `gains[metric]` (since competition start) at the unlock moment. Ring 1 opens with the competition, so its baseline is empty.
   - **Unlocks older than 15 minutes** (rings that were already open, or a metric added to an open tile) take the baseline from WOM history instead: `GET /players/:name/gained?startDate=<competition start>&endDate=<unlocked_at>` per team player. Tiles of the same team and unlock moment share these requests; max 15 per sync, the rest waits for the next sync. If a player request fails, the tile waits too (a missing baseline would overcount).
   - `value = Σ max(0, gains_now − baseline)` over the team's players; the row is updated when the value or the WOM data changed.
   - `value >= wom_target`: `saveProgress()`, a Discord message and `notifyRingUnlock()` (only when newly completed). Then the sync runs again, so the tiles of a newly unlocked ring get their baseline right away.
4. When an approval completes a tile, the approve route runs `syncWomTiles({ force: true })`: fresh WOM data, so a newly unlocked ring gets an accurate baseline.

### Unlock time
Derived from `progress`, not stored at unlock:
- Ring 1: the competition `startsAt`.
- Ring N / center: the latest `completed_at` of the 3 tiles in ring N-1 (ring 5 for the center), per team and board.

That's why every progress upsert now uses `ignoreDuplicates: true`: an extra approval no longer moves `completed_at`, and with it the unlock time.

### Database Interaction
- **Tables Used**: `tiles` (`wom_metric`, `wom_target`), `tile_wom_progress`, `progress`, `teams`, `wom_cache`
- **Migration**: see [DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md#tile_wom_progress)

## API Endpoints
- `GET /api/wom-tiles?team=<team id>`: `{ tiles: [{ tile_id, metric, unlocked_at, value, contributors, fetched_at }] }`. Public, like `/api/stats`.

## Design Decisions

### Competition cache + baseline instead of per-tile WOM calls
- **Rationale**: The competition request already returns every participant and metric. A baseline per tile turns "since competition start" into "since unlock", so all tiles and teams cost one WOM request per 10 minutes (+1 per approval that completes a tile).
- **Trade-offs**: Recent unlocks use the cache at the moment the row is created (approvals force fresh data). Unlocks older than 15 minutes cost one request per team player once, for the historical baseline.
- **Alternatives**: WOM `groups/:id/gained` (the competition has no group), per-player `players/:name/gained` (one request per player).

### Unlock time derived from progress
- **Rationale**: Works for every unlock path and for rings that were already open, without a backfill.
- **Trade-offs**: Rows where `completed_at` was overwritten before the `ignoreDuplicates` fix have a later unlock time.

### Lazy sync
- **Rationale**: Vercel Hobby only allows daily cron jobs; the sync only reads our cache, so it's cheap to run on every team page request.
- **Trade-offs**: Tiles are only checked while someone has a team page open (or on an approval).

## Testing Considerations
- [x] `getUnlockedAt`: ring 1, incomplete previous ring, latest completion, other board, center, UTC parsing (scratch self-check)
- [x] `computeTileValue`: baseline subtraction, empty baseline (scratch self-check)
- [x] Team totals per metric from the real competition cache
- [x] Historical baseline for an already unlocked ring (real data: Fractured But Whole, easy ring 2)
- [ ] Changing a tile's metric refreshes it on the next request
- [ ] Reaching the target completes the tile, sends one Discord message and unlocks the next ring
- [ ] Resetting team progress resets `unlocked_at` and `value`

## Known Limitations
- WOM only knows gains once a player is updated (the RuneLite WOM plugin updates on logout). Gains made before the unlock but synced to WOM after it count towards the tile.
- WOM team names must be identical to the app team names.
- No checks while nobody has a team page open. A free external cron could call `/api/wom-tiles` every 10 minutes if needed.
- Only metrics in the competition request (`lib/statsMetrics.js`) can be used.
- One metric per tile.

## Related Features
- [Event Stats](./wom-ehb-stats.md): competition cache (source of all numbers), metric lists
- [Team Discord webhooks](./team-discord-webhooks.md): completion and ring unlock messages
