'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import SubmissionCard from '../../components/SubmissionCard'

const BOARDS = ['easy', 'medium', 'hard']
const BOARD_COLORS = {
  easy: '#3498db',
  medium: '#f39c12',
  hard: '#c0392b'
}

export default function AdminPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState(null)

  const [activeSection, setActiveSection] = useState('tiles') // 'tiles' or 'teams'
  const [tiles, setTiles] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeBoard, setActiveBoard] = useState('easy')
  const [editingTile, setEditingTile] = useState(null)
  const [editingTeam, setEditingTeam] = useState(null)
  const [newTeam, setNewTeam] = useState({ name: '', slug: '' })
  const [message, setMessage] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)

  // Check auth on mount
  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const res = await fetch('/api/admin/auth')
      const data = await res.json()
      setIsAuthenticated(data.authenticated)
    } catch (error) {
      console.error('Auth check failed:', error)
    }
    setAuthChecking(false)
  }

  async function handleLogin(e) {
    e.preventDefault()
    setAuthError(null)

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      const data = await res.json()

      if (res.ok) {
        setIsAuthenticated(true)
        setPassword('')
      } else {
        setAuthError(data.error || 'Invalid password')
      }
    } catch (error) {
      setAuthError('Login failed')
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    setIsAuthenticated(false)
  }

  // Load data
  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated])

  async function loadData() {
    setLoading(true)
    await Promise.all([loadTiles(), loadTeams(), loadSubmissions()])
    setLoading(false)
  }

  async function loadSubmissions() {
    setLoadingSubmissions(true)
    try {
      const res = await fetch('/api/admin/submissions')
      if (res.ok) {
        const data = await res.json()
        setSubmissions(data.submissions || [])
      }
    } catch (error) {
      console.error('Error loading submissions:', error)
    }
    setLoadingSubmissions(false)
  }

  async function handleSubmissionAction(submissionId, action, rejectionReason = null) {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: submissionId,
          action,
          rejection_reason: rejectionReason
        })
      })

      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Submission ${action === 'approve' ? 'approved' : 'rejected'}!`
        })
        loadSubmissions()
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Action failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Action failed' })
    }
    setSaving(false)
  }

  async function loadTiles() {
    const { data, error } = await supabase
      .from('tiles')
      .select('*')
      .order('board')
      .order('ring')
      .order('path')

    if (error) {
      console.error('Error loading tiles:', error)
    } else {
      setTiles(data || [])
    }
  }

  async function loadTeams() {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading teams:', error)
    } else {
      setTeams(data || [])
    }
  }

  // Generate slug from name
  function generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  // Create team
  async function createTeam() {
    if (!newTeam.name.trim()) {
      setMessage({ type: 'error', text: 'Please enter a team name' })
      return
    }

    const slug = newTeam.slug.trim() || generateSlug(newTeam.name)

    setSaving(true)
    const { error } = await supabase.from('teams').insert({
      name: newTeam.name.trim(),
      slug: slug
    })

    if (error) {
      console.error('Error creating team:', error)
      setMessage({ type: 'error', text: error.message.includes('duplicate') ? 'This slug already exists' : 'Error creating team' })
    } else {
      setMessage({ type: 'success', text: 'Team created!' })
      setNewTeam({ name: '', slug: '' })
      loadTeams()
    }
    setSaving(false)
  }

  // Update team
  async function updateTeam(team) {
    setSaving(true)
    const { error } = await supabase
      .from('teams')
      .update({ name: team.name, slug: team.slug })
      .eq('id', team.id)

    if (error) {
      console.error('Error updating team:', error)
      setMessage({ type: 'error', text: 'Error saving' })
    } else {
      setMessage({ type: 'success', text: 'Team saved!' })
      setEditingTeam(null)
      loadTeams()
    }
    setSaving(false)
  }

  // Delete team
  async function deleteTeam(id) {
    if (!confirm('Are you sure you want to delete this team? All progress will also be deleted!')) return

    const { error } = await supabase.from('teams').delete().eq('id', id)
    if (error) {
      console.error('Error deleting team:', error)
      setMessage({ type: 'error', text: 'Error deleting' })
    } else {
      setMessage({ type: 'success', text: 'Team deleted!' })
      loadTeams()
    }
  }

  // Reset team progress
  async function resetTeamProgress(teamId, teamName) {
    if (!confirm(`Are you sure you want to reset all progress for "${teamName}"? This cannot be undone!`)) return

    setSaving(true)
    const { error } = await supabase
      .from('progress')
      .delete()
      .eq('team_id', teamId)

    if (error) {
      console.error('Error resetting progress:', error)
      setMessage({ type: 'error', text: 'Error resetting progress' })
    } else {
      setMessage({ type: 'success', text: `Progress for ${teamName} has been reset!` })
    }
    setSaving(false)
  }

  // Generate all tiles for a board
  async function generateTilesForBoard(board) {
    setSaving(true)
    const newTiles = []

    for (let ring = 1; ring <= 5; ring++) {
      for (let path = 0; path < 3; path++) {
        const exists = tiles.find(t =>
          t.board === board && t.ring === ring && t.path === path && !t.is_center
        )
        if (!exists) {
          newTiles.push({
            board,
            ring,
            path,
            title: `${board.charAt(0).toUpperCase() + board.slice(1)} R${ring}P${path + 1}`,
            description: '',
            points: board === 'easy' ? 10 : board === 'medium' ? 25 : 50,
            is_center: false
          })
        }
      }
    }

    const centerExists = tiles.find(t => t.board === board && t.is_center)
    if (!centerExists) {
      newTiles.push({
        board,
        ring: 1,
        path: 0,
        title: `${board.charAt(0).toUpperCase() + board.slice(1)} Center`,
        description: 'Complete all tiles to unlock this!',
        points: board === 'easy' ? 100 : board === 'medium' ? 200 : 500,
        is_center: true
      })
    }

    if (newTiles.length > 0) {
      const { error } = await supabase.from('tiles').insert(newTiles)
      if (error) {
        console.error('Error generating tiles:', error)
        setMessage({ type: 'error', text: 'Error generating tiles' })
      } else {
        setMessage({ type: 'success', text: `${newTiles.length} tiles generated for ${board}!` })
        loadTiles()
      }
    } else {
      setMessage({ type: 'info', text: `All tiles for ${board} already exist` })
    }

    setSaving(false)
  }

  // Update tile
  async function updateTile(tile) {
    setSaving(true)
    const { error } = await supabase
      .from('tiles')
      .update({
        title: tile.title,
        description: tile.description,
        points: tile.points
      })
      .eq('id', tile.id)

    if (error) {
      console.error('Error updating tile:', error)
      setMessage({ type: 'error', text: 'Error saving' })
    } else {
      setMessage({ type: 'success', text: 'Tile saved!' })
      setEditingTile(null)
      loadTiles()
    }
    setSaving(false)
  }

  // Delete tile
  async function deleteTile(id) {
    if (!confirm('Are you sure you want to delete this tile?')) return

    const { error } = await supabase.from('tiles').delete().eq('id', id)
    if (error) {
      console.error('Error deleting tile:', error)
      setMessage({ type: 'error', text: 'Error deleting' })
    } else {
      setMessage({ type: 'success', text: 'Tile deleted!' })
      loadTiles()
    }
  }

  // Filter tiles for active board
  const boardTiles = tiles
    .filter(t => t.board === activeBoard)
    .sort((a, b) => {
      if (a.is_center) return 1
      if (b.is_center) return -1
      if (a.ring !== b.ring) return a.ring - b.ring
      return a.path - b.path
    })

  // Auth checking state
  if (authChecking) {
    return (
      <main style={styles.container}>
        <p style={{ color: '#ffd700' }}>Checking authentication...</p>
      </main>
    )
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <main style={styles.container}>
        <div style={styles.loginContainer}>
          <h1 style={{ ...styles.title, marginBottom: '2rem', textAlign: 'center' }}>Admin Login</h1>

          <form onSubmit={handleLogin} style={styles.loginForm}>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter admin password"
              style={styles.input}
              autoFocus
            />

            {authError && (
              <p style={{ color: '#e74c3c', margin: '0.5rem 0', textAlign: 'center' }}>
                {authError}
              </p>
            )}

            <button
              type="submit"
              style={{ ...styles.saveBtn, width: '100%', marginTop: '0.5rem' }}
            >
              Login
            </button>
          </form>

          <a href="/" style={{ ...styles.backLink, display: 'block', textAlign: 'center', marginTop: '2rem' }}>
            ← Back to home
          </a>
        </div>
      </main>
    )
  }

  if (loading) {
    return (
      <main style={styles.container}>
        <p style={{ color: '#ffd700' }}>Loading...</p>
      </main>
    )
  }

  return (
    <main style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Admin Panel</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <a href="/" style={styles.backLink}>← Back to board</a>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </header>

      {/* Message */}
      {message && (
        <div style={{
          ...styles.message,
          background: message.type === 'error' ? 'rgba(231, 76, 60, 0.2)' :
                      message.type === 'success' ? 'rgba(46, 204, 113, 0.2)' :
                      'rgba(52, 152, 219, 0.2)',
          color: message.type === 'error' ? '#e74c3c' :
                 message.type === 'success' ? '#2ecc71' : '#3498db'
        }}>
          {message.text}
          <button onClick={() => setMessage(null)} style={styles.closeBtn}>×</button>
        </div>
      )}

      {/* Section Tabs */}
      <div style={styles.sectionTabs}>
        <button
          onClick={() => setActiveSection('tiles')}
          style={{
            ...styles.sectionTab,
            background: activeSection === 'tiles' ? '#9b59b6' : '#2c3e50',
            borderColor: activeSection === 'tiles' ? '#ffd700' : 'transparent'
          }}
        >
          🎯 Tiles
        </button>
        <button
          onClick={() => setActiveSection('teams')}
          style={{
            ...styles.sectionTab,
            background: activeSection === 'teams' ? '#9b59b6' : '#2c3e50',
            borderColor: activeSection === 'teams' ? '#ffd700' : 'transparent'
          }}
        >
          👥 Teams ({teams.length})
        </button>
        <button
          onClick={() => setActiveSection('submissions')}
          style={{
            ...styles.sectionTab,
            background: activeSection === 'submissions' ? '#e67e22' : '#2c3e50',
            borderColor: activeSection === 'submissions' ? '#ffd700' : 'transparent',
            position: 'relative'
          }}
        >
          📋 Submissions
          {submissions.length > 0 && (
            <span style={styles.badge}>{submissions.length}</span>
          )}
        </button>
      </div>

      {/* TILES SECTION */}
      {activeSection === 'tiles' && (
        <>
          {/* Board Tabs */}
          <div style={styles.tabs}>
            {BOARDS.map(board => (
              <button
                key={board}
                onClick={() => setActiveBoard(board)}
                style={{
                  ...styles.tab,
                  background: activeBoard === board ? BOARD_COLORS[board] : '#2c3e50',
                  borderColor: activeBoard === board ? '#ffd700' : 'transparent'
                }}
              >
                {board.charAt(0).toUpperCase() + board.slice(1)}
                <span style={styles.tileCount}>
                  ({tiles.filter(t => t.board === board).length} tiles)
                </span>
              </button>
            ))}
          </div>

          {/* Generate Tiles Button */}
          <div style={styles.actions}>
            <button
              onClick={() => generateTilesForBoard(activeBoard)}
              disabled={saving}
              style={{
                ...styles.generateBtn,
                background: BOARD_COLORS[activeBoard],
                opacity: saving ? 0.5 : 1
              }}
            >
              {saving ? 'Working...' : `Generate all ${activeBoard} tiles`}
            </button>
          </div>

          {/* Tiles List */}
          <div style={styles.tilesList}>
            {boardTiles.length === 0 ? (
              <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>
                No tiles for this board. Click "Generate" to create tiles.
              </p>
            ) : (
              boardTiles.map(tile => (
                <div key={tile.id} style={styles.tileCard}>
                  {editingTile?.id === tile.id ? (
                    <div style={styles.editForm}>
                      <input
                        type="text"
                        value={editingTile.title}
                        onChange={e => setEditingTile({ ...editingTile, title: e.target.value })}
                        placeholder="Title"
                        style={styles.input}
                      />
                      <textarea
                        value={editingTile.description || ''}
                        onChange={e => setEditingTile({ ...editingTile, description: e.target.value })}
                        placeholder="Description (optional)"
                        style={styles.textarea}
                      />
                      <input
                        type="number"
                        value={editingTile.points}
                        onChange={e => setEditingTile({ ...editingTile, points: parseInt(e.target.value) || 0 })}
                        placeholder="Points"
                        style={{ ...styles.input, width: '100px' }}
                      />
                      <div style={styles.editActions}>
                        <button onClick={() => updateTile(editingTile)} disabled={saving} style={styles.saveBtn}>
                          Save
                        </button>
                        <button onClick={() => setEditingTile(null)} style={styles.cancelBtn}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={styles.tileInfo}>
                        <div style={styles.tilePosition}>
                          {tile.is_center ? '👑 CENTER' : `Ring ${tile.ring} • Path ${tile.path + 1}`}
                        </div>
                        <div style={styles.tileTitle}>{tile.title}</div>
                        {tile.description && <div style={styles.tileDesc}>{tile.description}</div>}
                        <div style={styles.tilePoints}>{tile.points} points</div>
                      </div>
                      <div style={styles.tileActions}>
                        <button onClick={() => setEditingTile({ ...tile })} style={styles.editBtn}>Edit</button>
                        <button onClick={() => deleteTile(tile.id)} style={styles.deleteBtn}>Delete</button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* TEAMS SECTION */}
      {activeSection === 'teams' && (
        <>
          {/* Add Team Form */}
          <div style={styles.addTeamForm}>
            <h3 style={{ color: '#fff', marginBottom: '1rem' }}>New Team</h3>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={newTeam.name}
                onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
                placeholder="Team name"
                style={{ ...styles.input, flex: 1, minWidth: '200px' }}
              />
              <input
                type="text"
                value={newTeam.slug}
                onChange={e => setNewTeam({ ...newTeam, slug: e.target.value })}
                placeholder="Slug (optional)"
                style={{ ...styles.input, width: '200px' }}
              />
              <button
                onClick={createTeam}
                disabled={saving}
                style={{ ...styles.saveBtn, opacity: saving ? 0.5 : 1 }}
              >
                Create Team
              </button>
            </div>
            <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Slug is auto-generated if left empty. Teams can view their board at /team/[slug]
            </p>
          </div>

          {/* Teams List */}
          <div style={styles.tilesList}>
            {teams.length === 0 ? (
              <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>
                No teams yet. Create a team above.
              </p>
            ) : (
              teams.map(team => (
                <div key={team.id} style={styles.tileCard}>
                  {editingTeam?.id === team.id ? (
                    <div style={styles.editForm}>
                      <input
                        type="text"
                        value={editingTeam.name}
                        onChange={e => setEditingTeam({ ...editingTeam, name: e.target.value })}
                        placeholder="Team name"
                        style={styles.input}
                      />
                      <input
                        type="text"
                        value={editingTeam.slug}
                        onChange={e => setEditingTeam({ ...editingTeam, slug: e.target.value })}
                        placeholder="Slug"
                        style={styles.input}
                      />
                      <div style={styles.editActions}>
                        <button onClick={() => updateTeam(editingTeam)} disabled={saving} style={styles.saveBtn}>
                          Save
                        </button>
                        <button onClick={() => setEditingTeam(null)} style={styles.cancelBtn}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={styles.tileInfo}>
                        <div style={styles.tileTitle}>{team.name}</div>
                        <div style={styles.teamSlug}>
                          <span style={{ color: '#888' }}>URL: </span>
                          <a
                            href={`/team/${team.slug}`}
                            style={{ color: '#3498db' }}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            /team/{team.slug}
                          </a>
                        </div>
                        <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                          Created: {new Date(team.created_at).toLocaleDateString('en-US')}
                        </div>
                      </div>
                      <div style={styles.tileActions}>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/team/${team.slug}`)
                            setMessage({ type: 'success', text: 'Link copied!' })
                          }}
                          style={{ ...styles.editBtn, background: '#2ecc71' }}
                        >
                          Copy Link
                        </button>
                        <button onClick={() => setEditingTeam({ ...team })} style={styles.editBtn}>
                          Edit
                        </button>
                        <button
                          onClick={() => resetTeamProgress(team.id, team.name)}
                          disabled={saving}
                          style={{ ...styles.editBtn, background: '#f39c12' }}
                        >
                          Reset Progress
                        </button>
                        <button onClick={() => deleteTeam(team.id)} style={styles.deleteBtn}>
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* SUBMISSIONS SECTION */}
      {activeSection === 'submissions' && (
        <>
          <div style={styles.submissionsHeader}>
            <h3 style={{ color: '#fff', margin: 0 }}>
              Pending Submissions ({submissions.length})
            </h3>
            <button
              onClick={loadSubmissions}
              disabled={loadingSubmissions}
              style={styles.refreshBtn}
            >
              {loadingSubmissions ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {loadingSubmissions ? (
            <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>
              Loading submissions...
            </p>
          ) : submissions.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={{ color: '#888', fontSize: '1.1rem' }}>
                No pending submissions
              </p>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>
                Teams will submit evidence here for review
              </p>
            </div>
          ) : (
            <div style={styles.submissionsList}>
              {submissions.map(submission => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  onApprove={() => handleSubmissionAction(submission.id, 'approve')}
                  onReject={(reason) => handleSubmissionAction(submission.id, 'reject', reason)}
                  saving={saving}
                />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    padding: '2rem',
    maxWidth: '800px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem'
  },
  title: {
    fontSize: '2rem',
    color: '#ffd700',
    margin: 0
  },
  backLink: {
    color: '#3498db',
    textDecoration: 'none'
  },
  message: {
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    fontSize: '1.5rem',
    cursor: 'pointer'
  },
  sectionTabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem'
  },
  sectionTab: {
    padding: '0.75rem 1.5rem',
    border: '2px solid transparent',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1rem'
  },
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem'
  },
  tab: {
    padding: '0.75rem 1.5rem',
    border: '2px solid transparent',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  tileCount: {
    fontSize: '0.8rem',
    opacity: 0.8
  },
  actions: {
    marginBottom: '1.5rem'
  },
  generateBtn: {
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  addTeamForm: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  tilesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  tileCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
    padding: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  tileInfo: {
    flex: 1
  },
  tilePosition: {
    fontSize: '0.8rem',
    color: '#888',
    marginBottom: '0.25rem'
  },
  tileTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#fff'
  },
  tileDesc: {
    fontSize: '0.9rem',
    color: '#aaa',
    marginTop: '0.25rem'
  },
  tilePoints: {
    fontSize: '0.9rem',
    color: '#ffd700',
    marginTop: '0.5rem'
  },
  teamSlug: {
    fontSize: '0.9rem',
    marginTop: '0.25rem'
  },
  tileActions: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap'
  },
  editBtn: {
    padding: '0.5rem 1rem',
    background: '#3498db',
    border: 'none',
    borderRadius: '4px',
    color: 'white',
    cursor: 'pointer'
  },
  deleteBtn: {
    padding: '0.5rem 1rem',
    background: '#e74c3c',
    border: 'none',
    borderRadius: '4px',
    color: 'white',
    cursor: 'pointer'
  },
  editForm: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  input: {
    padding: '0.75rem',
    borderRadius: '4px',
    border: '1px solid #444',
    background: '#1a1a2e',
    color: 'white',
    fontSize: '1rem'
  },
  textarea: {
    padding: '0.75rem',
    borderRadius: '4px',
    border: '1px solid #444',
    background: '#1a1a2e',
    color: 'white',
    fontSize: '1rem',
    minHeight: '80px',
    resize: 'vertical'
  },
  editActions: {
    display: 'flex',
    gap: '0.5rem'
  },
  saveBtn: {
    padding: '0.5rem 1rem',
    background: '#2ecc71',
    border: 'none',
    borderRadius: '4px',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  cancelBtn: {
    padding: '0.5rem 1rem',
    background: '#95a5a6',
    border: 'none',
    borderRadius: '4px',
    color: 'white',
    cursor: 'pointer'
  },
  loginContainer: {
    maxWidth: '400px',
    margin: '0 auto',
    paddingTop: '4rem'
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  logoutBtn: {
    padding: '0.5rem 1rem',
    background: '#e74c3c',
    border: 'none',
    borderRadius: '4px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.9rem'
  },
  badge: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    background: '#e74c3c',
    color: 'white',
    borderRadius: '50%',
    width: '22px',
    height: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 'bold'
  },
  submissionsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  refreshBtn: {
    padding: '0.5rem 1rem',
    background: '#3498db',
    border: 'none',
    borderRadius: '4px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.9rem'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    border: '1px dashed rgba(255,255,255,0.1)'
  },
  submissionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  }
}
