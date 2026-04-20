import React, { useEffect, useState } from 'react'
import {
  listActiveChallenges, listMyCompletions, completeChallenge,
  createChallenge, deleteChallenge, challengeLeaderboard,
} from '../../lib/challenges'
import RankBadge from '../../components/RankBadge'
import { getMyProfile } from '../../lib/profile'
import { PageTitle, Section, Placeholder, ErrorBox, Loading } from './ui'
import { IPlus, IX, ICheck, IStar } from '../../components/icons'

export default function Desafios() {
  const [list, setList] = useState([])
  const [completions, setCompletions] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [isMonitor, setIsMonitor] = useState(false)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ title: '', description: '', reward_sc: 30 })
  const [leaderboard, setLeaderboard] = useState([])

  async function load() {
    setLoading(true); setErr(null)
    try {
      const [all, mine, prof, lb] = await Promise.all([
        listActiveChallenges(),
        listMyCompletions(),
        getMyProfile().catch(() => null),
        challengeLeaderboard(5).catch(() => []),
      ])
      setList(all)
      setCompletions(new Set(mine))
      setIsMonitor((prof?.roles || []).some(r => ['monitor', 'admin'].includes(r)))
      setLeaderboard(lb)
    } catch (e) {
      if (/sc_weekly|does not exist/i.test(e.message)) setErr('rode 0012_challenges.sql antes.')
      else setErr(e.message)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function onComplete(id) {
    try {
      const r = await completeChallenge(id)
      alert(`🎉 +${r.reward} SC!`)
      await load()
    } catch (e) { alert(e.message) }
  }

  async function onDelete(id) {
    if (!confirm('desativar desafio?')) return
    try { await deleteChallenge(id); await load() } catch (e) { alert(e.message) }
  }

  async function submit() {
    if (!draft.title.trim()) return
    try {
      await createChallenge({ title: draft.title.trim(), description: draft.description.trim() || null, reward_sc: Number(draft.reward_sc) || 30 })
      setDraft({ title: '', description: '', reward_sc: 30 })
      setCreating(false)
      await load()
    } catch (e) { alert(e.message) }
  }

  const thisWeekList = list.filter(c => {
    const monday = (() => {
      const d = new Date(); const day = d.getDay()
      const diff = day === 0 ? -6 : 1 - day
      d.setDate(d.getDate() + diff); d.setHours(0,0,0,0)
      return d.toISOString().slice(0, 10)
    })()
    return c.week_start === monday
  })
  const doneThisWeek = thisWeekList.filter(c => completions.has(c.id)).length
  const totalThisWeek = thisWeekList.length

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <PageTitle eyebrow="COMUNIDADE" sub="complete desafios definidos pelo monitor e ganhe StarterCoins.">
          desafios
        </PageTitle>
        {isMonitor && (
          <button onClick={() => setCreating(v => !v)} className={creating ? 'btn' : 'btn btn-outline-cyan'}>
            {creating ? <><IX size={12} stroke={2} /> cancelar</> : <><IPlus size={12} stroke={2} /> novo desafio</>}
          </button>
        )}
      </div>

      {err ? <ErrorBox>{err}</ErrorBox> : null}

      {/* Progress + leaderboard grid */}
      {!loading && !err && (
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'minmax(0, 1fr) minmax(240px, 320px)', marginBottom: 20 }}>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-muted)', marginBottom: 8 }}>SEU PROGRESSO ESSA SEMANA</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <div style={{ fontSize: 40, fontWeight: 300, color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>
                {doneThisWeek}
              </div>
              <div style={{ fontSize: 16, color: 'var(--text-muted)' }}>/ {totalThisWeek || 0} completos</div>
            </div>
            {totalThisWeek > 0 && (
              <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 999, marginTop: 12, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(doneThisWeek / totalThisWeek) * 100}%`,
                  background: 'linear-gradient(90deg, var(--cyan), var(--pink))',
                  transition: 'width 0.3s',
                }} />
              </div>
            )}
            {doneThisWeek === totalThisWeek && totalThisWeek > 0 && (
              <div style={{ fontSize: 11, color: 'var(--cyan)', marginTop: 10 }}>🐺 matilha completa essa semana</div>
            )}
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-muted)', marginBottom: 10 }}>TOP 5 · TOTAL DE DESAFIOS</div>
            {leaderboard.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>sem completions ainda</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {leaderboard.map((row, i) => (
                  <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      color: i === 0 ? 'var(--amber)' : i === 1 ? 'var(--cyan)' : i === 2 ? 'var(--pink)' : 'var(--text-muted)',
                      fontWeight: 600, width: 18,
                    }}>#{i + 1}</span>
                    <span style={{ flex: 1, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.profile?.name?.split(' ')[0]?.toLowerCase() || 'mentorado'}
                    </span>
                    {row.profile?.current_badge && <RankBadge rank={row.profile.current_badge} size="xs" />}
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)', fontWeight: 600 }}>
                      {row.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {creating && isMonitor && (
        <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input className="input" placeholder="título do desafio (ex: 3 dias seguindo 100% do plano)"
            value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} autoFocus />
          <textarea className="input" rows={2} style={{ resize: 'vertical' }}
            placeholder="descrição / regras (opcional)"
            value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>recompensa (SC):</label>
            <input className="input" type="number" min="1"
              value={draft.reward_sc} onChange={e => setDraft(d => ({ ...d, reward_sc: e.target.value }))}
              style={{ width: 100 }} />
            <div style={{ flex: 1 }} />
            <button onClick={submit} disabled={!draft.title.trim()} className="btn btn-primary">criar</button>
          </div>
        </div>
      )}

      {loading ? <Loading />
       : list.length === 0 ? <Placeholder title="nenhum desafio ativo" subtitle={isMonitor ? 'crie um desafio pra semana.' : 'o monitor ainda não propôs desafios. volta mais tarde.'} />
       : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(c => {
            const done = completions.has(c.id)
            return (
              <div key={c.id} className="card" style={{
                padding: 16,
                background: done ? 'var(--cyan-dim)' : 'var(--surface-1)',
                borderColor: done ? 'var(--cyan-dim-20)' : 'var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                    background: done ? 'var(--cyan)' : 'var(--surface-2)',
                    color: done ? '#0a0a0e' : 'var(--cyan)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {done ? <ICheck size={18} stroke={2.4} /> : <IStar size={16} stroke={1.6} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{c.title}</div>
                      <span style={{ fontSize: 10, color: 'var(--pink)', fontFamily: 'var(--font-mono)' }}>
                        +{c.reward_sc} SC
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>
                        {fmtWeek(c.week_start)}
                      </span>
                    </div>
                    {c.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 6 }}>{c.description}</div>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      {!done && !isMonitor && (
                        <button onClick={() => onComplete(c.id)} className="btn btn-primary" style={{ fontSize: 11 }}>
                          marcar como completo
                        </button>
                      )}
                      {done && (
                        <span className="pill pill-cyan" style={{ fontSize: 10 }}>
                          <ICheck size={10} stroke={2.2} /> concluído
                        </span>
                      )}
                      {isMonitor && (
                        <button onClick={() => onDelete(c.id)} className="btn btn-ghost" style={{ fontSize: 11 }}>
                          desativar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function fmtWeek(iso) {
  const d = new Date(iso + 'T12:00:00')
  return `sem ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
}
