'use client'

export function formatEhb(value) {
  if (value === null || value === undefined) return '–'
  return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

// Horizontal bar chart. items: [{ label, value, sublabel? }]
export default function EhbBarChart({ items, maxItems }) {
  const visibleItems = maxItems ? items.slice(0, maxItems) : items
  const maxValue = Math.max(...visibleItems.map(item => item.value), 0)

  if (visibleItems.length === 0) {
    return <p style={{ color: '#888', textAlign: 'center' }}>No data yet</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {visibleItems.map((item, index) => {
        const width = maxValue > 0 ? (item.value / maxValue) * 100 : 0

        return (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '140px',
              flexShrink: 0,
              textAlign: 'right',
              color: '#ddd',
              fontSize: '0.9rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }} title={item.label}>
              <span style={{ color: '#888', marginRight: '0.35rem' }}>{index + 1}.</span>
              {item.label}
              {item.sublabel && (
                <div style={{ color: '#888', fontSize: '0.75rem' }}>{item.sublabel}</div>
              )}
            </div>
            <div style={{
              flex: 1,
              minWidth: 0,
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '6px',
              height: '26px',
              position: 'relative'
            }}>
              <div style={{
                width: `${Math.max(width, 1)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #ffd700, #ff8c00)',
                borderRadius: '6px',
                transition: 'width 0.5s ease'
              }} />
              <span style={{
                position: 'absolute',
                right: '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)'
              }}>
                {formatEhb(item.value)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
