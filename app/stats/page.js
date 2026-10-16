'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import EhbBarChart, { formatEhb } from '../../components/EhbBarChart'
import EhbTable from '../../components/EhbTable'
import TeamMetricTable from '../../components/TeamMetricTable'
import { BOSS_METRICS, ACTIVITY_METRICS, buildMetricRows } from '../../lib/statsMetrics'

const ALL = '__all__'
const VIEWS = [
  { id: 'ehb', label: '⏱️ EHB' },
  { id: 'bosses', label: '💀 Bosses' },
  { id: 'activities', label: '📜 Activities' }
]

function formatPeriod(competition) {
  const options = { day: 'numeric', month: 'short', year: 'numeric' }
  const start = new Date(competition.startsAt).toLocaleDateString('en-GB', options)
  const end = new Date(competition.endsAt).toLocaleDateString('en-GB', options)
  return `${start} – ${end}`
}

function StatsContent() {
  const searchParams = useSearchParams()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTeam, setActiveTeam] = useState(searchParams.get('team') || ALL)
  const [activeView, setActiveView] = useState('ehb')

  useEffect(() => {
    loadStats()
  }, [])

  // Auto-refresh every 3 minutes (reads from our cache, WOM is refreshed at most every 15 min)
  useEffect(() => {
    const interval = setInterval(() => {
      loadStats()
    }, 3 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  async function loadStats() {
    try {
      const res = await fetch('/api/stats')
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to load stats')
      } else {
        setStats(data)
        setError(null)
      }
    } catch (err) {
      setError('Failed to load stats')
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: '#ffd700', fontSize: '1.5rem' }}>Loading...</p>
      </main>
    )
  }

  if (!stats) {
    return (
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
        <p style={{ color: '#aaa', fontSize: '1.1rem', textAlign: 'center' }}>
          {error === 'No competition configured'
            ? 'No WiseOldMan competition has been set up yet.'
            : error}
        </p>
      </main>
    )
  }

  const { competition, teams, players } = stats
  // Fall back to "All players" when the team from the URL doesn't exist in the competition
  const selectedTeam = teams.some(team => team.name === activeTeam) ? activeTeam : ALL
  const visiblePlayers = selectedTeam === ALL
    ? players
    : players.filter(player => player.teamName === selectedTeam)
  const totalGained = visiblePlayers.reduce((sum, player) => sum + player.gained, 0)
  // Team columns only in the "All players" view of a team competition
  const teamNames = selectedTeam === ALL ? teams.map(team => team.name) : []

  return (
    <main style={{ minHeight: '100vh', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: '2.5rem',
          marginBottom: '0.5rem',
          background: 'linear-gradient(90deg, #ffd700, #ff8c00)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Event Stats
        </h1>
        <p style={{ color: '#a0a0a0', marginBottom: '0.25rem' }}>{competition.title}</p>
        <p style={{ color: '#666', fontSize: '0.85rem' }}>
          {formatPeriod(competition)} · Last updated{' '}
          {new Date(stats.fetchedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          {stats.stale && ' (WiseOldMan unreachable, showing cached data)'}
        </p>
      </header>

      {/* View tabs */}
      <div style={styles.filters}>
        {VIEWS.map(view => {
          const isActive = activeView === view.id
          return (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              style={{
                ...styles.viewBtn,
                background: isActive ? 'linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)' : 'rgba(255, 215, 0, 0.1)',
                color: isActive ? '#1a1a2e' : '#ffd700'
              }}
            >
              {view.label}
            </button>
          )
        })}
      </div>

      {/* Team filter */}
      {teams.length > 0 && (
        <div style={styles.filters}>
          {[{ name: ALL, label: 'All players', totalGained: players.reduce((s, p) => s + p.gained, 0) },
            ...teams.map(team => ({ ...team, label: team.name }))
          ].map(team => {
            const isActive = selectedTeam === team.name
            return (
              <button
                key={team.name}
                onClick={() => setActiveTeam(team.name)}
                style={{
                  ...styles.filterBtn,
                  border: isActive ? '3px solid #ffd700' : '2px solid transparent',
                  transform: isActive ? 'translateY(-2px)' : 'none',
                  boxShadow: isActive ? '0 6px 12px rgba(255,215,0,0.3)' : '0 4px 8px rgba(0,0,0,0.3)'
                }}
              >
                <span>{team.label}</span>
                {activeView === 'ehb' && (
                  <span style={{ fontSize: '0.8rem', color: '#ffd700' }}>{formatEhb(team.totalGained)} EHB</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Bosses */}
      {activeView === 'bosses' && (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Boss kills during the event</h2>
          <TeamMetricTable
            rows={buildMetricRows(visiblePlayers, BOSS_METRICS)}
            teamNames={teamNames}
            emptyText="No boss kills yet"
          />
        </section>
      )}

      {/* Activities */}
      {activeView === 'activities' && (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Activities during the event</h2>
          <TeamMetricTable
            rows={buildMetricRows(visiblePlayers, ACTIVITY_METRICS, { sortByTotal: false })}
            teamNames={teamNames}
            emptyText="No activity gains yet"
          />
        </section>
      )}

      {/* Team totals (only in "All players" view) */}
      {activeView === 'ehb' && selectedTeam === ALL && teams.length > 0 && (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>EHB gained per team</h2>
          <EhbBarChart
            items={teams.map(team => ({
              label: team.name,
              value: team.totalGained,
              sublabel: `${team.playerCount} players`
            }))}
          />
        </section>
      )}

      {/* Player chart */}
      {activeView === 'ehb' && (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>
            EHB gained per player
            <span style={{ color: '#888', fontSize: '0.9rem', fontWeight: 'normal', marginLeft: '0.5rem' }}>
              ({visiblePlayers.length} players · {formatEhb(totalGained)} total)
            </span>
          </h2>
          <EhbBarChart
            items={visiblePlayers.map(player => ({ label: player.displayName, value: player.gained }))}
          />
        </section>
      )}

      {/* Player table */}
      {activeView === 'ehb' && (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>All participants</h2>
          <EhbTable players={visiblePlayers} showTeam={selectedTeam === ALL && teams.length > 0} />
        </section>
      )}
    </main>
  )
}

export default function StatsPage() {
  // useSearchParams requires a Suspense boundary in the App Router
  return (
    <Suspense fallback={null}>
      <StatsContent />
    </Suspense>
  )
}

const styles = {
  filters: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap'
  },
  filterBtn: {
    background: 'linear-gradient(135deg, #2c3e50 0%, #1a252f 100%)',
    color: 'white',
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    fontWeight: 'bold',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    minWidth: '140px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem'
  },
  viewBtn: {
    border: '2px solid rgba(255, 215, 0, 0.5)',
    padding: '0.6rem 1.25rem',
    fontSize: '1rem',
    fontWeight: 'bold',
    borderRadius: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  card: {
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 215, 0, 0.2)',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem'
  },
  cardTitle: {
    color: '#fff',
    fontSize: '1.2rem',
    marginBottom: '1rem'
  }
}
