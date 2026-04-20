import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { PageTitle, Section, Placeholder, ErrorBox, Loading } from './ui'

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysSince(iso) {
  if (!iso) return null
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return diff
}

export default function Feedback() {
  const { user } = useAuth()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('mentor_feedback').select('*').eq('student_id', user.id).order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setErr(error.message)
        else setList(data || [])
      })
      .then(() => setLoading(false))
  }, [user])

  const latest = list[0]
  const older = list.slice(1)

  const focus = useMemo(() => {
    return list.slice(0, 5).flatMap(f => f.tags || []).filter((t, i, a) => a.indexOf(t) === i).slice(0, 6)
  }, [list])

  const recurring = useMemo(() => {
    const counts = {}
    list.forEach(f => (f.tags || []).forEach(t => counts[t] = (counts[t] || 0) + 1))
    return Object.entries(counts).filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [list])

  const daysAgo = latest ? daysSince(latest.created_at) : null

  if (loading) return <Loading />

  return (
    <div style={{ maxWidth: 760 }}>
      <PageTitle eyebrow="MONITORIA" sub="acompanhamento e orientações do seu monitor, coletadas a cada feedback semanal.">
        feedback do mentor
      </PageTitle>

      {err && <ErrorBox>{err}</ErrorBox>}

      {list.length === 0 ? (
        <Placeholder
          title="ainda não há feedback"
          subtitle="quando seu monitor escrever um feedback, ele aparece aqui. geralmente é semanal, após sua revisão."
        />
      ) : (
        <>
          {/* Último feedback em destaque */}
          <div className="card" style={{
            padding: 20, marginBottom: 20,
            background: 'linear-gradient(135deg, rgba(0,217,255,0.05), rgba(168,85,247,0.05))',
            borderColor: 'rgba(0,217,255,0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="pill" style={{ fontSize: 9, color: 'var(--cyan)', borderColor: 'var(--cyan)' }}>
                MAIS RECENTE
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {daysAgo === 0 ? 'hoje' : daysAgo === 1 ? 'ontem' : `há ${daysAgo} dias`} · {fmtDate(latest.day_date || latest.created_at)}
              </span>
            </div>
            <div style={{
              fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap',
              marginBottom: latest.tags?.length ? 14 : 0,
            }}>
              {latest.feedback}
            </div>
            {latest.tags && latest.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {latest.tags.map(t => (
                  <span key={t} className="pill" style={{ fontSize: 10, color: 'var(--purple)' }}>{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* Focos + recorrentes */}
          {(focus.length > 0 || recurring.length > 0) && (
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: 20 }}>
              {focus.length > 0 && (
                <div className="card" style={{ padding: 14 }}>
                  <div className="label-muted" style={{ fontSize: 9, marginBottom: 8 }}>🎯 FOCO ATUAL</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {focus.map(t => (
                      <span key={t} className="pill pill-cyan" style={{ fontSize: 10 }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {recurring.length > 0 && (
                <div className="card" style={{ padding: 14 }}>
                  <div className="label-muted" style={{ fontSize: 9, marginBottom: 8 }}>🔁 OBSERVAÇÕES RECORRENTES</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {recurring.map(([tag, count]) => (
                      <div key={tag} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-primary)' }}>{tag}</span>
                        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>× {count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Histórico */}
          {older.length > 0 && (
            <Section title={`histórico (${older.length})`}>
              <button onClick={() => setShowAll(s => !s)} className="btn btn-ghost" style={{ fontSize: 11, marginBottom: 10 }}>
                {showAll ? 'esconder' : 'mostrar histórico'}
              </button>
              {showAll && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {older.map(f => (
                    <div key={f.id} className="card" style={{ padding: 14 }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>
                        {fmtDate(f.day_date || f.created_at)}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                        {f.feedback}
                      </div>
                      {f.tags && f.tags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                          {f.tags.map(t => (
                            <span key={t} className="pill" style={{ fontSize: 9 }}>{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}
        </>
      )}
    </div>
  )
}
