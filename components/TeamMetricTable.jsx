'use client'

import { useState, Fragment } from 'react'

const formatCount = value => Math.round(value).toLocaleString('en-US')

// Metrics as rows, teams as columns. Click a row to show its top players.
// rows come from buildMetricRows() in lib/statsMetrics.js.
// teamNames empty (no team competition) or a single team -> only a "Total" column.
export default function TeamMetricTable({ rows, teamNames, emptyText }) {
  const [expanded, setExpanded] = useState(null)

  if (rows.length === 0) {
    return <p style={{ color: '#888', textAlign: 'center' }}>{emptyText}</p>
  }

  const showTeams = teamNames.length > 1
  const columnCount = 2 + (showTeams ? teamNames.length : 0)

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{ ...styles.th, textAlign: 'left' }}>Name</th>
            {showTeams && teamNames.map(name => (
              <th key={name} style={styles.th}>{name}</th>
            ))}
            <th style={styles.th}>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const isExpanded = expanded === row.metric
            const best = Math.max(...teamNames.map(name => row.totals[name] || 0))

            return (
              <Fragment key={row.metric}>
                <tr
                  onClick={() => setExpanded(isExpanded ? null : row.metric)}
                  style={{ cursor: 'pointer', background: index % 2 ? 'rgba(255,255,255,0.03)' : 'transparent' }}
                >
                  <td style={{ ...styles.td, textAlign: 'left', color: '#fff' }}>
                    <span style={{ color: '#888', marginRight: '0.4rem' }}>{isExpanded ? '▾' : '▸'}</span>
                    {row.label}
                  </td>
                  {showTeams && teamNames.map(name => {
                    const value = row.totals[name] || 0
                    const isBest = value > 0 && value === best
                    return (
                      <td
                        key={name}
                        style={{
                          ...styles.td,
                          color: isBest ? '#ffd700' : value > 0 ? '#ddd' : '#555',
                          fontWeight: isBest ? 'bold' : 'normal'
                        }}
                      >
                        {isBest && '👑 '}{formatCount(value)}
                      </td>
                    )
                  })}
                  <td style={{ ...styles.td, color: '#fff', fontWeight: 'bold' }}>{formatCount(row.total)}</td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={columnCount} style={{ ...styles.td, textAlign: 'left', background: 'rgba(255, 215, 0, 0.05)' }}>
                      <div style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '0.35rem' }}>Top players</div>
                      {row.topPlayers.map((player, i) => (
                        <div key={player.username} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.15rem 0' }}>
                          <span style={{ color: '#ddd' }}>
                            <span style={{ color: '#888', marginRight: '0.35rem' }}>{i + 1}.</span>
                            {player.displayName}
                            {showTeams && player.teamName && (
                              <span style={{ color: '#888', marginLeft: '0.4rem' }}>({player.teamName})</span>
                            )}
                          </span>
                          <span style={{ color: '#ffd700', fontWeight: 'bold' }}>{formatCount(player.value)}</span>
                        </div>
                      ))}
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const styles = {
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.9rem'
  },
  th: {
    padding: '0.6rem 0.75rem',
    color: '#ffd700',
    textAlign: 'right',
    borderBottom: '1px solid rgba(255, 215, 0, 0.3)',
    whiteSpace: 'nowrap'
  },
  td: {
    padding: '0.5rem 0.75rem',
    textAlign: 'right',
    color: '#ddd',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    whiteSpace: 'nowrap'
  }
}
