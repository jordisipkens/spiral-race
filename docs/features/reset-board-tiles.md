# Reset Board Tiles

**Status**: ✅ Complete
**Created**: October 2026
**Last Updated**: October 2026

## Purpose
Lets the admin wipe a single board (Easy, Medium or Hard) and start over with fresh default tiles. Useful when preparing a new event, where the previous tile content, submissions, screenshots and team progress on that board should not carry over.

## User Story
As an admin, I want to reset all tiles of a board in one click so that I can set up a new event without deleting 16 tiles by hand.

## Implementation Overview

### Key Components
| Component | Path | Purpose |
|-----------|------|---------|
| Admin Panel | `app/admin/page.js` | "Reset all [board] tiles" button next to "Generate"; `resetTilesForBoard()` calls the API |
| Reset API | `app/api/admin/tiles/reset/route.js` | Server-side reset with the service role key (needed for storage deletes) |
| Tile defaults | `lib/tiles.js` | `buildMissingTiles()`, shared by the admin panel and the reset API |

### Key Functions
- `buildMissingTiles(board, existingTiles)` (`lib/tiles.js`): builds default tile rows (15 ring tiles + center) for positions not in `existingTiles`.
- `generateTilesForBoard(board)` (admin page): unchanged behaviour, uses `buildMissingTiles(board, tiles)`.
- `resetTilesForBoard(board)` (admin page): confirm → `POST /api/admin/tiles/reset` → show result → reload tiles and submissions.

### Dependencies
- **Internal**: Tile generation (admin panel), `progress` and `submissions` tables
- **External**: `@supabase/supabase-js`

## Technical Details

### Data Flow
1. Admin opens a board tab in the Tiles section and clicks **Reset all [board] tiles**.
2. A confirmation dialog explains that submissions, screenshots and team progress on that board are deleted permanently.
3. The API collects the `image_url` of every submission on that board (paged per 1000 rows) and converts them to storage paths (`{team_id}/{tile_id}/{timestamp}.ext`).
4. `DELETE FROM tiles WHERE board = :board`. Rows in `progress` and `submissions` for those tiles are removed by `ON DELETE CASCADE`.
5. 16 default tiles are inserted (same defaults as "Generate").
6. The screenshots are removed from the `proof-images` bucket in batches of 100.
7. The admin panel shows how many submissions and screenshots were deleted, and reloads tiles and submissions.

### Database Interaction
- **Tables Used**: `tiles` (directly), `progress` and `submissions` (via cascade)
- **Key Queries**:
  ```sql
  DELETE FROM tiles WHERE board = 'easy';
  -- followed by an insert of the 16 default tiles
  ```

## API Endpoints
- `POST /api/admin/tiles/reset` - Body `{ board: 'easy' | 'medium' | 'hard' }`. Requires the `admin_token` cookie. Returns `{ success, submissionsDeleted, imagesDeleted, imagesFailed }`.

## Design Decisions

### Server-side API route instead of the browser Supabase client
- **Rationale**: Deleting files from storage requires the service role key, which must never reach the browser.
- **Trade-offs**: One more API route; generate/edit tiles still use the browser client.

### Screenshots deleted last
- **Rationale**: If a storage delete fails, only orphaned files remain; the database is already consistent. Deleting screenshots first could leave submissions pointing at missing images.
- **Trade-offs**: Failed deletes need manual cleanup in Supabase Storage; the admin sees how many failed.

### Delete + regenerate instead of resetting content in place
- **Rationale**: The admin wants a clean board for a new event, including removal of old submissions and progress.
- **Trade-offs**: Destructive and irreversible; tile IDs change. Mitigated with an explicit confirmation dialog.
- **Alternatives**: Overwriting title/description/points in place (keeps submissions and progress), rejected because old progress would carry over.

### Per board instead of all boards at once
- **Rationale**: Matches the existing per-board "Generate" button and limits the blast radius of a mis-click.

## Testing Considerations
- [ ] Reset one board: other boards' tiles, submissions and progress stay intact
- [ ] After reset: 16 tiles with default titles/points, no multi-item settings
- [ ] Submissions and progress for the reset board are gone
- [ ] Screenshots of the reset board are gone from `proof-images`; screenshots of other boards remain
- [ ] API returns 401 without admin cookie and 400 for an unknown board (verified)
- [ ] Cancel in the confirm dialog does nothing

## Known Limitations
- Not atomic: if the insert fails after the delete, the board is empty. The error message tells the admin to click "Generate" to recover.
- Screenshots that fail to delete stay in storage as orphaned files; the admin message shows the count.
- Screenshots in storage without a matching submission row (e.g. upload succeeded but the submission insert failed) are not found and therefore not deleted.

## Related Features
- Multi-item tiles: settings are reset to defaults (single item)
- Team progress reset (Teams section): resets progress per team instead of per board
