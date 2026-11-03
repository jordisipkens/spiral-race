// Shared tile completion, used by submission approval and WiseOldMan auto-completion.
import { supabaseAdmin } from './supabaseAdmin'

// Saves progress for a tile. Returns true when the tile was newly completed.
// ignoreDuplicates keeps the original completed_at: ring unlock times are derived from it.
export async function saveProgress(teamId, tileId) {
  const { data, error } = await supabaseAdmin
    .from('progress')
    .upsert(
      { team_id: teamId, tile_id: tileId, completed_at: new Date().toISOString() },
      { onConflict: 'team_id,tile_id', ignoreDuplicates: true }
    )
    .select('id')

  if (error) throw error
  return data.length > 0
}

export async function postWebhook(webhookUrl, content) {
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  }).catch(err => console.error('Team webhook failed:', err))
}

// Sends the ring unlock message when completing this tile finished its ring
export async function notifyRingUnlock(teamId, tile, webhookUrl) {
  if (!tile || tile.is_center) return

  const { data: progressData } = await supabaseAdmin
    .from('progress')
    .select('tile_id, tiles(ring, path, board, is_center)')
    .eq('team_id', teamId)

  if (!progressData) return

  // Check if all 3 paths in this ring (same board, non-center) are now complete
  const ringTiles = progressData.filter(
    p => p.tiles?.board === tile.board && !p.tiles?.is_center && p.tiles?.ring === tile.ring
  )
  const completedPaths = new Set(ringTiles.map(p => p.tiles?.path))
  if (completedPaths.size < 3) return

  const nextRing = tile.ring + 1
  const ringMessage = nextRing <= 5
    ? `🔓 Ring ${tile.ring} completed on the **${tile.board}** board! Ring ${nextRing} is now available.`
    : `🏆 All rings completed on the **${tile.board}** board! The center tile is now unlocked!`

  await postWebhook(webhookUrl, ringMessage)
}
