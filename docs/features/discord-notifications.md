# Discord Notifications

**Status**: Completed
**Created**: February 2026
**Last Updated**: February 2026

## Purpose

Sends Discord notifications when teams submit evidence for review, allowing admins to be notified immediately without checking the admin panel.

## User Story

As an admin, I want to receive Discord notifications when a team submits evidence, so that I can review submissions promptly without constantly checking the admin panel.

## Implementation Overview

### Key Components

| Component | Path | Purpose |
|-----------|------|---------|
| Settings API | `app/api/admin/settings/route.js` | CRUD for app settings |
| Submissions API | `app/api/submissions/route.js` | Sends Discord notification on new submission |
| Admin Page | `app/admin/page.js` | Settings tab for webhook configuration |

### Key Files

- `app/api/admin/settings/route.js`: GET/PATCH endpoints for settings management
- `app/api/submissions/route.js`: POST handler extended with Discord notification logic
- `app/admin/page.js`: Added Settings section with webhook URL input, save, and test buttons

### Dependencies

- **Internal**: Admin authentication system (cookie-based)
- **External**: Discord Webhook API

## Technical Details

### Data Flow

1. Admin configures webhook URL in Settings tab
2. URL is saved to `settings` table with key `discord_webhook_url`
3. When team submits evidence, POST `/api/submissions` is called
4. After successful insert, API fetches team name, tile details, and webhook URL
5. If webhook URL exists, sends Discord message (fire-and-forget)
6. Submission succeeds regardless of webhook result

### State Management

Admin page state:
- `webhookUrl`: Current webhook URL input value
- `savingSettings`: Loading state during save
- `testingWebhook`: Loading state during test

### Database Interaction

- **Tables Used**: settings
- **Key Queries**:
  ```sql
  -- Get webhook URL
  SELECT value FROM settings WHERE key = 'discord_webhook_url';

  -- Save webhook URL
  INSERT INTO settings (key, value, updated_at)
  VALUES ('discord_webhook_url', 'https://...', NOW())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
  ```

## API Endpoints

- `GET /api/admin/settings` - Fetch all settings as key-value object
- `PATCH /api/admin/settings` - Update a setting by key

## Design Decisions

### Database storage vs Environment Variable

- **Rationale**: Database storage allows admins to configure webhook without redeploying
- **Trade-offs**: Slightly more complex, requires database migration
- **Alternatives**: Environment variable (simpler but requires redeploy to change)

### Fire-and-forget webhook calls

- **Rationale**: Webhook failure should not break submission creation
- **Trade-offs**: No guarantee of delivery, no retry mechanism
- **Alternatives**: Queue-based system with retries (over-engineering for this use case)

### Settings tab vs inline configuration

- **Rationale**: Dedicated tab provides clean separation for future settings
- **Trade-offs**: Extra navigation step
- **Alternatives**: Inline toggle in Submissions section

## Usage Example

1. Go to Admin Panel → Settings tab
2. Enter Discord webhook URL: `https://discord.com/api/webhooks/123/abc`
3. Click "Test" to verify connection
4. Click "Save" to enable notifications

## Testing Considerations

- [x] Webhook URL saves correctly to database
- [x] Test button sends message to Discord
- [x] Submissions trigger Discord notification
- [x] Empty webhook URL disables notifications
- [x] Failed webhook does not break submission

## Known Limitations

- No retry mechanism for failed webhooks
- Single webhook URL (no multiple channels)
- Plain text message format (no rich embeds)

## Future Improvements

- [ ] Multiple webhook URLs for different channels
- [ ] Customizable message format
- [ ] Rich embed format with thumbnail
- [ ] Notification toggle per event type (new submission, approved, rejected)

## Related Features

- Admin Panel: Webhook configuration UI
- Submissions System: Trigger point for notifications
