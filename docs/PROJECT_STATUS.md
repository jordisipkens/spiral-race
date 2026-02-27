# Project Status - Spiraal Race

Last updated: February 2026

## Current State: Production Ready

The application is fully functional and deployed on Vercel.

## Completed Features

### Core Functionality
- [x] Three spiral boards (Easy, Medium, Hard) - all available from start
- [x] 5 rings per board with 3 tiles per ring
- [x] Ring-based progression: complete all 3 tiles in a ring before next ring unlocks
- [x] Boards are independent (can be on different rings per board)
- [x] Center tile unlocking when all 15 outer tiles complete
- [x] Team-specific URLs with unique slugs

### Evidence Submission System
- [x] Image upload to Supabase Storage
- [x] Multiple submissions per tile allowed
- [x] Confirmation dialog when pending submission exists
- [x] Full-screen image viewer for teams
- [x] Submission history per tile

### Admin Panel
- [x] Password-protected authentication
- [x] Tile management (title, description, points)
- [x] Team management (create, delete)
- [x] Submission review queue
- [x] Approve/reject with optional reason
- [x] Full-screen image viewer for review
- [x] Multi-item tiles: configure tiles requiring multiple submissions
- [x] View related approved submissions when reviewing multi-item tiles
- [x] Reviewed submissions tab: view approved/rejected submission history

### Auto-refresh Features
- [x] Team pages: Auto-refresh every 3 minutes
- [x] Admin panel: Auto-refresh submissions every 1 minute
- [x] Silent refresh when TileModal opens

### Discord Integration
- [x] Global webhook notifications when new submissions are created
- [x] Configurable global webhook URL in admin Settings tab
- [x] Test webhook functionality
- [x] Per-team Discord webhooks for team channel notifications
- [x] Approval notification sent to team webhook when submission is approved
- [x] Ring unlock notification sent to team webhook when a ring is completed

### Visual Indicators
- [x] Pending submissions show yellow border + clock icon
- [x] Locked tiles at 25% opacity showing tile titles (ring not yet available)
- [x] Active tiles with gold glow border
- [x] Completed tiles at 40% opacity

### Admin Settings
- [x] Global Discord webhook URL configurable
- [x] Show/hide locked tiles toggle — when OFF, locked tiles are completely hidden; when ON, tiles show their actual titles (no lock icon)

### User Experience
- [x] Rules modal popup with game explanation (English)
- [x] "Active Tasks" panel showing current ring tasks
- [x] Progress indicator per path

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage |
| Hosting | Vercel |
| Styling | Inline CSS-in-JS |

## File Overview

### Pages
| File | Purpose |
|------|---------|
| `app/page.js` | Homepage (demo board) |
| `app/team/[slug]/page.js` | Team board view with submissions |
| `app/admin/page.js` | Admin panel for tiles, teams, submissions |

### Components
| File | Purpose |
|------|---------|
| `components/SpiralBoard.jsx` | Main spiral visualization with SVG |
| `components/TileModal.jsx` | Tile details and evidence upload |
| `components/BoardTabs.jsx` | Easy/Medium/Hard tab navigation |
| `components/SubmissionCard.jsx` | Submission display for admin |
| `components/RulesModal.jsx` | Game rules popup |

### API Routes
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/submissions/upload` | POST | Upload image to storage |
| `/api/submissions` | GET, POST | List/create submissions (sends Discord notification) |
| `/api/admin/submissions` | GET, PATCH | Review submissions |
| `/api/admin/auth` | POST | Verify admin password |
| `/api/admin/settings` | GET, PATCH | Manage app settings (Discord webhook) |

### Libraries
| File | Purpose |
|------|---------|
| `lib/supabase.js` | Supabase client initialization |

## Environment Variables

Required in `.env.local` and Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ADMIN_PASSWORD=your-password
```

## Database Tables

1. **teams** - Team names and slugs
2. **tiles** - Challenge configuration per position
3. **progress** - Completed tiles per team
4. **submissions** - Evidence uploads with status
5. **settings** - App configuration (Discord webhook URL)

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for full details.

## Key Design Decisions

### Why ring-based progression?
All 3 tiles in a ring must be completed before the next ring unlocks. This ensures teams work together on all paths rather than focusing on just one.

### Why all boards available from start?
Teams can work on Easy, Medium, and Hard simultaneously, allowing better task distribution among team members.

### Why evidence-based completion?
Instead of teams self-reporting completions, they upload screenshot proof. This ensures fairness and allows admins to verify achievements.

### Why multiple submissions per tile?
Teams can submit multiple images for a tile. If one is rejected, they can resubmit. One approved submission completes the tile.

### Why auto-refresh instead of real-time?
Polling is simpler to implement and sufficient for the use case. Team pages refresh every 3 minutes, admin panel every 1 minute.

### Why inline styles?
Keeps component code self-contained and makes it easy to copy/modify without managing separate CSS files.

## Future Enhancements (Not Implemented)

- [ ] Real-time updates with Supabase subscriptions
- [ ] Leaderboard page showing all team scores
- [x] ~~Discord webhook notifications~~ (Completed February 2026)
- [ ] OCR validation for OSRS screenshots
- [ ] Export results to Excel/CSV
- [ ] Team authentication (currently teams access via slug URL)
- [x] ~~Required submissions count per tile~~ (Completed February 2026)

## Known Limitations

1. **No team auth**: Anyone with the team URL can submit evidence
2. **Manual refresh**: Teams need to wait for auto-refresh or refresh manually
3. **Single admin password**: All admins share one password
4. **No image compression**: Large uploads may be slow

## Deployment

1. Push to GitHub
2. Vercel auto-deploys from main branch
3. Environment variables must be set in Vercel dashboard
4. Supabase Storage bucket `proof-images` must exist and be public
