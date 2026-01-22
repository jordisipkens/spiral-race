'use client'

const BOARD_CONFIG = {
  easy: {
    label: 'Easy Spiral',
    icon: '⚡',
    color: '#3498db',
    gradient: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)'
  },
  medium: {
    label: 'Medium Spiral',
    icon: '⚔️',
    color: '#f39c12',
    gradient: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)'
  },
  hard: {
    label: 'Hard Spiral',
    icon: '💀',
    color: '#c0392b',
    gradient: 'linear-gradient(135deg, #c0392b 0%, #8e44ad 100%)'
  }
}

export default function BoardTabs({
  activeBoard,
  onBoardChange,
  unlockedBoards = ['easy']
}) {
  return (
    <div style={{
      display: 'flex',
      gap: '0.75rem',
      justifyContent: 'center',
      marginBottom: '2rem',
      flexWrap: 'wrap'
    }}>
      {Object.entries(BOARD_CONFIG).map(([boardType, config]) => {
        const isUnlocked = unlockedBoards.includes(boardType)
        const isActive = activeBoard === boardType

        return (
          <button
            key={boardType}
            onClick={() => onBoardChange(boardType)}
            style={{
              background: config.gradient,
              border: isActive ? '3px solid #ffd700' : '2px solid transparent',
              color: 'white',
              padding: '1rem 2rem',
              fontSize: '1rem',
              fontWeight: 'bold',
              borderRadius: '8px',
              cursor: 'pointer',
              opacity: isUnlocked ? 1 : 0.6,
              transition: 'all 0.3s ease',
              transform: isActive ? 'translateY(-4px)' : 'none',
              boxShadow: isActive
                ? '0 8px 16px rgba(255,215,0,0.4)'
                : '0 4px 8px rgba(0,0,0,0.3)',
              minWidth: '160px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <span>{config.icon}</span>
            <span>{config.label}</span>
            {!isUnlocked && <span style={{ marginLeft: '0.5rem' }}>🔒</span>}
          </button>
        )
      })}
    </div>
  )
}
