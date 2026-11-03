// WiseOldMan API client - fetches a competition and normalizes it for the stats page
// Docs: https://docs.wiseoldman.net/api/competitions/competition-endpoints
import { BOSS_METRICS, ACTIVITY_METRICS, SKILL_METRICS } from './statsMetrics'

const WOM_API_URL = 'https://api.wiseoldman.net/v2'

// EHB plus every boss, activity and skill, fetched in a single request
const METRICS = ['ehb', ...BOSS_METRICS, ...ACTIVITY_METRICS, ...SKILL_METRICS]

// WOM uses -1 for "unranked / unknown"
function cleanValue(value) {
  return typeof value === 'number' && value >= 0 ? value : null
}

async function womGet(path) {
  const headers = { 'User-Agent': 'spiral-race' }
  if (process.env.WOM_API_KEY) {
    headers['x-api-key'] = process.env.WOM_API_KEY
  }

  const res = await fetch(`${WOM_API_URL}${path}`, { headers, cache: 'no-store' })
  const body = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(body?.message || `WiseOldMan request failed (${res.status})`)
  }
  return body
}

export async function fetchCompetition(competitionId) {
  const query = METRICS.map(metric => `metrics=${metric}`).join('&')
  const body = await womGet(`/competitions/${encodeURIComponent(competitionId)}?${query}`)
  return normalizeCompetition(body)
}

// Everything one player gained between two dates, as { metric: gained } (only gains > 0).
// One request covers every skill (XP), boss (kc) and activity (score).
export async function fetchPlayerGained(username, startDate, endDate) {
  const params = new URLSearchParams({ startDate, endDate })
  const { data } = await womGet(`/players/${encodeURIComponent(username)}/gained?${params}`)

  const gains = {}
  const add = (group, field) => Object.values(data?.[group] || {}).forEach(entry => {
    if (entry[field]?.gained > 0) gains[entry.metric] = entry[field].gained
  })
  add('skills', 'experience')
  add('bosses', 'kills')
  add('activities', 'score')
  return gains
}

function normalizeCompetition(competition) {
  const players = (competition.participations || []).map(participation => {
    const ehb = participation.deltas?.find(d => d.metric === 'ehb')?.values || {}

    // Only keep non-zero gains for bosses/activities/skills to keep the cache small
    const gains = {}
    participation.deltas?.forEach(delta => {
      if (delta.metric === 'ehb' || delta.metric === 'total') return
      if (delta.values?.gained > 0) {
        gains[delta.metric] = delta.values.gained
      }
    })

    return {
      username: participation.player.username,
      displayName: participation.player.displayName,
      teamName: participation.teamName || null,
      // EHB values (used by the EHB tab)
      start: cleanValue(ehb.start),
      end: cleanValue(ehb.end),
      gained: Math.max(0, ehb.gained || 0),
      gains,
      updatedAt: participation.player.updatedAt
    }
  })

  players.sort((a, b) => b.gained - a.gained)

  // Aggregate EHB team totals (only for team competitions)
  const teamMap = {}
  players.forEach(player => {
    if (!player.teamName) return
    if (!teamMap[player.teamName]) {
      teamMap[player.teamName] = { name: player.teamName, totalGained: 0, playerCount: 0 }
    }
    teamMap[player.teamName].totalGained += player.gained
    teamMap[player.teamName].playerCount += 1
  })
  const teams = Object.values(teamMap).sort((a, b) => b.totalGained - a.totalGained)

  return {
    competition: {
      id: competition.id,
      title: competition.title,
      startsAt: competition.startsAt,
      endsAt: competition.endsAt,
      isTeamCompetition: competition.type === 'team'
    },
    teams,
    players
  }
}
