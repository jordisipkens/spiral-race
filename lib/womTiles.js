// WiseOldMan-linked tiles: tracks a team's XP/kc for one metric from the moment the tile unlocked,
// caches it in tile_wom_progress and completes the tile automatically once the target is reached.
//
// All numbers come from the competition cache (lib/womStats.js): one WOM request for every
// participant and metric. That data counts from the competition start, so each tile stores a
// baseline (the team players' gains when it unlocked): progress = gains now - baseline.
import { supabaseAdmin } from './supabaseAdmin'
import { getCompetitionStats } from './womStats'
import { fetchPlayerGained } from './wiseoldman'
import { metricName, metricUnit } from './statsMetrics'
import { saveProgress, postWebhook, notifyRingUnlock } from './tileCompletion'

const TOP_CONTRIBUTORS = 5
// Unlocks older than this (e.g. rings that were open before a tile got a metric) get their
// baseline from WOM history instead of the current cache
const HISTORY_AFTER_MINUTES = 15
// History costs one WOM request per team player; WOM allows 20/min without an API key
const MAX_HISTORY_REQUESTS = 15

// progress.completed_at is a timestamp without time zone, stored in UTC
const toDate = value => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`)

// When a tile unlocked for a team (ISO string), or null while it is still locked.
// Ring 1 opens with the competition; ring N (and the center after ring 5)
// when the last tile of the previous ring was completed.
export function getUnlockedAt(tile, teamProgress, competitionStart) {
  const ring = tile.is_center ? 6 : tile.ring
  if (ring === 1) return competitionStart

  const previousRing = teamProgress.filter(
    p => p.tiles?.board === tile.board && !p.tiles?.is_center && p.tiles?.ring === ring - 1
  )
  if (new Set(previousRing.map(p => p.tiles.path)).size < 3) return null

  const times = previousRing.map(p => toDate(p.completed_at).getTime())
  return new Date(Math.max(...times)).toISOString()
}

// Team progress since the baseline: { value, contributors } (players below their baseline count as 0)
export function computeTileValue(teamPlayers, metric, baseline) {
  const contributors = teamPlayers
    .map(p => ({ displayName: p.displayName, value: (p.gains?.[metric] || 0) - (baseline[p.username] || 0) }))
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value)
  return { value: contributors.reduce((sum, c) => sum + c.value, 0), contributors }
}

// Cached progress for one team, after syncing all WOM tiles with the competition cache
export async function getWomTileProgress(teamId) {
  try {
    await syncWomTiles()
  } catch (error) {
    console.error('Error syncing WOM tiles:', error)
  }

  const { data } = await supabaseAdmin
    .from('tile_wom_progress')
    .select('tile_id, metric, unlocked_at, value, contributors, fetched_at')
    .eq('team_id', teamId)
  return data || []
}

// Creates rows (with baseline) for newly unlocked WOM tiles, updates values from the
// competition cache and completes tiles that reached their target.
// force = true fetches fresh WOM data first (used right after a ring unlock, for an accurate baseline).
export async function syncWomTiles({ force = false } = {}) {
  const { data: womTiles } = await supabaseAdmin
    .from('tiles')
    .select('id, board, ring, path, is_center, title, wom_metric, wom_target')
    .not('wom_metric', 'is', null)
  if (!womTiles?.length) return

  const stats = await getCompetitionStats({ force })
  const [{ data: teams }, { data: progress }, { data: rows }] = await Promise.all([
    supabaseAdmin.from('teams').select('id, name, discord_webhook_url'),
    supabaseAdmin.from('progress').select('team_id, tile_id, completed_at, tiles(board, ring, path, is_center)'),
    supabaseAdmin.from('tile_wom_progress').select('team_id, tile_id, metric, unlocked_at, baseline, value, fetched_at')
  ])

  // Gains between competition start and an unlock moment, per team player; shared by the tiles of a ring
  const history = new Map()
  let historyRequests = 0
  async function gainsAtUnlock(team, teamPlayers, unlockedAt) {
    const key = `${team.id}|${unlockedAt}`
    if (!history.has(key)) {
      if (historyRequests + teamPlayers.length > MAX_HISTORY_REQUESTS) return null // next sync
      historyRequests += teamPlayers.length
      // Any failing player fails the whole baseline: a missing baseline would overcount
      history.set(key, Promise.all(teamPlayers.map(async p =>
        [p.username, await fetchPlayerGained(p.username, stats.competition.startsAt, unlockedAt)]
      )).then(Object.fromEntries))
    }
    return history.get(key)
  }

  let completedAny = false
  for (const team of teams || []) {
    const teamProgress = (progress || []).filter(p => p.team_id === team.id)
    const teamPlayers = stats.players.filter(p => p.teamName === team.name)

    for (const tile of womTiles) {
      if (teamProgress.some(p => p.tile_id === tile.id)) continue // already completed

      const unlockedAt = getUnlockedAt(tile, teamProgress, stats.competition.startsAt)
      if (!unlockedAt) continue

      let row = rows?.find(r => r.team_id === team.id && r.tile_id === tile.id)
      // New unlock, changed metric or changed unlock time (e.g. after a progress reset): new baseline.
      // Ring 1 starts with the competition, so its baseline is empty.
      if (!row || row.metric !== tile.wom_metric || toDate(row.unlocked_at).getTime() !== new Date(unlockedAt).getTime()) {
        const baseline = {}
        if (unlockedAt !== stats.competition.startsAt) {
          const minutesAgo = (new Date(stats.fetchedAt) - new Date(unlockedAt)) / 60000
          if (minutesAgo > HISTORY_AFTER_MINUTES) {
            let past
            try {
              past = await gainsAtUnlock(team, teamPlayers, unlockedAt)
            } catch (error) {
              console.error(`WOM history failed for ${team.name}, retrying next sync:`, error.message)
              continue
            }
            if (!past) continue
            teamPlayers.forEach(p => {
              if (past[p.username]?.[tile.wom_metric] > 0) baseline[p.username] = past[p.username][tile.wom_metric]
            })
          } else {
            teamPlayers.forEach(p => {
              if (p.gains?.[tile.wom_metric] > 0) baseline[p.username] = p.gains[tile.wom_metric]
            })
          }
        }
        row = { metric: tile.wom_metric, unlocked_at: unlockedAt, baseline, value: null }
      }

      const { value, contributors } = computeTileValue(teamPlayers, tile.wom_metric, row.baseline || {})
      if (value !== row.value || !row.fetched_at || toDate(row.fetched_at).getTime() !== new Date(stats.fetchedAt).getTime()) {
        const { error } = await supabaseAdmin.from('tile_wom_progress').upsert({
          team_id: team.id,
          tile_id: tile.id,
          metric: row.metric,
          unlocked_at: row.unlocked_at,
          baseline: row.baseline,
          value,
          contributors: contributors.slice(0, TOP_CONTRIBUTORS),
          fetched_at: stats.fetchedAt
        }, { onConflict: 'team_id,tile_id' })
        if (error) throw error
      }

      if (tile.wom_target > 0 && value >= tile.wom_target) {
        completedAny = (await completeWomTile(team, tile, value)) || completedAny
      }
    }
  }

  // A completed tile can unlock the next ring: sync again so its tiles get a baseline right away
  if (completedAny) await syncWomTiles()
}

// Returns true when the tile was newly completed
async function completeWomTile(team, tile, value) {
  const isNew = await saveProgress(team.id, tile.id)
  if (!isNew) return false
  if (!team.discord_webhook_url) return true

  const unit = metricUnit(tile.wom_metric)
  const amount = `${value.toLocaleString('en-US')} / ${tile.wom_target.toLocaleString('en-US')} ${metricName(tile.wom_metric)}${unit ? ` ${unit}` : ''}`
  await postWebhook(
    team.discord_webhook_url,
    `🎯 Tile **${tile.title || 'Unknown tile'}** (${tile.board}) completed automatically via WiseOldMan: ${amount}!`
  )
  await notifyRingUnlock(team.id, tile, team.discord_webhook_url)
  return true
}
