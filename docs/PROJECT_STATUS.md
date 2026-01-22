# Project Status - Spiraal Race

Last updated: January 2025

## Current State: Production Ready

The application is fully functional and deployed on Vercel.

## Completed Features

### Core Functionality
- [x] Three spiral boards (Easy, Medium, Hard)
- [x] 5 rings per board with 3 parallel paths
- [x] Progressive board unlocking system
- [x] Center tile unlocking when all paths complete
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

### Auto-refresh Features
- [x] Team pages: Auto-refresh every 3 minutes
- [x] Admin panel: Auto-refresh submissions every 1 minute
- [x] Silent refresh when TileModal opens

### Visual Indicators
- [x] Pending submissions show yellow border + clock icon
- [x] Locked tiles at 25% opacity
- [x] Active tiles with gold glow border
- [x] Completed tiles at 40% opacity

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
| `app/page.js` | Homepage |
| `app/team/[slug]/page.js` | Team board view |
| `app/admin/page.js` | Admin panel |

### Components
| File | Purpose |
|------|---------|
| `components/SpiralBoard.jsx` | Main spiral visualization with SVG |
| `components/TileModal.jsx` | Tile details and evidence upload |
| `components/BoardTabs.jsx` | Easy/Medium/Hard tab navigation |
| `components/SubmissionCard.jsx` | Submission display for admin |

### API Routes
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/submissions/upload` | POST | Upload image to storage |
| `/api/submissions` | GET, POST | List/create submissions |
| `/api/admin/submissions` | GET, PATCH | Review submissions |
| `/api/admin/auth` | POST | Verify admin password |

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

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for full details.

## Key Design Decisions

### Why evidence-based completion?
Instead of teams self-reporting completions, they upload screenshot proof. This ensures fairness and allows admins to verify achievements.

### Why multiple submissions per tile?
Some tiles may require multiple proofs (e.g., "Kill boss 3 times"). Teams can submit multiple images, and if one is rejected, they can resubmit.

### Why auto-refresh instead of real-time?
Polling is simpler to implement and sufficient for the use case. Team pages refresh every 3 minutes, admin panel every 1 minute.

### Why inline styles?
Keeps component code self-contained and makes it easy to copy/modify without managing separate CSS files.

## Future Enhancements (Not Implemented)

- [ ] Real-time updates with Supabase subscriptions
- [ ] Leaderboard page showing all team scores
- [ ] Discord webhook notifications
- [ ] OCR validation for OSRS screenshots
- [ ] Export results to Excel/CSV
- [ ] Team authentication (currently teams access via slug URL)

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
