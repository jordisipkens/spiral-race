# Multi-Item Tiles

**Status**: Complete
**Created**: February 2026
**Last Updated**: February 2026

## Purpose
Allows tiles to require multiple approved submissions before being marked as complete. Useful for challenges with sub-items (e.g., "Kill 4 different bosses" requiring 4 separate proof screenshots).

## User Story
As an admin, I want to configure tiles that require multiple submissions so that teams must provide proof for each sub-item of a challenge.

## Implementation Overview

### Key Components
| Component | Path | Purpose |
|-----------|------|---------|
| Admin Page | `app/admin/page.js` | Tile editing with multi-item configuration |
| Submissions API | `app/api/admin/submissions/route.js` | Approval logic with submission counting |
| SubmissionCard | `components/SubmissionCard.jsx` | Display related approved submissions |
| TileModal | `components/TileModal.jsx` | Team-facing progress indicator |

### Key Files
- `app/admin/page.js`: Multi-item checkbox and required submissions input in tile editing, related submissions fetching
- `app/api/admin/submissions/route.js`: Modified approval logic to only create progress when requirement met
- `components/SubmissionCard.jsx`: Shows previously approved submissions for multi-item tiles
- `components/TileModal.jsx`: Progress bar showing X/Y approved submissions

### Dependencies
- **Internal**: Existing tiles, submissions, and progress systems
- **External**: None

## Technical Details

### Data Flow
1. Admin enables multi-item on a tile and sets required submission count
2. Team submits evidence (multiple times as needed)
3. Admin approves each submission individually
4. API counts approved submissions for that team+tile combination
5. Progress record only created when count >= required_submissions
6. Team sees progress bar in TileModal

### Database Changes
Two new columns added to `tiles` table:
```sql
ALTER TABLE tiles ADD COLUMN is_multi_item BOOLEAN DEFAULT FALSE;
ALTER TABLE tiles ADD COLUMN required_submissions INTEGER DEFAULT 1;
ALTER TABLE tiles ADD CONSTRAINT check_required_submissions CHECK (required_submissions >= 1);
```

### State Management
- Admin page: `relatedSubmissions` state object keyed by `{teamId}_{tileId}`
- SubmissionCard: Receives `relatedApprovedSubmissions` prop
- TileModal: Calculates approved count from filtered submissions

## API Changes

### GET /api/admin/submissions
Now includes `is_multi_item` and `required_submissions` in tiles join.

### PATCH /api/admin/submissions
Extended approval response:
```javascript
{
  success: true,
  submission: {...},
  approvedCount: 2,
  requiredCount: 4,
  progressCreated: false
}
```

## Design Decisions

### Separate Boolean Flag
- **Rationale**: Using `is_multi_item` flag in addition to `required_submissions` makes conditional logic cleaner
- **Trade-offs**: Slight redundancy (could just check if required_submissions > 1)
- **Alternatives**: Only use required_submissions field

### Edge Case: Lowering Required Submissions
- **Decision**: Automatically check if tiles should now be complete
- **Rationale**: Better UX - admin doesn't need to manually trigger completion

### Edge Case: Raising Required Submissions
- **Decision**: Leave existing progress intact
- **Rationale**: Less disruptive; completed work stays completed

## Usage Example

### Admin Configuration
1. Go to Admin Panel > Tiles
2. Click "Edit" on a tile
3. Check "Multi-Item Tile (requires multiple submissions)"
4. Set "Required submissions" (e.g., 4)
5. Click Save

### Team Workflow
1. Open tile to see "Multi-Item Tile" badge with progress bar
2. Submit first screenshot - gets approved - shows "1/4 approved"
3. Submit more screenshots until requirement met
4. Tile marked complete when all required submissions approved

## Testing Considerations
- [ ] Create multi-item tile with 3 required submissions
- [ ] Verify first 2 approvals don't complete tile
- [ ] Verify 3rd approval completes tile
- [ ] Verify admin sees related submissions when reviewing
- [ ] Verify team sees progress bar in TileModal
- [ ] Test lowering required_submissions triggers completion check

## Known Limitations
1. All submissions must be for the same team (no shared completions)
2. No way to specify which sub-items are required (just a count)
3. Approved submissions cannot be individually removed

## Future Improvements
- [ ] Named sub-items (e.g., "Boss 1", "Boss 2") instead of just count
- [ ] Admin ability to revoke specific approvals
- [ ] Show which sub-items are still needed in team view

## Related Features
- [Discord Notifications](discord-notifications.md): Notifies admin of each new submission
