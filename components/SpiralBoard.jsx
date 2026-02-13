'use client'

import { useState, useMemo } from 'react'
import TileModal from './TileModal'

const CENTER_X = 375
const CENTER_Y = 375
const NUM_RINGS = 5
const OUTER_RADIUS = 350
const INNER_RADIUS = 80
const RING_THICKNESS = (OUTER_RADIUS - INNER_RADIUS) / NUM_RINGS

const COLOR_SCHEMES = {
  easy: {
    locked: ['#34495e', '#2c3e50'],
    active: ['#3498db', '#2980b9'],
    completed: ['#2ecc71', '#27ae60']
  },
  medium: {
    locked: ['#4a4a4a', '#3a3a3a'],
    active: ['#f39c12', '#e67e22'],
    completed: ['#2ecc71', '#27ae60']
  },
  hard: {
    locked: ['#3d3d3d', '#2d2d2d'],
    active: ['#c0392b', '#8e44ad'],
    completed: ['#2ecc71', '#27ae60']
  }
}

const tableHeaderStyle = {
  padding: '0.5rem',
  textAlign: 'left',
  color: '#888',
  fontWeight: 'normal',
  fontSize: '0.85rem',
  borderBottom: '1px solid rgba(255,255,255,0.2)'
}

const tableCellStyle = {
  padding: '0.75rem 0.5rem',
  fontSize: '0.95rem'
}

function createSegmentPath(innerRadius, outerRadius, startAngle, endAngle) {
  const startRad = (startAngle - 90) * Math.PI / 180
  const endRad = (endAngle - 90) * Math.PI / 180

  const x1 = CENTER_X + innerRadius * Math.cos(startRad)
  const y1 = CENTER_Y + innerRadius * Math.sin(startRad)
  const x2 = CENTER_X + outerRadius * Math.cos(startRad)
  const y2 = CENTER_Y + outerRadius * Math.sin(startRad)
  const x3 = CENTER_X + outerRadius * Math.cos(endRad)
  const y3 = CENTER_Y + outerRadius * Math.sin(endRad)
  const x4 = CENTER_X + innerRadius * Math.cos(endRad)
  const y4 = CENTER_Y + innerRadius * Math.sin(endRad)

  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0

  return `
    M ${x1} ${y1}
    L ${x2} ${y2}
    A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x3} ${y3}
    L ${x4} ${y4}
    A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1}
    Z
  `
}

function getLabelPosition(innerRadius, outerRadius, startAngle, endAngle) {
  const midAngle = (startAngle + endAngle) / 2
  const midRadius = (innerRadius + outerRadius) / 2
  const midRad = (midAngle - 90) * Math.PI / 180

  return {
    x: CENTER_X + midRadius * Math.cos(midRad),
    y: CENTER_Y + midRadius * Math.sin(midRad)
  }
}

function Segment({ ring, path, boardType, progress, onClick, onShowDetails, tile, disabled, hasPendingSubmission, approvedCount = 0 }) {
  const ringOuter = OUTER_RADIUS - ((ring - 1) * RING_THICKNESS)
  const ringInner = ringOuter - RING_THICKNESS
  const rotationOffset = (ring - 1) * 18
  const startAngle = rotationOffset + (path * 120)
  const endAngle = startAngle + 120

  // Ring-based progression: all tiles in a ring must be complete before next ring unlocks
  const minProgress = Math.min(progress[0], progress[1], progress[2])
  const activeRing = minProgress + 1

  let state = 'locked'
  if (ring <= progress[path]) {
    // This specific tile is completed
    state = 'completed'
  } else if (ring === activeRing) {
    // All tiles in the active ring are available
    state = 'active'
  }

  const gradientId = `grad-${boardType}-${state}`
  const labelPos = getLabelPosition(ringInner, ringOuter, startAngle, endAngle)

  const handleClick = () => {
    // Only show modal for active or completed tiles, not locked
    if (tile && state !== 'locked') {
      onShowDetails(tile, state, path, ring)
    }
  }

  return (
    <g>
      <path
        d={createSegmentPath(ringInner, ringOuter, startAngle, endAngle)}
        fill={`url(#${gradientId})`}
        stroke={hasPendingSubmission ? '#f1c40f' : state === 'active' && !disabled ? '#ffd700' : '#1a1a2e'}
        strokeWidth={hasPendingSubmission ? 4 : state === 'active' && !disabled ? 4 : 2}
        style={{
          cursor: tile && state !== 'locked' ? 'pointer' : 'default',
          opacity: state === 'locked' ? 0.25 : state === 'completed' ? 0.4 : disabled ? 0.5 : 1,
          transition: 'all 0.3s ease'
        }}
        onClick={handleClick}
      />
      <text
        x={labelPos.x}
        y={labelPos.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={state === 'locked' ? '#666' : '#fff'}
        fontSize={state === 'locked' ? '18' : '12'}
        fontWeight="bold"
        style={{
          pointerEvents: 'none',
          opacity: state === 'locked' ? 0.5 : state === 'completed' ? 0.5 : disabled ? 0.6 : 1,
          textShadow: '1px 1px 3px rgba(0,0,0,0.9)'
        }}
      >
        {state === 'locked' ? '🔒' : (tile?.title || `R${ring}P${path + 1}`)}
      </text>
      {/* Status badge for tiles */}
      {state !== 'completed' && state !== 'locked' && tile && (
        <g>
          {tile.is_multi_item ? (
            /* Multi-item badge: show X/Y */
            <>
              <rect
                x={labelPos.x - 18}
                y={labelPos.y + 8}
                width="36"
                height="14"
                rx="7"
                fill="rgba(155, 89, 182, 0.9)"
                style={{ pointerEvents: 'none' }}
              />
              <text
                x={labelPos.x}
                y={labelPos.y + 16}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize="9"
                fontWeight="bold"
                style={{ pointerEvents: 'none' }}
              >
                {approvedCount}/{tile.required_submissions}
              </text>
            </>
          ) : hasPendingSubmission ? (
            /* Single-item with pending: show "in progress" */
            <>
              <rect
                x={labelPos.x - 28}
                y={labelPos.y + 8}
                width="56"
                height="14"
                rx="7"
                fill="rgba(241, 196, 15, 0.9)"
                style={{ pointerEvents: 'none' }}
              />
              <text
                x={labelPos.x}
                y={labelPos.y + 16}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#000"
                fontSize="8"
                fontWeight="bold"
                style={{ pointerEvents: 'none' }}
              >
                in progress
              </text>
            </>
          ) : null}
        </g>
      )}
    </g>
  )
}

function CenterTile({ boardType, progress, centerCompleted, onClick, onShowDetails, centerTile, disabled }) {
  const allPathsComplete = progress.every(p => p >= NUM_RINGS)

  let state = 'locked'
  if (centerCompleted) {
    state = 'completed'
  } else if (allPathsComplete) {
    state = 'active'
  }

  const gradientId = `grad-${boardType}-${state}`

  const handleClick = () => {
    if (centerTile && state !== 'locked') {
      onShowDetails(centerTile, state, null, null)
    }
  }

  return (
    <g>
      <circle
        cx={CENTER_X}
        cy={CENTER_Y}
        r={40}
        fill={`url(#${gradientId})`}
        stroke={state === 'active' && !disabled ? '#ffd700' : '#1a1a2e'}
        strokeWidth={state === 'active' && !disabled ? 5 : 4}
        style={{
          cursor: centerTile && state !== 'locked' ? 'pointer' : 'default',
          opacity: state === 'locked' ? 0.25 : disabled ? 0.5 : 1,
          transition: 'all 0.3s ease'
        }}
        onClick={handleClick}
      />
      <text
        x={CENTER_X}
        y={CENTER_Y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="24"
        style={{ pointerEvents: 'none', opacity: disabled ? 0.6 : 1 }}
      >
        👑
      </text>
    </g>
  )
}

function Gradients({ boardType }) {
  const colors = COLOR_SCHEMES[boardType]

  return (
    <defs>
      <linearGradient id={`grad-${boardType}-locked`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={colors.locked[0]} />
        <stop offset="100%" stopColor={colors.locked[1]} />
      </linearGradient>
      <linearGradient id={`grad-${boardType}-active`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={colors.active[0]} />
        <stop offset="100%" stopColor={colors.active[1]} />
      </linearGradient>
      <linearGradient id={`grad-${boardType}-completed`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={colors.completed[0]} />
        <stop offset="100%" stopColor={colors.completed[1]} />
      </linearGradient>
    </defs>
  )
}

export default function SpiralBoard({
  boardType = 'easy',
  tiles = [],
  initialProgress = [0, 0, 0],
  initialCenterCompleted = false,
  onTileComplete,
  onCenterComplete,
  disabled = false,
  teamId,
  submissions = [],
  onSubmissionComplete
}) {
  const [progress, setProgress] = useState(initialProgress)
  const [centerCompleted, setCenterCompleted] = useState(initialCenterCompleted)
  const [modalData, setModalData] = useState(null)

  // Create a map of tiles by position
  const tileMap = useMemo(() => {
    const map = {}
    tiles.forEach(tile => {
      if (!tile.is_center) {
        map[`${tile.ring}-${tile.path}`] = tile
      }
    })
    return map
  }, [tiles])

  // Get center tile
  const centerTile = useMemo(() => tiles.find(t => t.is_center), [tiles])

  const handleShowDetails = (tile, state, path, ring) => {
    setModalData({
      tile,
      isCompleted: state === 'completed',
      isLocked: state === 'locked',
      path,
      ring,
      isCenter: tile.is_center
    })
  }

  const handleModalComplete = () => {
    if (!modalData) return

    if (modalData.isCenter) {
      // Complete center tile
      setCenterCompleted(true)
      if (onCenterComplete) {
        onCenterComplete(modalData.tile)
      }
    } else {
      // Complete regular tile
      const newProgress = [...progress]
      newProgress[modalData.path] = modalData.ring
      setProgress(newProgress)

      if (onTileComplete) {
        onTileComplete(modalData.tile, modalData.path, modalData.ring)
      }
    }
  }

  const handleSegmentClick = (path, ring) => {
    if (disabled) return

    const newProgress = [...progress]
    newProgress[path] = ring
    setProgress(newProgress)

    if (onTileComplete) {
      const tile = tileMap[`${ring}-${path}`]
      onTileComplete(tile, path, ring)
    }
  }

  const handleCenterClick = () => {
    if (disabled) return

    setCenterCompleted(true)
    if (onCenterComplete) {
      const cTile = tiles.find(t => t.is_center)
      onCenterComplete(cTile)
    }
  }

  // Generate all segments
  const segments = []
  for (let ring = 1; ring <= NUM_RINGS; ring++) {
    for (let path = 0; path < 3; path++) {
      const tile = tileMap[`${ring}-${path}`]
      const hasPendingSubmission = tile && submissions.some(
        s => s.tile_id === tile.id && s.status === 'pending'
      )
      const approvedCount = tile ? submissions.filter(
        s => s.tile_id === tile.id && s.status === 'approved'
      ).length : 0
      segments.push(
        <Segment
          key={`${ring}-${path}`}
          ring={ring}
          path={path}
          boardType={boardType}
          progress={progress}
          onClick={handleSegmentClick}
          onShowDetails={handleShowDetails}
          tile={tile}
          disabled={disabled}
          hasPendingSubmission={hasPendingSubmission}
          approvedCount={approvedCount}
        />
      )
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: '750px', margin: '0 auto', position: 'relative' }}>
      {/* Tile Modal */}
      {modalData && (
        <TileModal
          tile={modalData.tile}
          isCompleted={modalData.isCompleted}
          isLocked={modalData.isLocked}
          onClose={(shouldRefresh) => {
            setModalData(null)
            if (shouldRefresh && onSubmissionComplete) {
              onSubmissionComplete()
            }
          }}
          disabled={disabled}
          onRefresh={onSubmissionComplete}
          teamId={teamId}
          submissions={submissions}
        />
      )}

      <svg
        viewBox="0 0 750 750"
        style={{
          width: '100%',
          height: 'auto',
          filter: disabled
            ? 'drop-shadow(0 0 10px rgba(100,100,100,0.2)) grayscale(0.3)'
            : 'drop-shadow(0 0 20px rgba(255,215,0,0.2))'
        }}
      >
        <Gradients boardType={boardType} />
        {segments}
        <CenterTile
          boardType={boardType}
          progress={progress}
          centerCompleted={centerCompleted}
          onClick={handleCenterClick}
          onShowDetails={handleShowDetails}
          centerTile={centerTile}
          disabled={disabled}
        />
      </svg>

      {/* Progress indicator */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '2rem',
        marginTop: '1.5rem',
        opacity: disabled ? 0.5 : 1
      }}>
        {[0, 1, 2].map(path => (
          <div key={path} style={{ textAlign: 'center' }}>
            <div style={{
              color: ['#3498db', '#e67e22', '#c0392b'][path],
              fontWeight: 'bold',
              marginBottom: '0.25rem'
            }}>
              Path {path + 1}
            </div>
            <div style={{ color: '#ffd700', fontSize: '1.25rem' }}>
              {progress[path]}/{NUM_RINGS}
            </div>
          </div>
        ))}
      </div>

      {/* Active Tasks Table */}
      <div style={{
        marginTop: '2rem',
        background: 'linear-gradient(135deg, rgba(26,26,46,0.9) 0%, rgba(22,33,62,0.9) 100%)',
        borderRadius: '12px',
        padding: '1.5rem',
        border: '2px solid rgba(255,215,0,0.3)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
        opacity: disabled ? 0.5 : 1,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow effect */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle at center, rgba(255,215,0,0.05) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />

        <h3 style={{
          color: '#ffd700',
          margin: '0 0 1.25rem 0',
          fontSize: '1.1rem',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          textShadow: '0 0 10px rgba(255,215,0,0.5)',
          position: 'relative'
        }}>
          ⚔️ Active Tasks ⚔️
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative' }}>
          {[0, 1, 2].map(path => {
            // Ring-based: active ring is determined by minimum progress across all paths
            const minProgress = Math.min(progress[0], progress[1], progress[2])
            const activeRing = minProgress + 1
            const isAllComplete = minProgress >= NUM_RINGS
            const isThisPathComplete = progress[path] >= activeRing
            const activeTile = !isAllComplete ? tileMap[`${activeRing}-${path}`] : null
            const pathColors = ['#3498db', '#e67e22', '#c0392b']

            // Multi-item info for this tile
            const isMultiItem = activeTile?.is_multi_item || false
            const requiredSubmissions = activeTile?.required_submissions || 1
            const tileApprovedCount = activeTile ? submissions.filter(
              s => s.tile_id === activeTile.id && s.status === 'approved'
            ).length : 0
            const hasPending = activeTile ? submissions.some(
              s => s.tile_id === activeTile.id && s.status === 'pending'
            ) : false
            const pathGradients = [
              'linear-gradient(90deg, rgba(52,152,219,0.2) 0%, transparent 100%)',
              'linear-gradient(90deg, rgba(230,126,34,0.2) 0%, transparent 100%)',
              'linear-gradient(90deg, rgba(192,57,43,0.2) 0%, transparent 100%)'
            ]
            const pathIcons = ['⚡', '⚔️', '💀']

            // Determine the tile state for display
            const tileState = isAllComplete || isThisPathComplete ? 'completed' : 'active'

            const handleRowClick = () => {
              if (activeTile && !disabled && !isThisPathComplete) {
                handleShowDetails(activeTile, tileState, path, activeRing)
              }
            }

            return (
              <div
                key={path}
                onClick={handleRowClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.875rem 1rem',
                  background: isAllComplete || isThisPathComplete
                    ? 'linear-gradient(90deg, rgba(46,204,113,0.15) 0%, transparent 100%)'
                    : pathGradients[path],
                  borderRadius: '8px',
                  border: `1px solid ${isAllComplete || isThisPathComplete ? 'rgba(46,204,113,0.3)' : `${pathColors[path]}33`}`,
                  transition: 'all 0.3s ease',
                  boxShadow: isAllComplete || isThisPathComplete
                    ? '0 0 15px rgba(46,204,113,0.2)'
                    : `0 0 15px ${pathColors[path]}22`,
                  cursor: activeTile && !disabled && !isThisPathComplete ? 'pointer' : 'default'
                }}
              >
                {/* Path indicator */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: isAllComplete || isThisPathComplete
                    ? 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)'
                    : `linear-gradient(135deg, ${pathColors[path]} 0%, ${pathColors[path]}99 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  boxShadow: isAllComplete || isThisPathComplete
                    ? '0 0 20px rgba(46,204,113,0.5)'
                    : `0 0 20px ${pathColors[path]}44`,
                  flexShrink: 0
                }}>
                  {isAllComplete || isThisPathComplete ? '✓' : pathIcons[path]}
                </div>

                {/* Task info */}
                <div style={{ flex: 1, marginLeft: '1rem' }}>
                  <div style={{
                    color: isAllComplete || isThisPathComplete ? '#2ecc71' : pathColors[path],
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginBottom: '0.25rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    Path {path + 1} {!isAllComplete && `• Ring ${activeRing}`}
                    {!isAllComplete && !isThisPathComplete && (
                      isMultiItem ? (
                        <span style={{
                          background: '#9b59b6',
                          color: 'white',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '8px',
                          fontSize: '0.65rem',
                          textTransform: 'none',
                          letterSpacing: '0'
                        }}>
                          {tileApprovedCount}/{requiredSubmissions}
                        </span>
                      ) : hasPending ? (
                        <span style={{
                          background: '#f1c40f',
                          color: '#000',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '8px',
                          fontSize: '0.65rem',
                          textTransform: 'none',
                          letterSpacing: '0'
                        }}>
                          in progress
                        </span>
                      ) : null
                    )}
                  </div>
                  <div style={{
                    color: isAllComplete || isThisPathComplete ? '#2ecc71' : '#fff',
                    fontSize: '1rem',
                    fontWeight: isAllComplete || isThisPathComplete ? 'normal' : 'bold'
                  }}>
                    {isAllComplete ? (
                      'All Complete!'
                    ) : isThisPathComplete ? (
                      'Done - waiting for other paths'
                    ) : activeTile ? (
                      activeTile.title
                    ) : (
                      `Ring ${activeRing} - Path ${path + 1}`
                    )}
                  </div>
                </div>

                {/* Points */}
                {!isAllComplete && !isThisPathComplete && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(255,140,0,0.2) 100%)',
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,215,0,0.3)',
                    flexShrink: 0
                  }}>
                    <span style={{
                      color: '#ffd700',
                      fontWeight: 'bold',
                      fontSize: '0.95rem',
                      textShadow: '0 0 10px rgba(255,215,0,0.5)'
                    }}>
                      {activeTile ? activeTile.points : '—'} pts
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
