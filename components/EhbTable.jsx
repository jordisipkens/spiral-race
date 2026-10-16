'use client'

import { formatEhb } from './EhbBarChart'

function formatDate(value) {
  if (!value) return '–'
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Player table sorted by EHB gained (sorting happens in lib/wiseoldman.js)
export default function EhbTable({ players, showTeam }) {
  if (players.length === 0) {
    return <p style={{ color: '#888', textAlign: 'center' }}>No players found</p>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>#</th>
            <th style={{ ...styles.th, textAlign: 'left' }}>Player</th>
            {showTeam && <th style={{ ...styles.th, textAlign: 'left' }}>Team</th>}
            <th style={styles.th}>Start</th>
            <th style={styles.th}>End</th>
            <th style={styles.th}>Gained</th>
            <th style={styles.th}>Last updated</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, index) => (
            <tr key={player.username} style={{ background: index % 2 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
              <td style={{ ...styles.td, color: '#888' }}>{index + 1}</td>
              <td style={{ ...styles.td, textAlign: 'left' }}>
                <a
                  href={`https://wiseoldman.net/players/${encodeURIComponent(player.username)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#fff', textDecoration: 'none' }}
                >
                  {player.displayName}
                </a>
              </td>
              {showTeam && <td style={{ ...styles.td, textAlign: 'left', color: '#aaa' }}>{player.teamName || '–'}</td>}
              <td style={styles.td}>{formatEhb(player.start)}</td>
              <td style={styles.td}>{formatEhb(player.end)}</td>
              <td style={{ ...styles.td, color: '#ffd700', fontWeight: 'bold' }}>{formatEhb(player.gained)}</td>
              <td style={{ ...styles.td, color: '#888', fontSize: '0.8rem' }}>{formatDate(player.updatedAt)}</td>
            </tr>
          ))}
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
