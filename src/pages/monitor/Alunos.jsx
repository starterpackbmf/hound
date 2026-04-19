import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { matilha } from '../../lib/matilha'
import RankBadge from '../../components/RankBadge'
import { PageTitle, ErrorBox, Loading } from '../member/ui'

const FILTERS = {
  status: ['todos', 'ativo', 'bloqueado'],
  rank: ['todos', 'primeiro_instinto', 'predador', 'aprendiz_cacador', 'cacador', 'killer', 'alpha', 'primeiro', 'aprendiz', 'cacadoria', 'alfa'],
}

export default function Alunos() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [filterStatus, setFilterStatus] = useState('ativo')
  const [filterRank, setFilterRank] = useState('todos')
  const [q, setQ] = useState('')

  useEffect(() => {
    matilha.students()
      .then(r => setStudents(r.students || []))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return students.filter(s => {
      if (filterStatus !== 'todos' && s.status !== filterStatus) return false
      if (filterRank !== 'todos' && s.current_badge !== filterRank) return false
      if (q && !s.name.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [students, filterStatus, filterRank, q])

  const byRank = useMemo(() => {
    const counts = {}
    students.forEach(s => {
      const r = s.current_badge || 'sem_rank'
      counts[r] = (counts[r] || 0) + 1
    })
    return counts
  }, [students])

  return (
    <div style={{ maxWidth: 1100 }}>
      <PageTitle eyebrow="ÁREA DO MONITOR" sub={`${students.length} alunos cadastrados`}>
        alunos
      </PageTitle>

      {err && <ErrorBox>{err}</ErrorBox>}

      {!err && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              className="input"
              placeholder="buscar aluno..."
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{ flex: 1, minWidth: 200, maxWidth: 300 }}
            />

            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {FILTERS.status.map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={filterStatus === s ? 'pill pill-active' : 'pill'} style={{ cursor: 'pointer' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Distribuição por rank */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            {Object.entries(byRank).sort((a,b) => b[1] - a[1]).map(([rank, count]) => (
              <div key={rank} style={{
                padding: '4px 10px',
                background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 6,
                fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {rank !== 'sem_rank' ? <RankBadge rank={rank} size="xs" /> : <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>sem rank</span>}
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{count}</span>
              </div>
            ))}
          </div>

          {loading ? <Loading /> : (
            <>
              <div className="label-muted" style={{ marginBottom: 10 }}>
                {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {filtered.map(s => <AlunoRow key={s.id} student={s} />)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function AlunoRow({ student: s }) {
  return (
    <Link to={`/mentor/alunos/${s.id}`} className="card-hover" style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px',
      background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 6,
      fontSize: 12.5, color: 'var(--text-primary)', textDecoration: 'none',
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: 6, flexShrink: 0,
        background: 'linear-gradient(135deg, #a855f7 0%, #00d9ff 100%)',
        color: '#0a0a0e', fontSize: 11, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{(s.name[0] || '?').toUpperCase()}</div>

      <span style={{ flex: 1, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {s.name.trim()}
      </span>

      {s.current_badge && <RankBadge rank={s.current_badge} size="xs" />}

      <span style={{
        fontSize: 10, letterSpacing: '0.08em', fontFamily: 'var(--font-mono)',
        color: s.status === 'ativo' ? 'var(--up)' : s.status === 'bloqueado' ? 'var(--down)' : 'var(--text-muted)',
        textTransform: 'uppercase',
      }}>
        {s.status}
      </span>

      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        desde {new Date(s.created_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}
      </span>
    </Link>
  )
}
