# 🗄️ Database Schema - Spiraal Race

## Overzicht

Deze database ondersteunt:
- Multi-team systeem met unieke URLs
- Configureerbare tiles per board
- Progress tracking per team
- Foto submissions & approval workflow
- Admin management

## 📊 Tables

### 1. teams

Elke clan team heeft een unieke entry.

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  unique_url TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_teams_url ON teams(unique_url);
```

**Voorbeeld data:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Dragon Slayers",
  "unique_url": "dragon-slayers-2024",
  "created_at": "2024-01-01T00:00:00Z"
}
```

**Use cases:**
- Team login via unique URL
- Progress isolation per team
- Leaderboard grouping

---

### 2. tiles

Admin-configureerbare challenges per board/ring/pad.

```sql
CREATE TABLE tiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_type TEXT NOT NULL CHECK (board_type IN ('easy', 'medium', 'hard')),
  ring INTEGER NOT NULL CHECK (ring >= 1 AND ring <= 5),
  path INTEGER NOT NULL CHECK (path >= 0 AND path <= 2),
  description TEXT NOT NULL,
  points INTEGER DEFAULT 10 CHECK (points > 0),
  is_center BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure unique tile per position
  UNIQUE(board_type, ring, path, is_center)
);

-- Indexes
CREATE INDEX idx_tiles_board ON tiles(board_type);
CREATE INDEX idx_tiles_position ON tiles(board_type, ring, path);
```

**Voorbeeld data:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "board_type": "easy",
  "ring": 1,
  "path": 0,
  "description": "Kill 50 Goblins in Lumbridge",
  "points": 10,
  "is_center": false
}
```

**Admin configuratie:**
- Welke challenge in welke positie
- Hoeveel punten per tile
- Challenge beschrijving
- Center tile special cases

---

### 3. progress

Tracks welke tiles elk team heeft voltooid.

```sql
CREATE TABLE progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  tile_id UUID NOT NULL REFERENCES tiles(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- One progress entry per team/tile combo
  UNIQUE(team_id, tile_id)
);

-- Indexes
CREATE INDEX idx_progress_team ON progress(team_id);
CREATE INDEX idx_progress_completed ON progress(team_id, completed);
CREATE INDEX idx_progress_tile ON progress(tile_id);
```

**Voorbeeld data:**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "team_id": "550e8400-e29b-41d4-a716-446655440000",
  "tile_id": "660e8400-e29b-41d4-a716-446655440001",
  "completed": true,
  "completed_at": "2024-01-05T14:30:00Z"
}
```

**Queries:**
- Get team's current progress
- Calculate completed rings per board
- Check if tile is unlocked for team

---

### 4. submissions

Bewijs foto's die wachten op approval.

```sql
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  tile_id UUID NOT NULL REFERENCES tiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES admins(id),
  submitted_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  
  -- Can submit multiple times (resubmissions after reject)
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_submissions_team ON submissions(team_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_pending ON submissions(status, submitted_at) WHERE status = 'pending';
```

**Voorbeeld data:**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "team_id": "550e8400-e29b-41d4-a716-446655440000",
  "tile_id": "660e8400-e29b-41d4-a716-446655440001",
  "image_url": "https://storage.supabase.co/bucket/proof-123.png",
  "status": "pending",
  "submitted_at": "2024-01-05T14:25:00Z"
}
```

**Workflow:**
1. Team uploads screenshot → status='pending'
2. Admin reviews → status='approved' or 'rejected'
3. If approved → update progress table
4. If rejected → team can resubmit

---

### 5. admins

Admin accounts voor approval & configuratie.

```sql
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_admins_email ON admins(email);
```

**Roles:**
- `admin`: Can approve submissions, view stats
- `super_admin`: Can also configure tiles, manage teams

---

### 6. config

Global event configuratie.

```sql
CREATE TABLE config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Pre-populate with defaults
INSERT INTO config (key, value) VALUES
  ('unlock_requirements', '{"medium": 3, "hard": 3}'::jsonb),
  ('event_active', 'true'::jsonb),
  ('event_start', '"2024-01-01T00:00:00Z"'::jsonb),
  ('event_end', '"2024-01-31T23:59:59Z"'::jsonb);
```

**Configureerbare waarden:**
- Unlock thresholds per board
- Event actief/inactief toggle
- Start/end dates
- Point multipliers

---

## 🔐 Row Level Security (RLS)

Supabase RLS policies voor veiligheid:

### Teams Table

```sql
-- Teams kunnen alleen hun eigen data zien
CREATE POLICY "Teams can view own data"
  ON teams FOR SELECT
  USING (auth.uid() = id);

-- Admins kunnen alles zien
CREATE POLICY "Admins can view all teams"
  ON teams FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');
```

### Progress Table

```sql
-- Teams kunnen alleen hun eigen progress zien
CREATE POLICY "Teams can view own progress"
  ON progress FOR SELECT
  USING (team_id = auth.uid());

-- Teams kunnen hun eigen progress updaten (via submissions)
CREATE POLICY "Teams can update own progress"
  ON progress FOR UPDATE
  USING (team_id = auth.uid());
```

### Submissions Table

```sql
-- Teams kunnen alleen hun eigen submissions zien
CREATE POLICY "Teams can view own submissions"
  ON submissions FOR SELECT
  USING (team_id = auth.uid());

-- Teams kunnen submissions maken
CREATE POLICY "Teams can create submissions"
  ON submissions FOR INSERT
  WITH CHECK (team_id = auth.uid());

-- Admins kunnen alle submissions zien en updaten
CREATE POLICY "Admins can manage all submissions"
  ON submissions FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');
```

---

## 📈 Common Queries

### Get Team Progress

```sql
-- Get all completed tiles for a team
SELECT 
  t.board_type,
  t.ring,
  t.path,
  t.description,
  t.points,
  p.completed_at
FROM progress p
JOIN tiles t ON p.tile_id = t.id
WHERE p.team_id = 'team-uuid'
  AND p.completed = true
ORDER BY t.board_type, t.ring, t.path;
```

### Calculate Completed Rings

```sql
-- Get minimum completed ring per board/path
WITH ring_completion AS (
  SELECT 
    t.board_type,
    t.path,
    MAX(CASE WHEN p.completed THEN t.ring ELSE 0 END) as max_ring
  FROM tiles t
  LEFT JOIN progress p ON t.id = p.tile_id AND p.team_id = 'team-uuid'
  WHERE NOT t.is_center
  GROUP BY t.board_type, t.path
)
SELECT 
  board_type,
  MIN(max_ring) as completed_rings
FROM ring_completion
GROUP BY board_type;
```

### Pending Approval Queue

```sql
-- Get all pending submissions sorted by oldest first
SELECT 
  s.id,
  s.image_url,
  s.submitted_at,
  te.name as team_name,
  ti.board_type,
  ti.ring,
  ti.path,
  ti.description
FROM submissions s
JOIN teams te ON s.team_id = te.id
JOIN tiles ti ON s.tile_id = ti.id
WHERE s.status = 'pending'
ORDER BY s.submitted_at ASC;
```

### Leaderboard

```sql
-- Calculate total points per team
SELECT 
  te.name,
  te.unique_url,
  SUM(ti.points) as total_points,
  COUNT(p.id) as tiles_completed,
  MAX(p.completed_at) as last_completion
FROM teams te
LEFT JOIN progress p ON te.id = p.team_id AND p.completed = true
LEFT JOIN tiles ti ON p.tile_id = ti.id
GROUP BY te.id, te.name, te.unique_url
ORDER BY total_points DESC, last_completion ASC;
```

---

## 🔄 Supabase Setup

### 1. Create Tables

```sql
-- Run in Supabase SQL Editor
-- Copy tables definitions from above
```

### 2. Enable RLS

```sql
-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
```

### 3. Create Storage Bucket

```javascript
// In Supabase Storage
const bucket = await supabase.storage.createBucket('proof-images', {
  public: false,
  fileSizeLimit: 5242880, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
});
```

### 4. Storage RLS

```sql
-- Teams can upload to their own folder
CREATE POLICY "Teams can upload proof"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'proof-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Teams can view their own images
CREATE POLICY "Teams can view own proof"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'proof-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admins can view all images
CREATE POLICY "Admins can view all proof"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'proof-images' AND
    auth.jwt() ->> 'role' = 'admin'
  );
```

---

## 📝 Migration Plan

### Initial Setup

1. Create all tables
2. Enable RLS with policies
3. Create storage bucket
4. Insert default config
5. Create admin accounts

### Seed Data

```sql
-- Create default tiles for testing
INSERT INTO tiles (board_type, ring, path, description, points) VALUES
  -- Easy Board
  ('easy', 1, 0, 'Kill 50 Goblins', 10),
  ('easy', 1, 1, 'Mine 100 Iron ore', 10),
  ('easy', 1, 2, 'Cook 50 Lobsters', 10),
  -- ... more tiles
  
  -- Medium Board
  ('medium', 1, 0, 'Kill Barrows brother', 25),
  -- ... more tiles
  
  -- Hard Board
  ('hard', 1, 0, 'Complete Theatre of Blood', 100);
  -- ... more tiles
```

---

**Database is ready! 🚀**
