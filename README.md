# Spiraal Race - OSRS Clan Event Platform

A spiral-based event platform for Old School RuneScape clan competitions. Teams complete challenges on spiral boards, submit evidence screenshots, and admins approve completions.

## Live Demo

- **Production**: Deployed on Vercel (spiral-race)
- **Team URL pattern**: `/team/[slug]` (e.g., `/team/dragon-slayers`)
- **Admin panel**: `/admin`

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage (proof-images bucket)
- **Hosting**: Vercel

## Project Structure

```
spiral-race-project/
├── app/
│   ├── page.js                    # Homepage
│   ├── layout.js                  # Root layout
│   ├── admin/
│   │   └── page.js                # Admin panel (tiles, teams, submissions)
│   ├── team/
│   │   └── [slug]/
│       └── page.js                # Team board page
│   └── api/
│       ├── admin/
│       │   ├── auth/route.js      # Admin authentication
│       │   └── submissions/route.js  # Submission management
│       └── submissions/
│           ├── route.js           # Create/list submissions
│           └── upload/route.js    # Image upload to Supabase Storage
├── components/
│   ├── SpiralBoard.jsx            # Main spiral visualization
│   ├── TileModal.jsx              # Tile details + evidence upload
│   ├── BoardTabs.jsx              # Easy/Medium/Hard navigation
│   ├── SubmissionCard.jsx         # Submission display component
│   └── RulesModal.jsx             # Game rules popup
├── lib/
│   └── supabase.js                # Supabase client
└── docs/
    ├── DATABASE_SCHEMA.md         # Database structure
    ├── SPELREGELS.md              # Game rules (Dutch)
    ├── SETUP.md                   # Setup guide
    └── PROJECT_STATUS.md          # Development progress
```

## Features

### Team Features
- View spiral board with 3 difficulty levels (Easy, Medium, Hard)
- All boards available from start
- 5 rings per board with 3 tiles per ring
- Ring-based progression: complete all 3 tiles in a ring before next ring unlocks
- Upload evidence screenshots for tile completions
- View submission status (pending, approved, rejected)
- Full-screen image viewer for uploaded evidence
- Rules popup explaining game mechanics
- Auto-refresh every 3 minutes for progress updates

### Admin Features
- Password-protected admin panel
- Manage tiles (title, description, points per position)
- Multi-item tiles: configure tiles requiring multiple submissions to complete
- Create and manage teams with unique slugs
- Review pending submissions with full-screen image viewer
- View related approved submissions for multi-item tiles
- Approve/reject submissions with optional rejection reason
- Auto-refresh every 1 minute for new submissions

### Visual States
- **Locked**: Opacity 0.25 - ring not yet available
- **Active**: Gold border with glow - can be completed
- **Pending**: Yellow border + clock icon - awaiting review
- **Completed**: Opacity 0.4 - done

## Setup

### Prerequisites
- Node.js 18+
- Supabase account
- Vercel account (for deployment)

### Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_PASSWORD=your-admin-password
```

### Database Setup

Run in Supabase SQL Editor:

```sql
-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tiles table
CREATE TABLE tiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board TEXT NOT NULL CHECK (board IN ('easy', 'medium', 'hard')),
  ring INTEGER NOT NULL CHECK (ring >= 1 AND ring <= 5),
  path INTEGER NOT NULL CHECK (path >= 0 AND path <= 2),
  title TEXT,
  description TEXT,
  points INTEGER DEFAULT 10,
  is_center BOOLEAN DEFAULT FALSE,
  is_multi_item BOOLEAN DEFAULT FALSE,
  required_submissions INTEGER DEFAULT 1,
  UNIQUE(board, ring, path, is_center),
  CONSTRAINT check_required_submissions CHECK (required_submissions >= 1)
);

-- Progress table
CREATE TABLE progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  tile_id UUID NOT NULL REFERENCES tiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, tile_id)
);

-- Submissions table
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  tile_id UUID NOT NULL REFERENCES tiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_team_tile ON submissions(team_id, tile_id);
CREATE INDEX idx_progress_team ON progress(team_id);
```

### Storage Setup

1. Create a bucket called `proof-images` in Supabase Storage
2. Set bucket to **public** (for image viewing)
3. Or use signed URLs for private buckets (see upload route comments)

### Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

### Deployment

Push to GitHub and connect to Vercel. Add environment variables in Vercel dashboard.

## Game Mechanics

### Board System
- All 3 boards (Easy, Medium, Hard) are available from the start
- Each board has 5 rings with 3 tiles per ring (15 tiles + 1 center = 16 total)
- Boards are independent - you can be on different rings per board

### Ring-Based Progression
- All 3 tiles in a ring must be completed before the next ring unlocks
- Example: Complete Ring 1 Tile 1, Ring 1 Tile 2, and Ring 1 Tile 3 → Ring 2 becomes active
- You cannot skip ahead - complete every tile in the current ring first
- Center tile unlocks when all 15 outer tiles are complete

### Evidence Submission
1. Team clicks active tile (gold border)
2. Uploads screenshot proof
3. Submission goes to pending queue
4. Admin reviews and approves/rejects
5. On approval, tile is marked complete

## API Routes

### POST /api/submissions/upload
Upload image to Supabase Storage. Returns public URL.

### POST /api/submissions
Create new submission record.

### GET /api/submissions?team_id=xxx
Get all submissions for a team.

### GET /api/admin/submissions
Get all pending submissions (for admin review).

### PATCH /api/admin/submissions
Approve or reject a submission.

### POST /api/admin/auth
Verify admin password.

## Contributing

This is a hobby project for an OSRS clan. Feel free to fork and adapt for your own clan events.
