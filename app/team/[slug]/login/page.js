'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

export default function TeamLoginPage() {
  const { slug } = useParams()
  const [teamName, setTeamName] = useState(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase
      .from('teams')
      .select('name')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => setTeamName(data?.name || null))
  }, [slug])

  async function handleLogin(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/team/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, password })
      })
      const data = await res.json()

      if (res.ok) {
        // Full navigation so the middleware sees the new cookie
        window.location.href = `/team/${slug}`
        return
      }
      setError(data.error || 'Login failed')
    } catch (err) {
      setError('Login failed')
    }
    setSubmitting(false)
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={styles.card}>
        <h1 style={styles.title}>{teamName || 'Team'}</h1>
        <p style={{ color: '#aaa', textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Enter your team password. You stay logged in for a week.
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Team password"
            style={styles.input}
            autoFocus
          />

          {error && (
            <p style={{ color: '#e74c3c', textAlign: 'center', fontSize: '0.9rem' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !password}
            style={{ ...styles.button, opacity: submitting || !password ? 0.5 : 1 }}
          >
            {submitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </main>
  )
}

const styles = {
  card: {
    width: '100%',
    maxWidth: '380px',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 215, 0, 0.3)',
    borderRadius: '12px',
    padding: '2rem'
  },
  title: {
    textAlign: 'center',
    fontSize: '2rem',
    marginBottom: '0.5rem',
    background: 'linear-gradient(90deg, #ffd700, #ff8c00)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  input: {
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#fff',
    fontSize: '1rem'
  },
  button: {
    padding: '0.75rem',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)',
    color: '#1a1a2e',
    fontWeight: 'bold',
    fontSize: '1rem',
    cursor: 'pointer'
  }
}
