import React, { useEffect, useState } from 'react'
import {
  listActiveChallenges, listMyCompletions, completeChallenge,
  createChallenge, deleteChallenge,
} from '../../lib/challenges'
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

  async function load() {
    setLoading(true); setErr(null)
    try {
      const [all, mine, prof] = await Promise.all([
        listActiveChallenges(),
        listMyCompletions(),
        getMyProfile().catch(() => null),
      ])
      setList(all)
      setCompletions(new Set(mine))
      setIsMonitor((prof?.roles || []).some(r => ['monitor', 'admin'].includes(r)))
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

  return (
    <div style={{ maxWidth: 760 }}>
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
