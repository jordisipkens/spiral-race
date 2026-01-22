'use client'

import { useEffect } from 'react'

export default function TileModal({ tile, isCompleted, isLocked, onComplete, onClose, disabled }) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  if (!tile) return null

  const canComplete = !isCompleted && !isLocked && !disabled

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button style={styles.closeBtn} onClick={onClose}>×</button>

        {/* Status badge */}
        <div style={{
          ...styles.statusBadge,
          background: isCompleted ? 'rgba(46, 204, 113, 0.2)' :
                      isLocked ? 'rgba(149, 165, 166, 0.2)' :
                      'rgba(52, 152, 219, 0.2)',
          color: isCompleted ? '#2ecc71' :
                 isLocked ? '#95a5a6' :
                 '#3498db'
        }}>
          {isCompleted ? '✓ Completed' : isLocked ? '🔒 Locked' : '⚡ Active'}
        </div>

        {/* Title */}
        <h2 style={styles.title}>{tile.title}</h2>

        {/* Position info */}
        <p style={styles.position}>
          {tile.is_center ? '👑 Center Tile' : `Ring ${tile.ring} • Path ${tile.path + 1}`}
        </p>

        {/* Description */}
        {tile.description ? (
          <div style={styles.description}>
            <p>{tile.description}</p>
          </div>
        ) : (
          <div style={styles.noDescription}>
            <p>No description available</p>
          </div>
        )}

        {/* Points */}
        <div style={styles.pointsSection}>
          <span style={styles.pointsLabel}>Points</span>
          <span style={styles.pointsValue}>{tile.points}</span>
        </div>

        {/* Action buttons */}
        <div style={styles.actions}>
          {canComplete && (
            <button
              style={styles.completeBtn}
              onClick={() => {
                onComplete()
                onClose()
              }}
            >
              ✓ Mark as Complete
            </button>
          )}

          {isLocked && (
            <p style={styles.lockedMessage}>
              Complete the previous tile in this path to unlock
            </p>
          )}

          {disabled && !isCompleted && !isLocked && (
            <p style={styles.lockedMessage}>
              Board is locked - complete previous board first
            </p>
          )}

          <button style={styles.cancelBtn} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem'
  },
  modal: {
    background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
    borderRadius: '16px',
    padding: '2rem',
    maxWidth: '400px',
    width: '100%',
    position: 'relative',
    border: '1px solid rgba(255, 215, 0, 0.2)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
  },
  closeBtn: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
    lineHeight: 1
  },
  statusBadge: {
    display: 'inline-block',
    padding: '0.35rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    marginBottom: '1rem'
  },
  title: {
    color: '#ffd700',
    fontSize: '1.5rem',
    margin: '0 0 0.5rem 0',
    paddingRight: '2rem'
  },
  position: {
    color: '#888',
    fontSize: '0.9rem',
    margin: '0 0 1.5rem 0'
  },
  description: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1.5rem',
    borderLeft: '3px solid #ffd700'
  },
  noDescription: {
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1.5rem',
    color: '#666',
    fontStyle: 'italic'
  },
  pointsSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255, 215, 0, 0.1)',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1.5rem'
  },
  pointsLabel: {
    color: '#888',
    fontSize: '0.9rem'
  },
  pointsValue: {
    color: '#ffd700',
    fontSize: '1.5rem',
    fontWeight: 'bold'
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  completeBtn: {
    width: '100%',
    padding: '0.875rem 1.5rem',
    background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 4px 15px rgba(46, 204, 113, 0.3)'
  },
  cancelBtn: {
    width: '100%',
    padding: '0.75rem 1.5rem',
    background: 'transparent',
    border: '1px solid #444',
    borderRadius: '8px',
    color: '#888',
    fontSize: '0.9rem',
    cursor: 'pointer'
  },
  lockedMessage: {
    color: '#888',
    fontSize: '0.9rem',
    textAlign: 'center',
    padding: '0.5rem',
    margin: 0
  }
}
