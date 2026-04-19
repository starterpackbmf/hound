import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getMyProfile } from '../../lib/profile'
import { PageTitle, Section, Placeholder, ErrorBox, Loading } from './ui'
import RankBadge, { RANKS, RANK_ORDER, nextRank } from '../../components/RankBadge'
import { ISparkles, ITarget, IPlus, IX } from '../../components/icons'

const TABS = ['matilha', 'metas', 'dificuldades', 'diagnostico']
const TAB_LABELS = {
  matilha: '🐺 matilha',
  metas: '🎯 metas',
  dificuldades: '🌳 dificuldades',
  diagnostico: '🩺 diagnóstico',
}

export default function Jornada() {
  const [tab, setTab] = useState('matilha')
  return (
    <div style={{ maxWidth: 1040 }}>
      <PageTitle eyebrow="A MATILHA" sub="sua evolução, metas e diagnóstico pessoal.">minha jornada</PageTitle>

      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={tab === t ? 'pill pill-active' : 'pill'}
            style={{ cursor: 'pointer' }}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'matilha' && <MatilhaTab />}
      {tab === 'metas' && <MetasTab />}
      {tab === 'dificuldades' && <DificuldadesTab />}
      {tab === 'diagnostico' && <DiagnosticoTab />}
    </div>
  )
}

function MatilhaTab() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    getMyProfile().then(setProfile).finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />

  const currentRank = profile?.current_badge || 'primeiro_instinto'
  const current = RANKS[currentRank]
  const next = nextRank(currentRank)
  const nextData = next ? RANKS[next] : null
  const accumulatedResult = 0 // TODO: puxar do diário real
  const progress = nextData
    ? Math.min(100, Math.round((accumulatedResult / nextData.threshold) * 100))
    : 100

  return (
    <>
      <Section title="nível atual">
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <RankBadge rank={currentRank} size="md" />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>
            R$ {accumulatedResult.toLocaleString('pt-BR')} / R$ {nextData ? nextData.threshold.toLocaleString('pt-BR') : '—'}
          </div>
          <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--amber)', transition: 'width 300ms' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {nextData
              ? <>Próxima evolução: <strong style={{ color: nextData.color }}>{nextData.label}</strong></>
              : 'Você está entre os traders mais evoluídos da matilha.'}
          </div>
        </div>
      </Section>

      <Section title="caminho da evolução">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {RANK_ORDER.map((r, i) => {
            const rk = RANKS[r]
            const isCurrent = r === currentRank
            const unlocked = (RANK_ORDER.indexOf(r) <= RANK_ORDER.indexOf(currentRank))
            return (
              <div key={r} className="card" style={{
                padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
                borderColor: isCurrent ? 'var(--amber-dim-25)' : 'var(--border)',
                background: isCurrent ? 'var(--amber-dim-15)' : 'var(--surface-1)',
                opacity: unlocked ? 1 : 0.55,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: 99, background: rk.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                    {rk.label}
                    {isCurrent && <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--amber)', fontWeight: 600 }}>⚡ ATUAL</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    R$ {rk.threshold.toLocaleString('pt-BR')}
                  </div>
                </div>
                {!unlocked && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>🔒 bloqueado</span>}
              </div>
            )
          })}
        </div>
      </Section>
    </>
  )
}

function MetasTab() {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [editing, setEditing] = useState(null) // { range, title }

  async function load() {
    const { data, error } = await supabase.from('goals').select('*').order('range').order('created_at')
    if (error) setErr(error.message)
    else setGoals(data || [])
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  async function addGoal() {
    if (!editing?.title?.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('goals').insert({
      user_id: user.id, range: editing.range, title: editing.title.trim(),
    })
    if (error) return alert(error.message)
    setEditing(null)
    await load()
  }

  async function remove(id) {
    if (!confirm('apagar meta?')) return
    await supabase.from('goals').delete().eq('id', id)
    await load()
  }

  async function toggleDone(g) {
    const status = g.status === 'atingida' ? 'aberta' : 'atingida'
    await supabase.from('goals').update({ status }).eq('id', g.id)
    await load()
  }

  if (err) return <ErrorBox>{err} — rode <code>0007_onboarding.sql</code></ErrorBox>
  if (loading) return <Loading />

  const buckets = [
    { range: 'curto', label: '⚡ curto prazo' },
    { range: 'medio', label: '🚀 médio prazo' },
    { range: 'longo', label: '🌟 longo prazo' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
      {buckets.map(b => {
        const list = goals.filter(g => g.range === b.range)
        const isEditing = editing?.range === b.range
        return (
          <div key={b.range} className="card" style={{ padding: 16 }}>
            <div className="label-muted" style={{ marginBottom: 12 }}>{b.label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {list.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>sem metas ainda</div>}
              {list.map(g => (
                <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <input type="checkbox" checked={g.status === 'atingida'} onChange={() => toggleDone(g)} />
                  <span style={{
                    flex: 1,
                    color: g.status === 'atingida' ? 'var(--text-muted)' : 'var(--text-primary)',
                    textDecoration: g.status === 'atingida' ? 'line-through' : 'none',
                  }}>{g.title}</span>
                  <button onClick={() => remove(g.id)} style={{ color: 'var(--text-muted)', padding: 2 }}>
                    <IX size={11} stroke={1.8} />
                  </button>
                </div>
              ))}
            </div>
            {isEditing ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  className="input"
                  placeholder="descrever meta..."
                  value={editing.title}
                  onChange={e => setEditing(ed => ({ ...ed, title: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') addGoal() }}
                  autoFocus
                  style={{ fontSize: 12 }}
                />
                <button className="btn btn-primary" onClick={addGoal} style={{ fontSize: 11 }}>add</button>
                <button className="btn btn-ghost" onClick={() => setEditing(null)} style={{ padding: 6 }}><IX size={12} stroke={1.8} /></button>
              </div>
            ) : (
              <button
                className="btn btn-ghost"
                onClick={() => setEditing({ range: b.range, title: '' })}
                style={{ fontSize: 11, width: '100%', justifyContent: 'center' }}
              >
                <IPlus size={11} stroke={2} /> adicionar meta
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function DificuldadesTab() {
  return (
    <Placeholder
      title="árvore de dificuldades"
      subtitle="mapeie suas dificuldades, identifique causas e encontre soluções. (em construção)"
    />
  )
}

function DiagnosticoTab() {
  return (
    <Placeholder
      title="diagnóstico do trader"
      subtitle="responda 6 perguntas pra identificar padrões operacionais e ganhar +10 SC. (em construção)"
    />
  )
}
