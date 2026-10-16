// WiseOldMan metrics shown on the stats page, plus display helpers.
// Shared by the server (lib/wiseoldman.js) and the client (app/stats/page.js).

// All WOM boss metrics. New bosses on WOM need to be added here.
export const BOSS_METRICS = [
  'abyssal_sire', 'alchemical_hydra', 'amoxliatl', 'araxxor', 'artio', 'barrows_chests', 'brutus',
  'bryophyta', 'callisto', 'calvarion', 'cerberus', 'chambers_of_xeric', 'chambers_of_xeric_challenge_mode',
  'chaos_elemental', 'chaos_fanatic', 'commander_zilyana', 'corporeal_beast', 'crazy_archaeologist',
  'dagannoth_prime', 'dagannoth_rex', 'dagannoth_supreme', 'deranged_archaeologist', 'doom_of_mokhaiotl',
  'duke_sucellus', 'general_graardor', 'giant_mole', 'grotesque_guardians', 'hespori', 'kalphite_queen',
  'king_black_dragon', 'kraken', 'kreearra', 'kril_tsutsaroth', 'lunar_chests', 'mad_angel', 'maggot_king',
  'mimic', 'nex', 'nightmare', 'phosanis_nightmare', 'obor', 'phantom_muspah', 'sarachnis', 'scorpia',
  'scurrius', 'shellbane_gryphon', 'skotizo', 'sol_heredit', 'spindel', 'tempoross', 'the_gauntlet',
  'the_corrupted_gauntlet', 'the_hueycoatl', 'the_leviathan', 'the_royal_titans', 'the_whisperer',
  'theatre_of_blood', 'theatre_of_blood_hard_mode', 'thermonuclear_smoke_devil', 'tombs_of_amascut',
  'tombs_of_amascut_expert', 'tzkal_zuk', 'tztok_jad', 'vardorvis', 'venenatis', 'vetion', 'vorkath',
  'wintertodt', 'yama', 'zalcano', 'zulrah'
]

// Counter-based activities only (LMS, PvP Arena, Bounty Hunter and Soul Wars are left out on purpose)
export const ACTIVITY_METRICS = [
  'clue_scrolls_all', 'clue_scrolls_beginner', 'clue_scrolls_easy', 'clue_scrolls_medium',
  'clue_scrolls_hard', 'clue_scrolls_elite', 'clue_scrolls_master',
  'guardians_of_the_rift', 'colosseum_glory', 'collections_logged'
]

const NAME_OVERRIDES = {
  chambers_of_xeric: 'Chambers of Xeric',
  chambers_of_xeric_challenge_mode: 'Chambers of Xeric (CM)',
  theatre_of_blood: 'Theatre of Blood',
  theatre_of_blood_hard_mode: 'Theatre of Blood (HM)',
  tombs_of_amascut: 'Tombs of Amascut',
  tombs_of_amascut_expert: 'Tombs of Amascut (Expert)',
  kreearra: "Kree'Arra",
  kril_tsutsaroth: "K'ril Tsutsaroth",
  vetion: "Vet'ion",
  phosanis_nightmare: "Phosani's Nightmare",
  tzkal_zuk: 'TzKal-Zuk',
  tztok_jad: 'TzTok-Jad',
  doom_of_mokhaiotl: 'Doom of Mokhaiotl',
  sol_heredit: 'Sol Heredit',
  clue_scrolls_all: 'Clue Scrolls (all)',
  clue_scrolls_beginner: 'Clues: Beginner',
  clue_scrolls_easy: 'Clues: Easy',
  clue_scrolls_medium: 'Clues: Medium',
  clue_scrolls_hard: 'Clues: Hard',
  clue_scrolls_elite: 'Clues: Elite',
  clue_scrolls_master: 'Clues: Master',
  guardians_of_the_rift: 'Guardians of the Rift',
  collections_logged: 'Collection Log slots'
}

const SMALL_WORDS = ['of', 'the']

export function metricName(metric) {
  if (NAME_OVERRIDES[metric]) return NAME_OVERRIDES[metric]
  return metric
    .split('_')
    .map((word, index) => (index > 0 && SMALL_WORDS.includes(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ')
}

// Build one row per metric with totals per team and the top players.
// Rows with 0 gained are left out. sortByTotal = false keeps the order of `metrics`.
export function buildMetricRows(players, metrics, { sortByTotal = true, topPlayerCount = 5 } = {}) {
  const rows = metrics.map(metric => {
    const totals = {}
    let total = 0
    const contributors = []

    players.forEach(player => {
      const value = player.gains?.[metric] || 0
      if (value <= 0) return
      total += value
      if (player.teamName) {
        totals[player.teamName] = (totals[player.teamName] || 0) + value
      }
      contributors.push({ displayName: player.displayName, username: player.username, teamName: player.teamName, value })
    })

    contributors.sort((a, b) => b.value - a.value)

    return {
      metric,
      label: metricName(metric),
      total,
      totals,
      topPlayers: contributors.slice(0, topPlayerCount)
    }
  }).filter(row => row.total > 0)

  if (sortByTotal) {
    rows.sort((a, b) => b.total - a.total)
  }
  return rows
}
