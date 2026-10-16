// WiseOldMan API client - fetches a competition and normalizes it for the stats page
// Docs: https://docs.wiseoldman.net/api/competitions/competition-endpoints

const WOM_API_URL = 'https://api.wiseoldman.net/v2'

// WOM uses -1 for "unranked / unknown"
function cleanValue(value) {
  return typeof value === 'number' && value >= 0 ? value : null
}

export async function fetchCompetitionMetric(competitionId, metric = 'ehb') {
  const headers = { 'User-Agent': 'spiral-race' }
  if (process.env.WOM_API_KEY) {
    headers['x-api-key'] = process.env.WOM_API_KEY
  }

  const res = await fetch(
    `${WOM_API_URL}/competitions/${encodeURIComponent(competitionId)}?metrics=${metric}`,
    { headers, cache: 'no-store' }
  )
  const body = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(body?.message || `WiseOldMan request failed (${res.status})`)
  }

  return normalizeCompetition(body, metric)
}

function normalizeCompetition(competition, metric) {
  const players = (competition.participations || []).map(participation => {
    const delta = participation.deltas?.find(d => d.metric === metric)
    const values = delta?.values || participation.progress || {}

    return {
      username: participation.player.username,
      displayName: participation.player.displayName,
      teamName: participation.teamName || null,
      start: cleanValue(values.start),
      end: cleanValue(values.end),
      gained: Math.max(0, values.gained || 0),
      updatedAt: participation.player.updatedAt
    }
  })

  players.sort((a, b) => b.gained - a.gained)

  // Aggregate team totals (only for team competitions)
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
    metric,
    teams,
    players
  }
}
