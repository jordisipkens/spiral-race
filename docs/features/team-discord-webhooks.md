# Team Discord Webhooks

**Status**: Complete
**Created**: February 2026
**Last Updated**: February 2026

## Purpose
Per-team Discord webhooks send notifications to team-specific Discord channels when submissions are approved and when rings are unlocked.

## User Story
As a team member, I want to receive Discord notifications in my team's channel when our submissions are approved or when we unlock a new ring, so that I can track our progress.

## Implementation Overview

### Key Components
| Component | Path | Purpose |
|-----------|------|---------|
| Admin Panel | `app/admin/page.js` | Webhook URL input per team in edit mode |
| Submissions API | `app/api/admin/submissions/route.js` | Sends notifications on approval + ring unlock |

### Database Changes
- Added `discord_webhook_url TEXT` column to `teams` table

### Notification Types

**Submission Approved (single-item tile)**:
```
✅ Submission approved for tile **[title]** ([board])! Tile completed!
```

**Submission Approved (multi-item, not yet complete)**:
```
✅ Submission approved for tile **[title]** ([board])! Progress: X/Y items completed.
```

**Submission Approved (multi-item, now complete)**:
```
✅ Submission approved for tile **[title]** ([board])! All Y items completed - tile done!
```

**Ring Unlocked**:
```
🔓 Ring X completed on the **[board]** board! Ring X+1 is now available.
```

**All Rings Complete**:
```
🏆 All rings completed on the **[board]** board! The center tile is now unlocked!
```

## Technical Details

### Data Flow
1. Admin approves submission in admin panel
2. API updates submission status and creates progress record
3. API fetches team's `discord_webhook_url`
4. If webhook configured, sends approval notification (fire and forget)
5. If progress was created, checks if all 3 paths in the ring are complete
6. If ring complete, sends ring unlock notification

### Ring Unlock Detection
- After creating a progress record, query all progress for the team on the same board
- Filter to non-center tiles on the same ring as the approved tile
- Check if all 3 paths (0, 1, 2) have progress entries for that ring
- If yes, the ring was just unlocked by this approval

## Design Decisions

### Why per-team instead of extending global webhook?
- Teams want notifications in their own Discord channels
- Global webhook serves a different purpose (admin notification for new submissions)
- Both can coexist without conflict

### Why fire-and-forget for webhook calls?
- Webhook failure should not block the approval process
- Errors are logged but don't affect the response

## Related Features
- [Discord Notifications](discord-notifications.md): Global webhook for new submissions
- [Multi-Item Tiles](multi-item-tiles.md): Progress messages for multi-item tiles
