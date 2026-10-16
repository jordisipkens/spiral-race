# Navigation Sidebar

**Status**: ✅ Complete
**Created**: October 2026
**Last Updated**: October 2026

## Purpose
A sidebar on every page with links to Home, Stats, every team page and the admin sections. Before this, pages could only be reached through scattered "back" links or by typing URLs.

## User Story
As a participant or admin, I want one menu that links to every page, so that I can move between the board, stats, team pages and admin without typing URLs.

## Implementation Overview

### Key Components
| Component | Path | Purpose |
|-----------|------|---------|
| Sidebar | `components/Sidebar.jsx` | Menu with Home, Stats, Teams (🔒/🔓 per team), Admin sections and Log out |
| Root layout | `app/layout.js` | Renders the sidebar (inside `Suspense`) and wraps pages in `.app-content` |
| Styles | `app/globals.css` | `.sidebar`, `.app-content`, `.sidebar-toggle`, `.sidebar-backdrop` (responsive) |
| Admin page | `app/admin/page.js` | Active section comes from `?section=tiles|teams|submissions|settings` |

### Dependencies
- **Internal**: `GET /api/session` (login state), team authentication (see [team-authentication.md](./team-authentication.md))
- **External**: none

## Technical Details

### Data Flow
1. On mount the sidebar loads the teams (`id, name, slug`) with the anon Supabase client.
2. On every navigation it calls `GET /api/session` → `{ admin, teams: [slug] }`. The session cookies are httpOnly, so the client can't read them itself.
3. Teams with a valid team session show 🔓, the others 🔒 (an admin session does not unlock teams). Clicking a locked team goes to the page; the middleware redirects to its login page.
4. Separate buttons: **Log out team(s)** clears the team cookies, **Log out admin** clears the admin cookie.

### Responsive behaviour
- Desktop (> 900px): fixed sidebar of 240px; page content gets `margin-left: 240px`.
- Mobile: the sidebar is hidden off-screen; a ☰ button (top left) opens it as a drawer with a backdrop. It closes on navigation.

## Design Decisions

### Admin section in the URL
- **Rationale**: Sidebar links like `/admin?section=settings` must open the right tab, and the in-page tabs and the sidebar stay in sync. `router.replace` keeps the history clean.
- **Trade-offs**: `useSearchParams` requires a `Suspense` boundary (admin page and layout).

### CSS classes instead of inline styles for the shell
- **Rationale**: The responsive drawer needs media queries, which inline styles can't express. Everything else stays inline, like in the rest of the app.

## Known Limitations
- The team list is visible to everyone (names and slugs only); the pages behind it are protected.

## Related Features
- [Team Authentication](./team-authentication.md): lock state and logout.
- [Event Stats](./wom-ehb-stats.md): linked as "Stats".
