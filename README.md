# 🎯 Spiraal Race - OSRS Clan Event Platform

## 📖 Project Overzicht

Een progressive spiraal-gebaseerd event platform voor Old School RuneScape clan competities. Teams voltooien challenges in spiraalvormige boards met drie parallelle paden, waarbij ze progressief moeilijkere boards unlocken.

## 🎮 Game Concept

### Board Structuur
- **3 Aparte Spiraal Boards**: Easy → Medium → Hard
- **5 Ringen per board** met **3 parallelle paden** per ring
- **15 tiles per board** (5 ringen × 3 paden) + 1 centrum = 16 tiles per board
- **Progressive unlock**: Medium na 3 ringen Easy, Hard na 3 ringen Medium

### Gameplay
- Teams kunnen **parallel** aan alle 3 paden werken binnen één board
- **Lineaire progressie** per pad: Ring 1 → 2 → 3 → 4 → 5
- Centrum unlocked als alle 3 paden compleet zijn (alle 15 tiles done)
- Elk board heeft eigen kleurenschema en moeilijkheidsgraad

### Visuele States
- 🔒 **Vergrendeld**: Opacity 0.25, grayscale - wat nog niet gespeeld kan worden
- ▶ **Actief**: Gouden rand, subtiele glow - de volgende tile per pad
- ✓ **Voltooid**: Opacity 0.3, vervaagd naar achtergrond - al gedaan

## 🏗️ Tech Stack

### Frontend
- **Framework**: React (Next.js voor Vercel)
- **Deployment**: Vercel (gratis tier - perfect voor ons)

### Backend  
- **Database**: Supabase PostgreSQL (gratis tier)
- **Auth**: Supabase Auth (voor teams & admins)
- **Storage**: Supabase Storage (voor bewijs foto's)
- **Real-time**: Supabase Subscriptions (live updates)

### Waarom Supabase + Vercel?
✅ **100% gratis** voor clan events  
✅ **Zero DevOps** - geen servers beheren  
✅ **Instant deploys** - git push = live  
✅ **Schaalt automatisch** als het groter wordt  
✅ **Built-in auth & storage** - alles in één  

## 📁 Project Structuur

```
spiral-race-project/
├── frontend/               # React/Next.js app
│   ├── components/
│   │   ├── SpiralBoard.jsx      # De spiraal visualisatie
│   │   ├── AdminPanel.jsx       # Admin configuratie
│   │   ├── UploadProof.jsx      # Foto upload
│   │   └── ApprovalQueue.jsx    # Admin approval
│   ├── pages/
│   │   ├── index.js             # Homepage
│   │   ├── team/[teamId].js     # Team board pagina
│   │   └── admin/               # Admin pages
│   ├── lib/
│   │   └── supabase.js          # Supabase client
│   └── styles/
├── designs/                # Visuele prototypes (HTML)
│   └── spiral_boards.html  # Werkend prototype!
├── docs/                   # Documentatie
│   ├── SPELREGELS.md       # Game rules
│   ├── DATABASE_SCHEMA.md  # Database details
│   └── FEATURES.md         # Feature requirements
└── README.md              # This file
```

## 🚀 Quick Start Guide

### 1. Project Setup
```bash
# Open dit project in VS Code
cd spiral-race-project

# Installeer Node.js als je dat nog niet hebt
# Download van: https://nodejs.org/

# Check of Node werkt
node --version
npm --version
```

### 2. Supabase Account
1. Ga naar [supabase.com](https://supabase.com)
2. Maak gratis account aan
3. Create new project
4. Kopieer je project URL en anon key

### 3. Bekijk het Prototype
```bash
# Open in browser
cd designs
# Open spiral_boards.html in je browser

# Dit is hoe het eruit komt te zien!
# Gebruik dit als referentie tijdens development
```

## 📊 Database Schema Preview

```sql
-- Teams (elk team heeft unieke URL)
teams: id, name, unique_url, created_at

-- Tiles (admin configureert dit)
tiles: id, board_type, ring, path, description, points

-- Progress (per team)
progress: id, team_id, tile_id, completed, completed_at

-- Submissions (foto bewijzen)
submissions: id, team_id, tile_id, image_url, status
```

Volledige details in `docs/DATABASE_SCHEMA.md`

## 🎯 Feature Requirements

### Must Have (MVP)
- [ ] Multi-team systeem met unieke URLs
- [ ] 3 spiraal boards (Easy/Medium/Hard)
- [ ] Admin panel voor tile configuratie
- [ ] Foto upload voor bewijs
- [ ] Handmatige approval door admins
- [ ] Progress tracking per team

### Nice to Have
- [ ] Automatische OCR validatie voor screenshots
- [ ] Real-time leaderboard
- [ ] Discord notificaties
- [ ] Export naar Excel

### Admin Configuratie
Admins kunnen instellen via panel:
- Welke tiles in welke volgorde
- Hoeveel punten per tile
- Unlock requirements (bijv. "3 ringen voor Medium")
- Challenge beschrijvingen per tile

## 📝 Development Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Next.js project opzetten
- [ ] Supabase database aanmaken
- [ ] Team auth implementeren
- [ ] Spiraal component uit prototype halen
- [ ] Koppelen aan database

### Phase 2: Core Features (Week 2)
- [ ] Admin panel bouwen
- [ ] Tile configuratie interface
- [ ] Foto upload systeem
- [ ] Approval queue pagina
- [ ] Deploy naar Vercel

### Phase 3: Polish (Week 3)
- [ ] Mobile responsive maken
- [ ] Real-time updates
- [ ] Team statistieken
- [ ] Testing & bug fixes

### Future: Automation
- [ ] OCR voor RuneScape screenshots
- [ ] Automatische validatie
- [ ] Discord bot integratie

## 💻 Hoe We Samenwerken in VS Code

### In Dit Project:
1. **Open spiral-race-project in VS Code**
2. **Bekijk /designs/spiral_boards.html** in browser
3. **Lees /docs/** voor context
4. **Start met één feature tegelijk**

### In Onze Chat:
Je kunt:
- Code copy-pasten voor review
- Screenshots sturen van errors
- Vragen stellen over implementatie
- Om nieuwe features vragen

Ik help met:
- Code schrijven/reviewen
- Bugs oplossen
- Features implementeren
- Database queries schrijven
- Deployment problemen

### Workflow:
```
1. Kies een feature uit roadmap
2. Vraag mij om code/hulp
3. Test in VS Code
4. Deploy naar Vercel
5. Repeat!
```

## 🎨 Design Reference

**Huidig prototype**: `designs/spiral_boards.html`
- Open in browser om te zien hoe het werkt
- Alle animations zijn uitgewerkt
- 3 parallelle paden visueel duidelijk
- States (locked/active/completed) zijn af

**Gebruik dit als**:
- Visuele referentie
- CSS basis voor React componenten
- Demo voor clan members

## 📚 Belangrijke Docs

- **SPELREGELS.md** - Game mechanics uitgelegd
- **DATABASE_SCHEMA.md** - Database structuur details
- **FEATURES.md** - Alle feature requirements

## 🔧 Handige VS Code Extensions

Aanbevolen voor dit project:
- **ES7+ React/Redux snippets** - Sneller React code
- **Tailwind CSS IntelliSense** - CSS autocomplete
- **Prettier** - Code formatting
- **GitLens** - Als je git gebruikt

## 🤔 Volgende Stappen

**1. Verken het project:**
- Open in VS Code
- Bekijk de directory structuur
- Open het prototype in browser

**2. Lees de docs:**
- README.md (this file) ✓
- docs/SPELREGELS.md
- docs/DATABASE_SCHEMA.md

**3. Maak Supabase account:**
- supabase.com
- Create new project
- Save credentials

**4. Start development:**
- Kies Phase 1 task
- Vraag mij om code
- Begin bouwen!

## 💡 Tips

- **Start simpel**: Begin met één board, voeg later meer toe
- **Test vaak**: Deploy vroeg naar Vercel, test met clan
- **Git gebruiken**: Commit regelmatig (optional maar handig)
- **Vraag hulp**: Stuck? Deel je code in chat!

---

**Ready to build? Open dit project in VS Code en laten we beginnen! 🚀**

Heb je vragen? Deel je scherm/code in onze chat en ik help je verder!
