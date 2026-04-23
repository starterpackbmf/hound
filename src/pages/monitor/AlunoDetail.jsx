import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { matilha } from '../../lib/matilha'
import { supabase } from '../../lib/supabase'
import { getStudentPlan, createPlan, listStudentPlans } from '../../lib/plans'
import { listStudentNotes } from '../../lib/sessionNotes'
import {
  listDailyFeedback, saveDailyFeedback, FEEDBACK_TAGS,
  listSessionsFor, saveSession,
  listTradeFeedbackFor, saveTradeFeedback, TRADE_STATUS_META,
} from '../../lib/feedback'
import { PageTitle, Section, ErrorBox, Loading } from '../member/ui'
import RankBadge from '../../components/RankBadge'
import { IArrowLeft, IArrowRight, IMessage, IPlus, IX, ICheck, IClock } from '../../components/icons'

const SETUP_ALL = ['TA', 'TC', 'TRM', 'FQ']
const ATIVOS_ALL = ['WIN', 'WDO']

export default function AlunoDetail() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [student, setStudent] = useState(null)      // from Lovable API
  const [summary, setSummary] = useState(null)
  const [profile, setProfile] = useState(null)       // from our Supabase
  const [plan, setPlan] = useState(null)
  const [editing, setEditing] = useState(false)
  const [planDraft, setPlanDraft] = useState({})

  useEffect(() => {
    (async () => {
      setLoading(true); setErr(null)
      try {
        // Lovable API
        const [profResp, sumResp] = await Promise.all([
          matilha.student(id).catch(() => null),
          matilha.summary(id).catch(() => null),
        ])
        setStudent(profResp?.profile)
        setSummary(sumResp)

        // Our Supabase — find profile by lovable_student_id match OR by id
        const { data: supaProfile } = await supabase
          .from('profiles')
          .select('*')
          .or(`lovable_student_id.eq.${id},id.eq.${id}`)
          .maybeSingle()
        setProfile(supaProfile)

        // Plan (if profile exists on our end)
        if (supaProfile) {
          const p = await getStudentPlan(supaProfile.id).catch(() => null)
          setPlan(p)
        }
      } catch (e) { setErr(e.message) } finally { setLoading(false) }
    })()
  }, [id])

  function startEdit() {
    // Defaults: período de 14 dias a partir de hoje
    const today = new Date()
    const in14 = new Date(); in14.setDate(today.getDate() + 14)
    setPlanDraft({
      setups_permitidos: [...SETUP_ALL],
      ativos_permitidos: [...ATIVOS_ALL],
      starts_at: isoDate(today),
      ends_at: isoDate(in14),
      title: 'Plano de 14 dias',
      extra_rules: [],
    })
    setEditing(true)
  }

  async function onSavePlan() {
    if (!profile?.id) return alert('aluno não tem profile no nosso Supabase ainda')
    try {
      const payload = {
        user_id: profile.id,
        title: planDraft.title || null,
        starts_at: planDraft.starts_at || null,
        ends_at: planDraft.ends_at || null,
        men_max_pts: num(planDraft.men_max_pts),
        max_trades_per_day: num(planDraft.max_trades_per_day),
        max_consecutive_stops: num(planDraft.max_consecutive_stops),
        stop_diario_brl: num(planDraft.stop_diario_brl),
        stop_mensal_brl: num(planDraft.stop_mensal_brl),
        stop_por_trade_brl: num(planDraft.stop_por_trade_brl),
        contratos_maximos: num(planDraft.contratos_maximos),
        setups_permitidos: planDraft.setups_permitidos,
        ativos_permitidos: planDraft.ativos_permitidos,
        horario_limite: planDraft.horario_limite || null,
        melhor_de_3: !!planDraft.melhor_de_3,
        melhor_de_5: !!planDraft.melhor_de_5,
        extra_rules: (planDraft.extra_rules || []).filter(r => r && r.trim()),
        observacoes: planDraft.observacoes || null,
        objetivos_semana: planDraft.objetivos_semana || null,
      }
      // createPlan — trigger no banco arquiva o plano ativo anterior
      const saved = await createPlan(payload)
      setPlan(saved)
      setEditing(false)
    } catch (e) { alert(e.message) }
  }

  function isoDate(d) {
    return d.toISOString().slice(0, 10)
  }

  if (loading) return <Loading />
  if (err) return <ErrorBox>{err}</ErrorBox>
  if (!student) return <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>aluno não encontrado</div>

  const whatsapp = profile?.whatsapp
  const waMessage = encodeURIComponent(
    `Oi ${firstName(student.name)}, sou do time de monitoria da Matilha. Vi teu painel e queria bater um papo rápido sobre teu operacional.`
  )
  const waLink = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${waMessage}` : null

  return (
    <div style={{ maxWidth: 1000 }}>
      <Link to="/mentor/alunos" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 11, color: 'var(--text-muted)', marginBottom: 16,
      }}>
        <IArrowLeft size={12} stroke={1.6} /> alunos
      </Link>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{
          width: 60, height: 60, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #a855f7 0%, #00d9ff 100%)',
          color: '#0a0a0e', fontSize: 24, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{(student.name?.[0] || '?').toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>ALUNO</div>
          <h1 className="display" style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', margin: 0 }}>
            {student.name?.trim()}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <span className="pill" style={{ fontSize: 10 }}>
              <span className={student.status === 'ativo' ? 'dot dot-up' : 'dot dot-muted'} />
              {student.status}
            </span>
            {student.current_badge && <RankBadge rank={student.current_badge} size="sm" />}
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              id {id.slice(0, 8)}
            </span>
          </div>
        </div>
        {waLink && (
          <a href={waLink} target="_blank" rel="noreferrer" className="btn btn-primary">
            <IMessage size={13} stroke={1.8} /> WhatsApp
          </a>
        )}
      </div>

      {/* Performance recente */}
      {summary && summary.total_trades > 0 ? (
        <Section title="performance recente">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            <Stat label="TRADES" value={summary.total_trades} />
            <Stat label="WIN RATE" value={`${summary.win_rate}%`} />
            <Stat label="R:R" value={summary.risk_reward?.toFixed(1) ?? '—'} />
            <Stat label="RESULTADO" value={`R$ ${Number(summary.total_result_brl).toLocaleString('pt-BR')}`} color={summary.total_result_brl >= 0 ? 'var(--up)' : 'var(--down)'} />
            <Stat label="SEGUIU PLANO" value={`${summary.followed_plan_rate}%`} />
            <Stat label="DIAS" value={summary.days_operated} />
          </div>
        </Section>
      ) : (
        <Section title="performance recente">
          <div style={{ padding: 16, fontSize: 12, color: 'var(--text-muted)' }}>sem trades registrados.</div>
        </Section>
      )}

      {/* Setups por resultado */}
      {summary?.by_setup && Object.keys(summary.by_setup).length > 0 && (
        <Section title="performance por setup">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {Object.entries(summary.by_setup).map(([s, v]) => (
              <div key={s} className="card" style={{ padding: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--cyan)', fontWeight: 600, marginBottom: 6 }}>{s}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {v.count} ops · {v.wins} wins
                </div>
                <div style={{
                  fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 500, marginTop: 4,
                  color: v.result >= 0 ? 'var(--up)' : 'var(--down)',
                }}>
                  {v.result >= 0 ? '+' : ''}R$ {v.result.toLocaleString('pt-BR')}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Plano de Execução */}
      <Section title="plano de execução">
        {!profile ? (
          <div className="card" style={{ padding: 14, fontSize: 12, color: 'var(--text-muted)' }}>
            aluno ainda não tem profile no nosso Supabase. mapeie o <code style={{ background: 'var(--surface-2)', padding: '2px 4px', borderRadius: 3 }}>lovable_student_id</code> na tabela profiles pra poder definir o plano.
          </div>
        ) : editing ? (
          <PlanEditor draft={planDraft} setDraft={setPlanDraft} onSave={onSavePlan} onCancel={() => setEditing(false)} />
        ) : plan ? (
          <div>
            <PlanView plan={plan} />
            <button onClick={startEdit} className="btn btn-outline-cyan" style={{ marginTop: 10 }}>editar plano</button>
          </div>
        ) : (
          <div className="card" style={{ padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>sem plano ativo</div>
            <button onClick={startEdit} className="btn btn-primary">definir plano</button>
          </div>
        )}
      </Section>

      {profile && <SessionNotesTimeline studentId={profile.id} />}
      {profile && <DailyFeedbackSection studentId={profile.id} />}
      {profile && <TradeFeedbackHistorySection studentId={profile.id} />}
      {profile && <MentorshipSessionsSection studentId={profile.id} />}
    </div>
  )
}

// ============================================================
// SESSION NOTES TIMELINE — histórico cumulativo de sessões
// ============================================================
function SessionNotesTimeline({ studentId }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listStudentNotes(studentId).then(setNotes).catch(() => {}).finally(() => setLoading(false))
  }, [studentId])

  if (loading) return null
  if (notes.length === 0) {
    return (
      <Section title="histórico de sessões">
        <div className="card" style={{ padding: 14, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
          Nenhuma sessão registrada ainda.<br/>
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
            Notas aparecem aqui quando um monitor conclui uma sessão na /mentor/agenda.
          </span>
        </div>
      </Section>
    )
  }

  return (
    <Section title={`histórico de sessões · ${notes.length}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {notes.map(n => <SessionNoteCard key={n.id} note={n} />)}
      </div>
    </Section>
  )
}

function SessionNoteCard({ note }) {
  const when = new Date(note.created_at)
  const initial = (note.monitor?.name?.[0] || '?').toUpperCase()
  return (
    <div className="card" style={{ padding: 14, borderLeft: '3px solid rgba(168,85,247,0.4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5,
          background: note.monitor?.avatar_url ? `url(${note.monitor.avatar_url}) center/cover` : 'linear-gradient(135deg, #a855f7, #ec4899)',
          color: '#0a0a0e', fontSize: 10, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{!note.monitor?.avatar_url && initial}</div>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
          {note.monitor?.name || 'monitor'}
        </span>
        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          · {when.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
        {note.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', flexWrap: 'wrap' }}>
            {note.tags.slice(0, 4).map(t => (
              <span key={t} className="pill" style={{ fontSize: 9, fontWeight: 600, color: 'var(--purple)', borderColor: 'rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.06)' }}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
        {note.summary_md}
      </div>
      {note.next_steps_md && (
        <div style={{
          marginTop: 10, padding: '8px 12px', borderRadius: 6,
          background: 'rgba(0,217,255,0.05)', border: '1px solid rgba(0,217,255,0.18)',
          fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5,
        }}>
          <div style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--cyan)', fontWeight: 700, marginBottom: 4 }}>
            PRÓXIMOS PASSOS
          </div>
          {note.next_steps_md}
        </div>
      )}
    </div>
  )
}

function TradeFeedbackHistorySection({ studentId }) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listTradeFeedbackFor(studentId, { limit: 20 })
      .then(setList)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [studentId])

  if (loading) return null
  if (list.length === 0) return null

  return (
    <Section title={`feedbacks em trades · ${list.length}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {list.slice(0, 10).map(f => {
          const meta = TRADE_STATUS_META[f.status] || TRADE_STATUS_META.OK
          return (
            <Link key={f.id} to={`/app/trade/${f.trade_id}`} className="card card-hover" style={{
              padding: 12, display: 'flex', alignItems: 'center', gap: 12,
              borderLeft: `3px solid ${meta.color}`,
              textDecoration: 'none', color: 'var(--text-primary)',
            }}>
              <span style={{
                width: 26, height: 26, borderRadius: 6, background: meta.bg, color: meta.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700,
              }}>{meta.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.1em', color: meta.color, fontWeight: 600 }}>{meta.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(f.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
                {f.feedback && <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 4 }}>{f.feedback.slice(0, 140)}{f.feedback.length > 140 ? '…' : ''}</div>}
              </div>
              <IArrowRight size={12} stroke={1.6} style={{ color: 'var(--text-muted)' }} />
            </Link>
          )
        })}
      </div>
    </Section>
  )
}

function DailyFeedbackSection({ studentId }) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [writing, setWriting] = useState(false)
  const [draft, setDraft] = useState({ day_date: new Date().toISOString().slice(0, 10), feedback: '', tags: [] })

  async function load() {
    try {
      const data = await listDailyFeedback(studentId)
      setList(data)
    } catch (e) { console.warn(e) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [studentId])

  function toggleTag(t) {
    setDraft(d => ({ ...d, tags: d.tags.includes(t) ? d.tags.filter(x => x !== t) : [...d.tags, t] }))
  }

  async function submit() {
    if (!draft.feedback.trim()) return
    try {
      await saveDailyFeedback({ student_id: studentId, ...draft })
      setDraft({ day_date: new Date().toISOString().slice(0, 10), feedback: '', tags: [] })
      setWriting(false)
      await load()
    } catch (e) { alert(e.message) }
  }

  return (
    <Section title="feedback diário">
      {writing ? (
        <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input className="input" type="date" value={draft.day_date} onChange={e => setDraft(d => ({ ...d, day_date: e.target.value }))} style={{ width: 160 }} />
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {FEEDBACK_TAGS.map(t => {
                const sel = draft.tags.includes(t)
                return (
                  <button key={t} type="button" onClick={() => toggleTag(t)}
                    className={sel ? 'pill pill-active' : 'pill'} style={{ cursor: 'pointer', fontSize: 10 }}>
                    {sel && <ICheck size={10} stroke={2.2} />} {t}
                  </button>
                )
              })}
            </div>
          </div>
          <textarea className="input" rows={3} style={{ resize: 'vertical' }}
            placeholder="o que viu no dia, o que elogiar, o que ajustar..."
            value={draft.feedback}
            onChange={e => setDraft(d => ({ ...d, feedback: e.target.value }))} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={submit} disabled={!draft.feedback.trim()} className="btn btn-primary">publicar</button>
            <button onClick={() => setWriting(false)} className="btn btn-ghost">cancelar</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setWriting(true)} className="btn btn-outline-cyan" style={{ marginBottom: 12 }}>
          <IPlus size={12} stroke={2} /> escrever feedback
        </button>
      )}

      {loading ? <Loading />
       : list.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>sem feedbacks ainda</div>
       : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {list.map(f => (
            <div key={f.id} className="card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {new Date(f.day_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                </span>
                {(f.tags || []).map(t => <span key={t} className="pill pill-cyan" style={{ fontSize: 9 }}>{t}</span>)}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                {f.feedback}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

function MentorshipSessionsSection({ studentId }) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [writing, setWriting] = useState(false)
  const [draft, setDraft] = useState({
    session_date: new Date().toISOString().slice(0, 10),
    summary: '', technical_adjustments: '', emotional_observations: '',
    suggested_strategies: '', next_focus: '',
  })

  async function load() {
    try { setList(await listSessionsFor(studentId)) } catch (e) {} finally { setLoading(false) }
  }
  useEffect(() => { load() }, [studentId])

  async function submit() {
    if (!draft.summary.trim()) return
    try {
      await saveSession({ student_id: studentId, ...draft })
      setDraft({ session_date: new Date().toISOString().slice(0, 10), summary: '', technical_adjustments: '', emotional_observations: '', suggested_strategies: '', next_focus: '' })
      setWriting(false)
      await load()
    } catch (e) { alert(e.message) }
  }

  return (
    <Section title="resumos de sessão">
      {writing ? (
        <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input className="input" type="date" value={draft.session_date} onChange={e => setDraft(d => ({ ...d, session_date: e.target.value }))} style={{ width: 160 }} />
          <FieldRow label="resumo da sessão *"><textarea className="input" rows={3} value={draft.summary} onChange={e => setDraft(d => ({ ...d, summary: e.target.value }))} style={{ resize: 'vertical' }} /></FieldRow>
          <FieldRow label="ajustes técnicos"><textarea className="input" rows={2} value={draft.technical_adjustments} onChange={e => setDraft(d => ({ ...d, technical_adjustments: e.target.value }))} style={{ resize: 'vertical' }} /></FieldRow>
          <FieldRow label="observações emocionais"><textarea className="input" rows={2} value={draft.emotional_observations} onChange={e => setDraft(d => ({ ...d, emotional_observations: e.target.value }))} style={{ resize: 'vertical' }} /></FieldRow>
          <FieldRow label="estratégias sugeridas"><textarea className="input" rows={2} value={draft.suggested_strategies} onChange={e => setDraft(d => ({ ...d, suggested_strategies: e.target.value }))} style={{ resize: 'vertical' }} /></FieldRow>
          <FieldRow label="próximo foco"><input className="input" value={draft.next_focus} onChange={e => setDraft(d => ({ ...d, next_focus: e.target.value }))} /></FieldRow>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={submit} disabled={!draft.summary.trim()} className="btn btn-primary">salvar sessão</button>
            <button onClick={() => setWriting(false)} className="btn btn-ghost">cancelar</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setWriting(true)} className="btn btn-outline-cyan" style={{ marginBottom: 12 }}>
          <IPlus size={12} stroke={2} /> registrar sessão
        </button>
      )}

      {loading ? <Loading />
       : list.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>nenhuma sessão registrada</div>
       : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map(s => (
            <div key={s.id} className="card" style={{ padding: 14 }}>
              <div className="label-muted" style={{ marginBottom: 8, fontFamily: 'var(--font-mono)' }}>
                {new Date(s.session_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 10 }}>{s.summary}</div>
              <SessionField label="ajustes técnicos" value={s.technical_adjustments} />
              <SessionField label="emocional" value={s.emotional_observations} />
              <SessionField label="estratégias" value={s.suggested_strategies} />
              <SessionField label="próximo foco" value={s.next_focus} highlight />
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

function FieldRow({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="label-muted">{label}</span>
      {children}
    </div>
  )
}

function SessionField({ label, value, highlight }) {
  if (!value) return null
  return (
    <div style={{ marginTop: 6, paddingLeft: 10, borderLeft: `2px solid ${highlight ? 'var(--cyan)' : 'var(--border)'}` }}>
      <div style={{ fontSize: 9, color: highlight ? 'var(--cyan)' : 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 2 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{value}</div>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div className="card" style={{ padding: '10px 12px' }}>
      <div className="label-muted" style={{ fontSize: 9, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 500, fontFamily: 'var(--font-mono)', color: color || 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  )
}

function PlanView({ plan }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 14 }}>
        <MiniStat label="stop diário" value={plan.stop_diario_brl ? `R$ ${plan.stop_diario_brl}` : '—'} />
        <MiniStat label="stop mensal" value={plan.stop_mensal_brl ? `R$ ${plan.stop_mensal_brl}` : '—'} />
        <MiniStat label="stop/trade" value={plan.stop_por_trade_brl ? `R$ ${plan.stop_por_trade_brl}` : '—'} />
        <MiniStat label="contratos máx" value={plan.contratos_maximos || '—'} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        {(plan.setups_permitidos || []).map(s => <span key={s} className="pill pill-cyan" style={{ fontSize: 10 }}>{s}</span>)}
        {(plan.ativos_permitidos || []).map(a => <span key={a} className="pill" style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}>{a}</span>)}
        {plan.melhor_de_3 && <span className="pill pill-pink" style={{ fontSize: 10 }}>melhor de 3</span>}
        {plan.melhor_de_5 && <span className="pill pill-pink" style={{ fontSize: 10 }}>melhor de 5</span>}
      </div>
      {plan.observacoes && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{plan.observacoes}</div>}
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{value}</div>
    </div>
  )
}

function PlanEditor({ draft, setDraft, onSave, onCancel }) {
  function toggle(key, val) {
    const arr = draft[key] || []
    const next = arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
    setDraft({ ...draft, [key]: next })
  }
  function f(key) {
    return {
      value: draft[key] ?? '',
      onChange: e => setDraft({ ...draft, [key]: e.target.value }),
    }
  }

  const extraRules = draft.extra_rules || []
  function updateRule(i, val) {
    const next = [...extraRules]; next[i] = val
    setDraft({ ...draft, extra_rules: next })
  }
  function addRule() {
    setDraft({ ...draft, extra_rules: [...extraRules, ''] })
  }
  function removeRule(i) {
    setDraft({ ...draft, extra_rules: extraRules.filter((_, j) => j !== i) })
  }

  return (
    <div className="card" style={{ padding: 18 }}>
      {/* Título */}
      <Field label="título do plano">
        <input className="input" placeholder="ex: 14 dias de disciplina" {...f('title')} />
      </Field>

      {/* Período */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <Field label="começa em"><input className="input" type="date" {...f('starts_at')} /></Field>
        <Field label="termina em"><input className="input" type="date" {...f('ends_at')} /></Field>
      </div>

      {/* Métricas principais — MEN + trades/dia + stops seguidos */}
      <div style={{
        padding: 14, borderRadius: 8, marginBottom: 14,
        background: 'rgba(0,217,255,0.04)', border: '1px solid rgba(0,217,255,0.18)',
      }}>
        <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--cyan)', fontWeight: 700, marginBottom: 10 }}>
          LIMITES OPERACIONAIS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          <Field label="MEN máximo (pts)">
            <input className="input" type="number" min="0" placeholder="ex: 300" {...f('men_max_pts')} />
          </Field>
          <Field label="trades máx por dia">
            <input className="input" type="number" min="0" placeholder="ex: 3" {...f('max_trades_per_day')} />
          </Field>
          <Field label="stops seguidos máx">
            <input className="input" type="number" min="0" placeholder="ex: 2" {...f('max_consecutive_stops')} />
          </Field>
          <Field label="contratos máx/trade">
            <input className="input" type="number" min="0" {...f('contratos_maximos')} />
          </Field>
        </div>
      </div>

      {/* Setups + ativos */}
      <Field label="setups permitidos">
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {SETUP_ALL.map(s => {
            const sel = (draft.setups_permitidos || []).includes(s)
            return <button key={s} type="button" onClick={() => toggle('setups_permitidos', s)}
              className={sel ? 'pill pill-cyan' : 'pill'} style={{ cursor: 'pointer' }}>
              {sel && <ICheck size={10} stroke={2.2} />} {s}
            </button>
          })}
        </div>
      </Field>

      <Field label="ativos permitidos">
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {ATIVOS_ALL.map(a => {
            const sel = (draft.ativos_permitidos || []).includes(a)
            return <button key={a} type="button" onClick={() => toggle('ativos_permitidos', a)}
              className={sel ? 'pill pill-cyan' : 'pill'} style={{ cursor: 'pointer' }}>
              {sel && <ICheck size={10} stroke={2.2} />} {a}
            </button>
          })}
        </div>
      </Field>

      {/* Outras regras (array) */}
      <Field label="outras regras (uma por linha)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {extraRules.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 6 }}>
              <input className="input" value={r}
                onChange={e => updateRule(i, e.target.value)}
                placeholder="ex: Não operar entre 11h e 13h"
                style={{ flex: 1 }} />
              <button type="button" onClick={() => removeRule(i)} className="btn btn-ghost" style={{ padding: 6 }}>
                <IX size={12} stroke={1.8} />
              </button>
            </div>
          ))}
          <button type="button" onClick={addRule} className="btn btn-ghost" style={{ fontSize: 11, alignSelf: 'flex-start' }}>
            <IPlus size={11} stroke={2} /> adicionar regra
          </button>
        </div>
      </Field>

      {/* Flags */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={!!draft.melhor_de_3} onChange={e => setDraft({ ...draft, melhor_de_3: e.target.checked })} />
          melhor de 3
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={!!draft.melhor_de_5} onChange={e => setDraft({ ...draft, melhor_de_5: e.target.checked })} />
          melhor de 5
        </label>
      </div>

      {/* Legacy stops em R$ (opcional) */}
      <details style={{ marginBottom: 14 }}>
        <summary style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', padding: '6px 0' }}>
          + stops em R$ (opcional)
        </summary>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 8 }}>
          <Field label="stop diário (R$)"><input className="input" type="number" {...f('stop_diario_brl')} /></Field>
          <Field label="stop mensal (R$)"><input className="input" type="number" {...f('stop_mensal_brl')} /></Field>
          <Field label="stop/trade (R$)"><input className="input" type="number" {...f('stop_por_trade_brl')} /></Field>
          <Field label="horário limite"><input className="input" type="time" {...f('horario_limite')} /></Field>
        </div>
      </details>

      <Field label="objetivos">
        <textarea className="input" rows={2} style={{ resize: 'vertical' }} {...f('objetivos_semana')} />
      </Field>

      <Field label="observações">
        <textarea className="input" rows={3} style={{ resize: 'vertical' }} {...f('observacoes')} />
      </Field>

      <div style={{
        padding: '8px 10px', borderRadius: 6, fontSize: 10.5,
        background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)',
        color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12,
      }}>
        ⚠️ Ao salvar, o plano ativo anterior do aluno será arquivado automaticamente.
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={onSave} className="btn btn-primary">salvar plano</button>
        <button onClick={onCancel} className="btn btn-ghost">cancelar</button>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
      <span className="label-muted">{label}</span>
      {children}
    </div>
  )
}

function num(v) { if (v === '' || v == null) return null; return Number(v) }
function firstName(n) { return (n || '').trim().split(/\s+/)[0] }
