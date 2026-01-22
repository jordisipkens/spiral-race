'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import SpiralBoard from '../components/SpiralBoard'
import BoardTabs from '../components/BoardTabs'

const UNLOCK_REQUIREMENTS = {
  medium: 3, // Complete 3 rings on easy
  hard: 3    // Complete 3 rings on medium
}

export default function Home() {
  const [activeBoard, setActiveBoard] = useState('easy')
  const [tiles, setTiles] = useState({ easy: [], medium: [], hard: [] })
  const [progress, setProgress] = useState({
    easy: { paths: [0, 0, 0], centerCompleted: false },
    medium: { paths: [0, 0, 0], centerCompleted: false },
    hard: { paths: [0, 0, 0], centerCompleted: false }
  })
  const [loading, setLoading] = useState(true)

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

  // Load tiles from database
  useEffect(() => {
    async function loadTiles() {
      const { data, error } = await supabase
        .from('tiles')
        .select('*')
        .order('ring', { ascending: true })

      if (error) {
        console.error('Error loading tiles:', error)
        setLoading(false)
        return
      }

      // Group tiles by board
      const grouped = { easy: [], medium: [], hard: [] }
      data?.forEach(tile => {
        if (grouped[tile.board]) {
          grouped[tile.board].push(tile)
        }
      })

      setTiles(grouped)
      setLoading(false)
    }

    loadTiles()
  }, [])

  const handleBoardChange = (boardType) => {
    const unlocked = getUnlockedBoards()
    if (unlocked.includes(boardType)) {
      setActiveBoard(boardType)
    }
  }

  const handleTileComplete = (tile, path, ring) => {
    setProgress(prev => ({
      ...prev,
      [activeBoard]: {
        ...prev[activeBoard],
        paths: prev[activeBoard].paths.map((p, i) =>
          i === path ? Math.max(p, ring) : p
        )
      }
    }))

    // TODO: Save to database for team progress
    console.log('Tile completed:', { tile, path, ring, board: activeBoard })
  }

  const handleCenterComplete = (tile) => {
    setProgress(prev => ({
      ...prev,
      [activeBoard]: {
        ...prev[activeBoard],
        centerCompleted: true
      }
    }))

    // TODO: Save to database
    console.log('Center completed:', { tile, board: activeBoard })
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

  const unlockedBoards = getUnlockedBoards()
  const currentProgress = progress[activeBoard]

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
          Spiral Race
        </h1>
        <p style={{ color: '#a0a0a0' }}>
          OSRS Clan Event
        </p>
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
        key={activeBoard}
        boardType={activeBoard}
        tiles={tiles[activeBoard]}
        initialProgress={currentProgress.paths}
        initialCenterCompleted={currentProgress.centerCompleted}
        onTileComplete={handleTileComplete}
        onCenterComplete={handleCenterComplete}
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

      {activeBoard === 'medium' && !unlockedBoards.includes('hard') && (
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
    </main>
  )
}
