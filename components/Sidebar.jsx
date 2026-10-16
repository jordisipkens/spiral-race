'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'

const ADMIN_SECTIONS = [
  { id: 'tiles', label: 'Tiles', icon: '🧩' },
  { id: 'teams', label: 'Teams', icon: '👥' },
  { id: 'submissions', label: 'Submissions', icon: '📋' },
  { id: 'settings', label: 'Settings', icon: '⚙️' }
]

export default function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [teams, setTeams] = useState([])
  const [session, setSession] = useState({ admin: false, teams: [] })

  useEffect(() => {
    supabase
      .from('teams')
      .select('id, name, slug')
      .order('name')
      .then(({ data }) => setTeams(data || []))
  }, [])

  // Refresh login state on every navigation (cookies are httpOnly, so ask the server)
  useEffect(() => {
    loadSession()
    setOpen(false)
  }, [pathname])

  async function loadSession() {
    try {
      const res = await fetch('/api/session')
      if (res.ok) setSession(await res.json())
    } catch {
      // Keep the previous state
    }
  }

  // Admin and team sessions are separate, so they have separate log out buttons
  async function logoutAdmin() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    window.location.href = '/'
  }

  async function logoutTeams() {
    await Promise.all(
      session.teams.map(slug => fetch(`/api/team/auth?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' }))
    )
    window.location.href = '/'
  }

  const activeAdminSection = pathname === '/admin' ? (searchParams.get('section') || 'tiles') : null

  return (
    <>
      <button className="sidebar-toggle" onClick={() => setOpen(!open)} aria-label="Toggle menu">
        {open ? '✕' : '☰'}
      </button>
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}

      <nav className={`sidebar${open ? ' open' : ''}`}>
        <Link href="/" style={styles.brand}>Spiral Race</Link>

        <NavItem href="/" icon="🏠" label="Home" active={pathname === '/'} />
        <NavItem href="/stats" icon="📊" label="Stats" active={pathname === '/stats'} />

        <div style={styles.heading}>Teams</div>
        {teams.length === 0 && <div style={styles.empty}>No teams yet</div>}
        {teams.map(team => {
          const unlocked = session.teams.includes(team.slug)
          return (
            <NavItem
              key={team.id}
              href={`/team/${team.slug}`}
              icon={unlocked ? '🔓' : '🔒'}
              label={team.name}
              active={pathname === `/team/${team.slug}` || pathname === `/team/${team.slug}/login`}
            />
          )
        })}

        <div style={styles.heading}>Admin</div>
        {ADMIN_SECTIONS.map(section => (
          <NavItem
            key={section.id}
            href={`/admin?section=${section.id}`}
            icon={section.icon}
            label={section.label}
            active={activeAdminSection === section.id}
          />
        ))}

        {session.teams.length > 0 && (
          <button onClick={logoutTeams} style={styles.logout}>
            Log out team{session.teams.length > 1 ? 's' : ''}
          </button>
        )}
        {session.admin && (
          <button onClick={logoutAdmin} style={styles.logout}>
            Log out admin
          </button>
        )}
      </nav>
    </>
  )
}

function NavItem({ href, icon, label, active }) {
  return (
    <Link
      href={href}
      style={{
        ...styles.item,
        background: active ? 'rgba(255, 215, 0, 0.15)' : 'transparent',
        color: active ? '#ffd700' : '#ccc',
        borderLeft: active ? '3px solid #ffd700' : '3px solid transparent'
      }}
    >
      <span style={{ width: '1.25rem', textAlign: 'center' }}>{icon}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </Link>
  )
}

const styles = {
  brand: {
    display: 'block',
    fontSize: '1.4rem',
    fontWeight: 'bold',
    padding: '0 1rem 1.25rem',
    background: 'linear-gradient(90deg, #ffd700, #ff8c00)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  heading: {
    color: '#777',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    padding: '1.25rem 1rem 0.4rem'
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.55rem 1rem',
    fontSize: '0.95rem',
    transition: 'background 0.2s ease'
  },
  empty: {
    color: '#666',
    fontSize: '0.85rem',
    padding: '0.4rem 1rem'
  },
  logout: {
    display: 'block',
    width: 'calc(100% - 2rem)',
    margin: '1rem 1rem 0',
    padding: '0.5rem',
    background: 'transparent',
    border: '1px solid rgba(231, 76, 60, 0.6)',
    borderRadius: '8px',
    color: '#e74c3c',
    cursor: 'pointer',
    fontSize: '0.9rem'
  }
}
