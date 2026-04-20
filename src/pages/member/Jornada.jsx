import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getMyProfile } from '../../lib/profile'
import {
  listDifficulties, createDifficulty, updateDifficulty, deleteDifficulty, buildTree,
  listDiagnostics, saveDiagnostic, QUESTIONS, computeResult,
} from '../../lib/diagnostic'
import { PageTitle, Section, Placeholder, ErrorBox, Loading } from './ui'
import RankBadge, { RANKS, RANK_ORDER, nextRank, currentRankFromResult } from '../../components/RankBadge'
import { useAuth } from '../../auth/AuthContext'
import { ISparkles, ITarget, IPlus, IX, ICheck } from '../../components/icons'

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
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [accumulatedResult, setAccumulatedResult] = useState(0)
  const [totalTrades, setTotalTrades] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const [p, trades] = await Promise.all([
          getMyProfile(),
          supabase.from('trades').select('resultado_brl').eq('user_id', user.id),
        ])
        setProfile(p)
        const list = trades.data || []
        setTotalTrades(list.length)
        setAccumulatedResult(list.reduce((s, t) => s + (t.resultado_brl || 0), 0))
      } finally { setLoading(false) }
    })()
  }, [user])

  if (loading) return <Loading />

  // Calcula rank baseado no resultado real (não só no que tá no profile)
  const computedRank = currentRankFromResult(accumulatedResult)
  const currentRank = profile?.current_badge || computedRank
  const current = RANKS[currentRank]
  const next = nextRank(currentRank)
  const nextData = next ? RANKS[next] : null
  // progresso entre rank atual e próximo (0-100%)
  const currentThreshold = current?.threshold ?? 0
  const nextThreshold = nextData?.threshold ?? currentThreshold
  const rangeSize = Math.max(1, nextThreshold - currentThreshold)
  const rangeDone = Math.max(0, Math.min(accumulatedResult - currentThreshold, rangeSize))
  const progress = nextData ? Math.round((rangeDone / rangeSize) * 100) : 100

  return (
    <>
      <Section title="nível atual">
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <RankBadge rank={currentRank} size="md" />
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 14, fontSize: 11 }}>
              <div>
                <div style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>RESULTADO</div>
                <div style={{ color: accumulatedResult >= 0 ? 'var(--up)' : 'var(--down)', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500 }}>
                  R$ {accumulatedResult.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>TRADES</div>
                <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500 }}>{totalTrades}</div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>
            progresso: R$ {rangeDone.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} / R$ {rangeSize.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} pro próximo rank
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

      <Section title="conquistas">
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <Achievement
            emoji="🐺" title="entrou na matilha"
            unlocked={true}
            detail="você tá aqui"
          />
          <Achievement
            emoji="📓" title="primeiro trade registrado"
            unlocked={totalTrades >= 1}
            detail={totalTrades >= 1 ? 'desbloqueada' : 'registre seu primeiro trade'}
          />
          <Achievement
            emoji="💯" title="100 trades"
            unlocked={totalTrades >= 100}
            detail={`${Math.min(totalTrades, 100)}/100`}
          />
          <Achievement
            emoji="🎯" title="500 trades"
            unlocked={totalTrades >= 500}
            detail={`${Math.min(totalTrades, 500)}/500`}
          />
          <Achievement
            emoji="💰" title="primeiro R$ 1.000 acumulado"
            unlocked={accumulatedResult >= 1000}
            detail={`R$ ${Math.max(0, accumulatedResult).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/1.000`}
          />
          <Achievement
            emoji="🔥" title="cruzou R$ 10.000"
            unlocked={accumulatedResult >= 10000}
            detail={`R$ ${Math.max(0, accumulatedResult).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/10.000`}
          />
          <Achievement
            emoji="👑" title="chegou no Alpha"
            unlocked={accumulatedResult >= 50000}
            detail={accumulatedResult >= 50000 ? 'desbloqueada' : 'R$ 50.000 pra desbloquear'}
          />
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

function Achievement({ emoji, title, detail, unlocked }) {
  return (
    <div className="card" style={{
      padding: 12,
      display: 'flex', alignItems: 'center', gap: 10,
      opacity: unlocked ? 1 : 0.5,
      background: unlocked ? 'rgba(34,197,94,0.06)' : 'var(--surface-1)',
      borderColor: unlocked ? 'rgba(34,197,94,0.25)' : 'var(--border)',
    }}>
      <span style={{ fontSize: 22, filter: unlocked ? 'none' : 'grayscale(1)' }}>{emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{title}</div>
        <div style={{ fontSize: 10, color: unlocked ? 'var(--up)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
          {unlocked && '✓ '}{detail}
        </div>
      </div>
    </div>
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
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [composing, setComposing] = useState(null) // { parent_id, kind, title }

  async function reload() {
    try {
      setList(await listDifficulties())
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { reload() }, [])

  async function submit() {
    if (!composing?.title?.trim()) return
    try {
      await createDifficulty(composing)
      setComposing(null)
      await reload()
    } catch (e) { alert(e.message) }
  }

  async function remove(id) {
    if (!confirm('apagar item (e filhos)?')) return
    await deleteDifficulty(id)
    await reload()
  }

  async function toggleResolved(d) {
    await updateDifficulty(d.id, { resolved: !d.resolved })
    await reload()
  }

  if (err) return <ErrorBox>{err} — rode <code>0007_onboarding.sql</code>.</ErrorBox>
  if (loading) return <Loading />

  const tree = buildTree(list)

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 520, lineHeight: 1.5 }}>
          mapeie dificuldades → causas → soluções. desmarca quando resolver.
        </div>
        <button onClick={() => setComposing({ parent_id: null, kind: 'dificuldade', title: '' })}
          className="btn btn-outline-amber">
          <IPlus size={12} stroke={2} /> nova dificuldade
        </button>
      </div>

      {composing && (
        <Composer composing={composing} setComposing={setComposing} submit={submit} />
      )}

      {tree.length === 0 ? (
        <Placeholder title="nenhuma dificuldade mapeada" subtitle="começa registrando algo que travou você no mercado." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tree.map(n => <TreeItem key={n.id} node={n} depth={0} onAdd={setComposing} onRemove={remove} onToggle={toggleResolved} />)}
        </div>
      )}
    </div>
  )
}

function TreeItem({ node, depth, onAdd, onRemove, onToggle }) {
  const KIND_META = {
    dificuldade: { emoji: '🌳', label: 'dificuldade', color: '#ef4444' },
    causa:       { emoji: '🌱', label: 'causa',       color: '#ec4899' },
    solucao:     { emoji: '💡', label: 'solução',     color: '#22c55e' },
  }
  const k = KIND_META[node.kind] || KIND_META.dificuldade
  return (
    <div>
      <div className="card" style={{
        padding: '10px 12px',
        marginLeft: depth * 20,
        borderLeft: `3px solid ${k.color}44`,
        display: 'flex', alignItems: 'center', gap: 10,
        opacity: node.resolved ? 0.5 : 1,
      }}>
        <input type="checkbox" checked={!!node.resolved} onChange={() => onToggle(node)} />
        <span style={{ fontSize: 14, flexShrink: 0 }}>{k.emoji}</span>
        <span className="label-muted" style={{ fontSize: 9 }}>{k.label}</span>
        <span style={{
          flex: 1, fontSize: 12.5, color: 'var(--text-primary)',
          textDecoration: node.resolved ? 'line-through' : 'none',
        }}>{node.title}</span>
        {node.kind !== 'solucao' && (
          <button onClick={() => onAdd({
            parent_id: node.id,
            kind: node.kind === 'dificuldade' ? 'causa' : 'solucao',
            title: '',
          })} className="btn btn-ghost" style={{ fontSize: 10 }}>
            <IPlus size={10} stroke={2} /> {node.kind === 'dificuldade' ? 'causa' : 'solução'}
          </button>
        )}
        <button onClick={() => onRemove(node.id)} className="btn btn-ghost" style={{ padding: 4 }}>
          <IX size={11} stroke={1.8} />
        </button>
      </div>
      {(node.children || []).map(c => <TreeItem key={c.id} node={c} depth={depth + 1} onAdd={onAdd} onRemove={onRemove} onToggle={onToggle} />)}
    </div>
  )
}

function Composer({ composing, setComposing, submit }) {
  const KIND_LABELS = { dificuldade: '🌳 dificuldade', causa: '🌱 causa', solucao: '💡 solução' }
  return (
    <div className="card" style={{ padding: 14, marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <span className="pill pill-amber" style={{ fontSize: 10 }}>{KIND_LABELS[composing.kind]}</span>
      <input
        className="input"
        placeholder="descreva..."
        value={composing.title}
        onChange={e => setComposing(c => ({ ...c, title: e.target.value }))}
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
        autoFocus
        style={{ flex: 1, minWidth: 200 }}
      />
      <button onClick={submit} className="btn btn-primary" style={{ fontSize: 11 }}>add</button>
      <button onClick={() => setComposing(null)} className="btn btn-ghost" style={{ padding: 6 }}>
        <IX size={12} stroke={1.8} />
      </button>
    </div>
  )
}

function DiagnosticoTab() {
  const [state, setState] = useState('start') // 'start' | 'answering' | 'done'
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  async function reload() {
    try {
      setHistory(await listDiagnostics())
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { reload() }, [])

  async function finish() {
    try {
      const saved = await saveDiagnostic(answers)
      setResult(saved)
      setState('done')
      reload()
    } catch (e) { alert(e.message) }
  }

  if (err) return <ErrorBox>{err} — rode <code>0007_onboarding.sql</code>.</ErrorBox>
  if (loading) return <Loading />

  if (state === 'start') {
    return (
      <div>
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 6, fontWeight: 500 }}>
            diagnóstico do trader
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 14 }}>
            responda 6 perguntas pra identificar padrões operacionais e receber um diagnóstico personalizado.
            ganha <strong style={{ color: 'var(--amber)' }}>+10 SC</strong> ao completar.
          </p>
          <button onClick={() => { setAnswers({}); setState('answering') }} className="btn btn-primary">
            iniciar diagnóstico
          </button>
        </div>

        {history.length > 0 && (
          <>
            <div className="label-muted" style={{ marginBottom: 8 }}>histórico</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {history.map(d => (
                <div key={d.id} className="card" style={{ padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(d.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 8 }}>
                    {d.result_summary}
                  </div>
                  {(d.result_tags || []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {d.result_tags.map(t => <span key={t} className="pill" style={{ fontSize: 9, fontFamily: 'var(--font-mono)' }}>#{t}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  if (state === 'answering') {
    const answered = Object.keys(answers).length
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <span className="label-muted">{answered}/{QUESTIONS.length} perguntas</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {Math.round((answered / QUESTIONS.length) * 100)}%
          </span>
        </div>
        <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 99, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(answered / QUESTIONS.length) * 100}%`, background: 'var(--amber)', transition: 'width 300ms' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {QUESTIONS.map((q, i) => (
            <div key={q.id} className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
                PERGUNTA {i + 1}
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--text-primary)', marginBottom: 12, lineHeight: 1.5 }}>
                {q.text}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {q.options.map(opt => {
                  const selected = answers[q.id] === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setAnswers(a => ({ ...a, [q.id]: opt.value }))}
                      className={selected ? 'btn btn-outline-amber' : 'btn'}
                      style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '10px 12px', fontSize: 12 }}
                    >
                      {selected && <ICheck size={12} stroke={2.2} />}
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          <button onClick={finish} disabled={answered < QUESTIONS.length} className="btn btn-primary">
            finalizar e ver resultado
          </button>
          <button onClick={() => { setAnswers({}); setState('start') }} className="btn btn-ghost">cancelar</button>
        </div>
      </div>
    )
  }

  // done
  return (
    <div>
      <div className="card" style={{ padding: 20, background: 'var(--amber-dim)', borderColor: 'var(--amber-dim-25)', marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--amber)', letterSpacing: '0.14em', fontWeight: 600, marginBottom: 8 }}>
          ✓ DIAGNÓSTICO CONCLUÍDO
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: 12 }}>
          {result?.result_summary}
        </div>
        {(result?.result_tags || []).length > 0 && (
          <div>
            <div className="label-muted" style={{ marginBottom: 6 }}>tags identificadas</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {result.result_tags.map(t => <span key={t} className="pill pill-amber" style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}>#{t}</span>)}
            </div>
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>
          +10 SC adicionados à sua conta. agende uma monitoria pra conversar sobre.
        </div>
      </div>
      <button onClick={() => { setAnswers({}); setState('start'); setResult(null) }} className="btn">fazer novo diagnóstico</button>
    </div>
  )
}
