// Database cache for WiseOldMan competition data.
// Visitors always read from the wom_cache table; WOM is called at most once per CACHE_TTL_MINUTES.
import { supabaseAdmin } from './supabaseAdmin'
import { fetchCompetition } from './wiseoldman'

export const CACHE_TTL_MINUTES = 15
// wom_cache.metric value for the combined dataset (EHB + bosses + activities)
const CACHE_KEY = 'all'
// After a failed WOM fetch, retry after this many minutes instead of the full TTL
const RETRY_AFTER_MINUTES = 1

const minutesAgo = minutes => new Date(Date.now() - minutes * 60 * 1000).toISOString()

export class StatsError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export async function getCompetitionId() {
  const { data } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', 'wom_competition_id')
    .maybeSingle()

  const id = data?.value?.trim()
  if (!id) {
    throw new StatsError('No competition configured', 404)
  }
  if (!/^\d+$/.test(id)) {
    throw new StatsError('Competition ID must be a number', 400)
  }
  return Number(id)
}

async function fetchAndStore(competitionId, metric) {
  const data = await fetchCompetition(competitionId)
  const fetchedAt = new Date().toISOString()

  const { error } = await supabaseAdmin
    .from('wom_cache')
    .upsert(
      { competition_id: competitionId, metric, data, fetched_at: fetchedAt },
      { onConflict: 'competition_id,metric' }
    )
  if (error) {
    console.error('Error saving WOM cache:', error)
  }

  return { ...data, fetchedAt, stale: false }
}

// Returns cached stats, refreshing from WOM when the cache is older than the TTL.
// force = true always fetches from WOM (admin "Refresh now").
export async function getCompetitionStats({ force = false } = {}) {
  const competitionId = await getCompetitionId()
  const metric = CACHE_KEY

  const { data: cached } = await supabaseAdmin
    .from('wom_cache')
    .select('data, fetched_at')
    .eq('competition_id', competitionId)
    .eq('metric', metric)
    .maybeSingle()

  // Nothing cached yet (or forced): fetch directly
  if (!cached || force) {
    try {
      return await fetchAndStore(competitionId, metric)
    } catch (error) {
      if (cached) {
        return { ...cached.data, fetchedAt: cached.fetched_at, stale: true }
      }
      throw new StatsError(error.message, 502)
    }
  }

  const cachedResult = { ...cached.data, fetchedAt: cached.fetched_at, stale: false }
  const threshold = minutesAgo(CACHE_TTL_MINUTES)

  if (new Date(cached.fetched_at) >= new Date(threshold)) {
    return cachedResult
  }

  // Cache is stale: claim the refresh by bumping fetched_at, so concurrent
  // requests don't all call WOM. Only the request whose update matches a row refreshes.
  const { data: claimed } = await supabaseAdmin
    .from('wom_cache')
    .update({ fetched_at: new Date().toISOString() })
    .eq('competition_id', competitionId)
    .eq('metric', metric)
    .lt('fetched_at', threshold)
    .select('competition_id')

  if (!claimed?.length) {
    // Another request is already refreshing
    return cachedResult
  }

  try {
    return await fetchAndStore(competitionId, metric)
  } catch (error) {
    console.error('Error refreshing WOM data:', error)
    // Allow a retry soon instead of waiting a full TTL
    await supabaseAdmin
      .from('wom_cache')
      .update({ fetched_at: minutesAgo(CACHE_TTL_MINUTES - RETRY_AFTER_MINUTES) })
      .eq('competition_id', competitionId)
      .eq('metric', metric)
    return { ...cachedResult, stale: true }
  }
}
