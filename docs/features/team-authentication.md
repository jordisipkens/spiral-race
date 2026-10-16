# Team & Admin Authentication

**Status**: ✅ Complete
**Created**: October 2026
**Last Updated**: October 2026

## Purpose
Team pages get a password per team; a login stays valid for a week. Admin login now uses a signed token instead of "any cookie named `admin_token`", which anyone could fake. A middleware guards the team pages and the admin and submission API routes.

## User Story
As an admin, I want every team page behind its own password, so that teams can't view or submit for other teams, and nobody can reach admin functions without the admin password.

## Implementation Overview

### Key Components
| Component | Path | Purpose |
|-----------|------|---------|
| Middleware | `middleware.js` | Guards `/team/[slug]`, `/api/admin/*` (except auth) and `/api/submissions/*` |
| Auth helpers | `lib/auth.js` | HMAC-signed tokens (Web Crypto, works in Edge), `isAdminRequest`, `hasTeamAccess`, `getTeamSessions`, `canActForTeam` |
| Passwords | `lib/passwords.js` | `hashPassword`/`verifyPassword` (scrypt), `safeEqual` for the admin password |
| Service client | `lib/supabaseAdmin.js` | Shared service-role Supabase client with `cache: 'no-store'` |
| Team login page | `app/team/[slug]/login/page.js` | Password form; redirects to the team page on success |
| Team auth API | `app/api/team/auth/route.js` | `POST` log in (7-day cookie), `DELETE ?slug=` log out |
| Session API | `app/api/session/route.js` | `GET` → `{ admin, teams }` for the sidebar |
| Team password API | `app/api/admin/teams/password/route.js` | `GET` team ids with a password, `POST` set/change a password |
| Admin auth API | `app/api/admin/auth/route.js` | Admin login now issues a signed 24-hour token |
| Admin panel | `app/admin/page.js` | Teams tab: password status + "Set/Change Password" |

### Dependencies
- **Internal**: `teams` table, new `team_passwords` table
- **External**: Node `crypto` (scrypt), Web Crypto (HMAC)

## Technical Details

### Tokens
`base64url(JSON payload).base64url(HMAC-SHA256 signature)`. Payload is `{ role: 'admin', exp }` or `{ role: 'team', teamId, slug, exp }`. The secret is `AUTH_SECRET`, with `ADMIN_PASSWORD` as fallback. Changing it logs everyone out.

### Cookies
| Cookie | Lifetime | Content |
|--------|----------|---------|
| `admin_token` | 24 hours | Admin token |
| `team_<slug>` | 7 days | Team token, one cookie per team |

All are `httpOnly`, `secure` in production, `sameSite: 'lax'` so links from Discord still carry the cookie.

### Data Flow (team)
1. A visitor opens `/team/dragons`. The middleware finds no valid `team_dragons` cookie and redirects to `/team/dragons/login`.
2. The login form calls `POST /api/team/auth { slug, password }`, which verifies the scrypt hash from `team_passwords`.
3. On success the server sets `team_dragons` (7 days) and the page does a full navigation to `/team/dragons`.
4. Submissions: the middleware requires a session, and `POST /api/submissions` and `/upload` check with `canActForTeam` that the `team_id` belongs to that session (or that the user is admin).

Admins have access to every team page.

### Database Interaction
- **Tables Used**: `teams`, `team_passwords`
- **Migration** (run once in the Supabase SQL Editor):
  ```sql
  CREATE TABLE team_passwords (
    team_id UUID PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Only accessed server-side with the service role key; no policies = no anon access
  ALTER TABLE team_passwords ENABLE ROW LEVEL SECURITY;
  ```

## Design Decisions

### Separate `team_passwords` table
- **Rationale**: The `teams` table is read with the public anon key (team pages, sidebar). A hash column there would be readable by anyone. A separate table with RLS and no policies is only reachable with the service role.

### Team without a password is locked
- **Rationale**: Safe by default. The admin sees "⚠️ No password" per team and sets one in the Teams tab.

### Page-level protection only (chosen trade-off)
- **Decision**: The pages and API routes are protected, but the admin and team pages still read and write Supabase directly with the anon key.
- **Trade-offs**: Someone with technical knowledge can still read or write data via the anon key (visible in the JS bundle). Closing that requires moving all data access to server routes and locking RLS. That was deliberately left out for now.

## Testing Considerations
- [x] Forged `admin_token` cookie → 401 on `/api/admin/*`
- [x] Tampered, expired or other-secret tokens are rejected
- [x] `/team/[slug]` without a session → redirect to `/team/[slug]/login`; as admin → 200
- [x] `/api/submissions` without a session → 401
- [ ] Team login with a real password (needs the `team_passwords` table)
- [ ] Team A session can't submit with team B's `team_id` (403)

## Known Limitations
- Data is still reachable via the anon key (see above).
- Changing a team password doesn't end existing sessions of that team; changing `AUTH_SECRET` ends all sessions.
- No rate limiting on login attempts.

## Future Improvements
- [ ] Move all Supabase access server-side and lock RLS
- [ ] Rate limiting on login endpoints
- [ ] Revoke team sessions when the password changes (password version in the token)

## Related Features
- [Navigation Sidebar](./navigation-sidebar.md): shows 🔒/🔓 and the Log out button.
