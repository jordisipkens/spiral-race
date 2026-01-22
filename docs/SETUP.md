# Setup Guide - Spiraal Race

Quick guide to set up the project locally or deploy your own instance.

## Prerequisites

- Node.js 18+
- Supabase account (free tier works)
- Vercel account (for deployment)

## 1. Clone and Install

```bash
git clone https://github.com/your-repo/spiral-race.git
cd spiral-race
npm install
```

## 2. Supabase Setup

### Create Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Wait for project to initialize (~2 minutes)

### Create Tables

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
  UNIQUE(board, ring, path, is_center)
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
CREATE INDEX idx_tiles_board ON tiles(board);
```

### Seed Default Tiles

```sql
-- Generate all tiles
INSERT INTO tiles (board, ring, path, title, points, is_center)
SELECT
  board,
  ring,
  path,
  board || ' R' || ring || 'P' || (path + 1) as title,
  CASE
    WHEN board = 'easy' THEN 10
    WHEN board = 'medium' THEN 25
    WHEN board = 'hard' THEN 50
  END as points,
  false as is_center
FROM
  (SELECT unnest(ARRAY['easy', 'medium', 'hard']) as board) boards,
  generate_series(1, 5) as ring,
  generate_series(0, 2) as path;

-- Add center tiles
INSERT INTO tiles (board, ring, path, title, points, is_center)
VALUES
  ('easy', 0, 0, 'Easy Center', 100, true),
  ('medium', 0, 0, 'Medium Center', 200, true),
  ('hard', 0, 0, 'Hard Center', 500, true);
```

### Create Storage Bucket

1. Go to Supabase Dashboard > Storage
2. Create bucket named `proof-images`
3. Set to **Public** (or configure signed URLs in code)

## 3. Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_PASSWORD=choose-a-secure-password
```

Find credentials in Supabase Dashboard > Settings > API

## 4. Run Locally

```bash
npm run dev
```

Open http://localhost:3000

## 5. Deploy to Vercel

### Connect Repository

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Vercel auto-detects Next.js

### Add Environment Variables

In Vercel project settings, add:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD`

### Deploy

Vercel automatically deploys on push to main branch.

## 6. Create Teams

1. Go to `/admin`
2. Enter admin password
3. Switch to "Teams" tab
4. Add teams with unique slugs

Teams access their board at `/team/[slug]`

## 7. Configure Tiles

1. In admin panel, switch to "Tiles" tab
2. Select board (Easy/Medium/Hard)
3. Click on any tile to edit
4. Set title, description, and points

## Troubleshooting

### "Upload failed" error
- Check `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Verify `proof-images` bucket exists in Supabase Storage

### "Team not found" error
- Team slug must match URL exactly
- Create team in admin panel first

### Images not showing
- If bucket is private, need to use signed URLs
- Check bucket policy allows public reads

### Admin login not working
- Check `ADMIN_PASSWORD` is set in environment
- For Vercel, redeploy after adding env vars
