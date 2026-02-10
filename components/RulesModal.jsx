'use client'

export default function RulesModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(4px)'
      }} />

      {/* Modal */}
      <div
        style={{
          position: 'relative',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '16px',
          border: '2px solid rgba(255, 215, 0, 0.3)',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '85vh',
          overflow: 'hidden',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid rgba(255, 215, 0, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.5rem',
            background: 'linear-gradient(90deg, #ffd700, #ff8c00)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Game Rules
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.25rem',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '1.5rem',
          overflowY: 'auto',
          maxHeight: 'calc(85vh - 80px)'
        }}>
          {/* Board System */}
          <Section title="Board System">
            <p>All three boards are available from the start:</p>
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
              <li><span style={{ color: '#3498db' }}>Easy</span> - Simple challenges (10 pts each)</li>
              <li><span style={{ color: '#f39c12' }}>Medium</span> - Moderate challenges (25 pts each)</li>
              <li><span style={{ color: '#c0392b' }}>Hard</span> - Difficult challenges (50 pts each)</li>
            </ul>
            <p style={{ marginTop: '0.75rem' }}>
              Each board has <strong>5 rings</strong> with <strong>3 tiles per ring</strong>, plus a center tile.
            </p>
          </Section>

          {/* Progression */}
          <Section title="Progression Rules">
            <Highlight>
              All 3 tiles in a ring must be completed before the next ring unlocks.
            </Highlight>
            <p style={{ marginTop: '0.75rem' }}>
              You cannot skip ahead - complete every tile in Ring 1 before Ring 2 becomes available.
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              Boards are independent - you can be on Ring 3 on Easy while still on Ring 1 on Medium.
            </p>
          </Section>

          {/* Submitting Evidence */}
          <Section title="Submitting Evidence">
            <ol style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
              <li>Click on an <strong>active tile</strong> (gold border)</li>
              <li>Upload a screenshot as proof</li>
              <li>Wait for admin approval</li>
              <li>Once approved, the tile is marked complete</li>
            </ol>
            <p style={{ marginTop: '0.75rem', color: '#888', fontSize: '0.9rem' }}>
              If rejected, you'll see the reason and can submit new evidence.
            </p>
          </Section>

          {/* Visual Guide */}
          <Section title="Visual Guide">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <StatusItem color="rgba(255,255,255,0.25)" label="Locked" description="Ring not yet available" />
              <StatusItem color="#ffd700" label="Active" description="Ready to complete" glow />
              <StatusItem color="#f1c40f" label="Pending" description="Awaiting admin review" icon="⏳" />
              <StatusItem color="rgba(255,255,255,0.4)" label="Completed" description="Done!" />
            </div>
          </Section>

          {/* Tips */}
          <Section title="Tips">
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
              <li>Work on multiple boards simultaneously with your team</li>
              <li>Coordinate who does which tiles</li>
              <li>Submit clear screenshots with visible proof</li>
              <li>The page auto-refreshes every 3 minutes</li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h3 style={{
        color: '#ffd700',
        fontSize: '1rem',
        marginBottom: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '1px'
      }}>
        {title}
      </h3>
      <div style={{ color: '#ccc', lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  )
}

function Highlight({ children }) {
  return (
    <div style={{
      background: 'rgba(255, 215, 0, 0.1)',
      border: '1px solid rgba(255, 215, 0, 0.3)',
      borderRadius: '8px',
      padding: '0.75rem 1rem',
      color: '#ffd700',
      fontWeight: 'bold'
    }}>
      {children}
    </div>
  )
}

function StatusItem({ color, label, description, glow, icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{
        width: '24px',
        height: '24px',
        borderRadius: '4px',
        background: color,
        border: glow ? '2px solid #ffd700' : '1px solid rgba(255,255,255,0.2)',
        boxShadow: glow ? '0 0 10px rgba(255, 215, 0, 0.5)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.7rem'
      }}>
        {icon}
      </div>
      <div>
        <span style={{ color: '#fff', fontWeight: 'bold' }}>{label}</span>
        <span style={{ color: '#888', marginLeft: '0.5rem' }}>- {description}</span>
      </div>
    </div>
  )
}
