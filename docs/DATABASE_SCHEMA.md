# Database Schema - Spiraal Race

## Overview

Supabase PostgreSQL database with 4 main tables:
- `teams` - Participating teams with unique URL slugs
- `tiles` - Configurable challenges per board position
- `progress` - Completed tiles per team
- `submissions` - Evidence uploads with approval workflow

## Tables

### teams

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_teams_slug ON teams(slug);
```

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Display name (e.g., "Dragon Slayers") |
| slug | TEXT | URL-safe identifier (e.g., "dragon-slayers") |
| created_at | TIMESTAMP | Creation timestamp |

**Usage**: Teams access their board via `/team/[slug]`

---

### tiles

```sql
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

CREATE INDEX idx_tiles_board ON tiles(board);
CREATE INDEX idx_tiles_position ON tiles(board, ring, path);
```

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| board | TEXT | 'easy', 'medium', or 'hard' |
| ring | INTEGER | 1-5 (1 = outermost) |
| path | INTEGER | 0, 1, or 2 (three parallel paths) |
| title | TEXT | Short tile name |
| description | TEXT | Challenge description |
| points | INTEGER | Points awarded on completion |
| is_center | BOOLEAN | True for center tile (unlocks when all paths complete) |

**Tile Count**: 16 per board (5 rings × 3 paths + 1 center) = 48 total

---

### progress

```sql
CREATE TABLE progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  tile_id UUID NOT NULL REFERENCES tiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, tile_id)
);

CREATE INDEX idx_progress_team ON progress(team_id);
CREATE INDEX idx_progress_tile ON progress(tile_id);
```

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| team_id | UUID | Reference to teams.id |
| tile_id | UUID | Reference to tiles.id |
| completed_at | TIMESTAMP | When the tile was completed |

**Created when**: Admin approves a submission

---

### submissions

```sql
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

CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_team ON submissions(team_id);
CREATE INDEX idx_submissions_team_tile ON submissions(team_id, tile_id);
```

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| team_id | UUID | Reference to teams.id |
| tile_id | UUID | Reference to tiles.id |
| image_url | TEXT | URL to uploaded image in Supabase Storage |
| status | TEXT | 'pending', 'approved', or 'rejected' |
| rejection_reason | TEXT | Optional reason if rejected |
| submitted_at | TIMESTAMP | When evidence was uploaded |
| reviewed_at | TIMESTAMP | When admin reviewed |

**Workflow**:
1. Team uploads image -> status = 'pending'
2. Admin reviews -> status = 'approved' or 'rejected'
3. If approved -> creates entry in progress table
4. If rejected -> team can resubmit

---

## Supabase Storage

### Bucket: proof-images

```
proof-images/
├── {team_id}/
│   ├── {tile_id}_{timestamp}.jpg
│   ├── {tile_id}_{timestamp}.png
│   └── ...
```

**Configuration**:
- Public: true (or use signed URLs for private)
- Max file size: 5MB
- Allowed types: image/jpeg, image/png, image/webp

---

## Common Queries

### Get team progress with tile details

```sql
SELECT
  t.board,
  t.ring,
  t.path,
  t.title,
  t.points,
  p.completed_at
FROM progress p
JOIN tiles t ON p.tile_id = t.id
WHERE p.team_id = 'team-uuid'
ORDER BY t.board, t.ring, t.path;
```

### Calculate completed rings per board

```sql
WITH path_progress AS (
  SELECT
    t.board,
    t.path,
    MAX(t.ring) as max_ring
  FROM progress p
  JOIN tiles t ON p.tile_id = t.id
  WHERE p.team_id = 'team-uuid'
    AND NOT t.is_center
  GROUP BY t.board, t.path
)
SELECT
  board,
  MIN(max_ring) as completed_rings
FROM path_progress
GROUP BY board;
```

### Get pending submissions for admin

```sql
SELECT
  s.*,
  te.name as team_name,
  te.slug as team_slug,
  ti.board,
  ti.ring,
  ti.path,
  ti.title,
  ti.points
FROM submissions s
JOIN teams te ON s.team_id = te.id
JOIN tiles ti ON s.tile_id = ti.id
WHERE s.status = 'pending'
ORDER BY s.submitted_at ASC;
```

### Calculate team points

```sql
SELECT
  te.name,
  te.slug,
  COALESCE(SUM(ti.points), 0) as total_points,
  COUNT(p.id) as tiles_completed
FROM teams te
LEFT JOIN progress p ON te.id = p.team_id
LEFT JOIN tiles ti ON p.tile_id = ti.id
GROUP BY te.id
ORDER BY total_points DESC;
```

### Get submissions for a tile

```sql
SELECT *
FROM submissions
WHERE team_id = 'team-uuid'
  AND tile_id = 'tile-uuid'
ORDER BY submitted_at DESC;
```

---

## Initial Data Setup

### Seed tiles for all boards

```sql
-- Generate tiles for each board
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

### Create test team

```sql
INSERT INTO teams (name, slug)
VALUES ('Test Team', 'test-team');
```
