import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { matilha } from '../../lib/matilha'
import { supabase } from '../../lib/supabase'
import { getStudentPlan, savePlan } from '../../lib/plans'
import { PageTitle, Section, ErrorBox, Loading } from '../member/ui'
import RankBadge from '../../components/RankBadge'
import { IArrowLeft, IArrowRight, IMessage, IPlus, IX, ICheck } from '../../components/icons'

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
    setPlanDraft(plan || {
      setups_permitidos: [...SETUP_ALL],
      ativos_permitidos: [...ATIVOS_ALL],
      active: true,
    })
    setEditing(true)
  }

  async function onSavePlan() {
    if (!profile?.id) return alert('aluno não tem profile no nosso Supabase ainda')
    try {
      const payload = {
        ...(plan?.id ? { id: plan.id } : {}),
        user_id: profile.id,
        active: true,
        stop_diario_brl: num(planDraft.stop_diario_brl),
        stop_mensal_brl: num(planDraft.stop_mensal_brl),
        stop_por_trade_brl: num(planDraft.stop_por_trade_brl),
        contratos_maximos: num(planDraft.contratos_maximos),
        setups_permitidos: planDraft.setups_permitidos,
        ativos_permitidos: planDraft.ativos_permitidos,
        horario_limite: planDraft.horario_limite || null,
        melhor_de_3: !!planDraft.melhor_de_3,
        melhor_de_5: !!planDraft.melhor_de_5,
        observacoes: planDraft.observacoes || null,
        objetivos_semana: planDraft.objetivos_semana || null,
      }
      const saved = await savePlan(payload)
      setPlan(saved)
      setEditing(false)
    } catch (e) { alert(e.message) }
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

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
        <Field label="stop diário (R$)"><input className="input" type="number" {...f('stop_diario_brl')} /></Field>
        <Field label="stop mensal (R$)"><input className="input" type="number" {...f('stop_mensal_brl')} /></Field>
        <Field label="stop/trade (R$)"><input className="input" type="number" {...f('stop_por_trade_brl')} /></Field>
        <Field label="contratos máx"><input className="input" type="number" {...f('contratos_maximos')} /></Field>
        <Field label="horário limite"><input className="input" type="time" {...f('horario_limite')} /></Field>
      </div>

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

      <Field label="objetivos da semana">
        <textarea className="input" rows={2} style={{ resize: 'vertical' }} {...f('objetivos_semana')} />
      </Field>

      <Field label="observações">
        <textarea className="input" rows={3} style={{ resize: 'vertical' }} {...f('observacoes')} />
      </Field>

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
