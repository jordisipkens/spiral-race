'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import SpiralBoard from '../../../components/SpiralBoard'
import BoardTabs from '../../../components/BoardTabs'

const UNLOCK_REQUIREMENTS = {
  medium: 3,
  hard: 3
}

export default function TeamPage() {
  const params = useParams()
  const slug = params.slug
  const [team, setTeam] = useState(null)
  const [tiles, setTiles] = useState({ easy: [], medium: [], hard: [] })
  const [progress, setProgress] = useState({
    easy: { paths: [0, 0, 0], centerCompleted: false },
    medium: { paths: [0, 0, 0], centerCompleted: false },
    hard: { paths: [0, 0, 0], centerCompleted: false }
  })
  const [activeBoard, setActiveBoard] = useState('easy')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  // Load team and data
  useEffect(() => {
    loadTeamData()
  }, [slug])

  async function loadTeamData() {
    setLoading(true)

    // Load team
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('slug', slug)
      .single()

    if (teamError || !teamData) {
      setError('Team not found')
      setLoading(false)
      return
    }

    setTeam(teamData)

    // Load tiles
    const { data: tilesData } = await supabase
      .from('tiles')
      .select('*')
      .order('ring', { ascending: true })

    if (tilesData) {
      const grouped = { easy: [], medium: [], hard: [] }
      tilesData.forEach(tile => {
        if (grouped[tile.board]) {
          grouped[tile.board].push(tile)
        }
      })
      setTiles(grouped)
    }

    // Load team progress
    const { data: progressData } = await supabase
      .from('progress')
      .select('*, tiles(*)')
      .eq('team_id', teamData.id)

    if (progressData) {
      // Calculate progress from completed tiles
      const newProgress = {
        easy: { paths: [0, 0, 0], centerCompleted: false },
        medium: { paths: [0, 0, 0], centerCompleted: false },
        hard: { paths: [0, 0, 0], centerCompleted: false }
      }

      progressData.forEach(p => {
        const tile = p.tiles
        if (!tile) return

        if (tile.is_center) {
          newProgress[tile.board].centerCompleted = true
        } else {
          // Update path progress to the highest completed ring
          const currentMax = newProgress[tile.board].paths[tile.path]
          if (tile.ring > currentMax) {
            newProgress[tile.board].paths[tile.path] = tile.ring
          }
        }
      })

      setProgress(newProgress)
    }

    setLoading(false)
  }

  // Calculate unlocked boards
  const getUnlockedBoards = () => {
    const unlocked = ['easy']

    const easyMinRings = Math.min(...progress.easy.paths)
    if (easyMinRings >= UNLOCK_REQUIREMENTS.medium) {
      unlocked.push('medium')
    }

    const mediumMinRings = Math.min(...progress.medium.paths)
    if (mediumMinRings >= UNLOCK_REQUIREMENTS.hard) {
      unlocked.push('hard')
    }

    return unlocked
  }

  const handleBoardChange = (boardType) => {
    // Allow navigation to any board (for preview)
    setActiveBoard(boardType)
  }

  // Save tile completion to database
  async function saveTileProgress(tile) {
    if (!team || !tile) return

    setSaving(true)

    const { error } = await supabase.from('progress').upsert({
      team_id: team.id,
      tile_id: tile.id,
      completed_at: new Date().toISOString()
    }, {
      onConflict: 'team_id,tile_id'
    })

    if (error) {
      console.error('Error saving progress:', error)
    }

    setSaving(false)
  }

  const handleTileComplete = (tile, path, ring) => {
    // Update local state
    setProgress(prev => ({
      ...prev,
      [activeBoard]: {
        ...prev[activeBoard],
        paths: prev[activeBoard].paths.map((p, i) =>
          i === path ? Math.max(p, ring) : p
        )
      }
    }))

    // Save to database
    saveTileProgress(tile)
  }

  const handleCenterComplete = (tile) => {
    // Update local state
    setProgress(prev => ({
      ...prev,
      [activeBoard]: {
        ...prev[activeBoard],
        centerCompleted: true
      }
    }))

    // Save to database
    const centerTile = tiles[activeBoard].find(t => t.is_center)
    if (centerTile) {
      saveTileProgress(centerTile)
    }
  }

  // Calculate total points
  const calculatePoints = () => {
    let total = 0

    Object.entries(progress).forEach(([board, boardProgress]) => {
      const boardTiles = tiles[board]

      // Points for completed path tiles
      boardProgress.paths.forEach((completedRing, path) => {
        for (let ring = 1; ring <= completedRing; ring++) {
          const tile = boardTiles.find(t => !t.is_center && t.ring === ring && t.path === path)
          if (tile) total += tile.points
        }
      })

      // Points for center
      if (boardProgress.centerCompleted) {
        const centerTile = boardTiles.find(t => t.is_center)
        if (centerTile) total += centerTile.points
      }
    })

    return total
  }

  if (loading) {
    return (
      <main style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh'
      }}>
        <p style={{ color: '#ffd700', fontSize: '1.5rem' }}>Loading...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '1rem'
      }}>
        <p style={{ color: '#e74c3c', fontSize: '1.5rem' }}>{error}</p>
        <a href="/" style={{ color: '#3498db' }}>← Back to home</a>
      </main>
    )
  }

  const unlockedBoards = getUnlockedBoards()
  const currentProgress = progress[activeBoard]
  const totalPoints = calculatePoints()
  const isBoardLocked = !unlockedBoards.includes(activeBoard)

  return (
    <main style={{
      minHeight: '100vh',
      padding: '2rem',
      maxWidth: '900px',
      margin: '0 auto'
    }}>
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
          {team.name}
        </h1>
        <p style={{ color: '#a0a0a0', marginBottom: '0.5rem' }}>
          Spiral Race
        </p>
        <div style={{
          display: 'inline-block',
          padding: '0.5rem 1.5rem',
          background: 'rgba(255, 215, 0, 0.1)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <span style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '1.25rem' }}>
            {totalPoints} points
          </span>
        </div>
        {saving && (
          <p style={{ color: '#3498db', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Saving...
          </p>
        )}
      </header>

      {/* Board Tabs */}
      <BoardTabs
        activeBoard={activeBoard}
        onBoardChange={handleBoardChange}
        unlockedBoards={unlockedBoards}
      />

      {/* Board Title */}
      <h2 style={{
        textAlign: 'center',
        marginBottom: '1.5rem',
        color: activeBoard === 'easy' ? '#3498db' : activeBoard === 'medium' ? '#f39c12' : '#c0392b'
      }}>
        {activeBoard === 'easy' && '⚡ Easy Spiral'}
        {activeBoard === 'medium' && '⚔️ Medium Spiral'}
        {activeBoard === 'hard' && '💀 Hard Spiral'}
      </h2>

      {/* Spiral Board */}
      <SpiralBoard
        key={`${activeBoard}-${JSON.stringify(currentProgress)}`}
        boardType={activeBoard}
        tiles={tiles[activeBoard]}
        initialProgress={currentProgress.paths}
        initialCenterCompleted={currentProgress.centerCompleted}
        onTileComplete={handleTileComplete}
        onCenterComplete={handleCenterComplete}
        disabled={isBoardLocked}
      />

      {/* Unlock info */}
      {activeBoard === 'easy' && !unlockedBoards.includes('medium') && (
        <p style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          padding: '1rem',
          background: 'rgba(52, 152, 219, 0.2)',
          borderRadius: '8px',
          color: '#3498db'
        }}>
          Unlock Medium: Complete {UNLOCK_REQUIREMENTS.medium} rings (all 3 paths per ring)
        </p>
      )}

      {activeBoard === 'medium' && isBoardLocked && (
        <p style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          padding: '1rem',
          background: 'rgba(243, 156, 18, 0.2)',
          borderRadius: '8px',
          color: '#f39c12'
        }}>
          Unlock required: Complete {UNLOCK_REQUIREMENTS.medium} rings on Easy (all 3 paths per ring)
        </p>
      )}

      {activeBoard === 'medium' && !isBoardLocked && !unlockedBoards.includes('hard') && (
        <p style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          padding: '1rem',
          background: 'rgba(243, 156, 18, 0.2)',
          borderRadius: '8px',
          color: '#f39c12'
        }}>
          Unlock Hard: Complete {UNLOCK_REQUIREMENTS.hard} rings (all 3 paths per ring)
        </p>
      )}

      {activeBoard === 'hard' && isBoardLocked && (
        <p style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          padding: '1rem',
          background: 'rgba(192, 57, 43, 0.2)',
          borderRadius: '8px',
          color: '#c0392b'
        }}>
          Unlock required: Complete {UNLOCK_REQUIREMENTS.hard} rings on Medium (all 3 paths per ring)
        </p>
      )}
    </main>
  )
}
