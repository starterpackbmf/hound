import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyExecutionPlan } from '../../lib/plans'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { PageTitle, ErrorBox, Loading } from './ui'
import { ITarget, IClock, ICheck, IArrowRight, IUsers } from '../../components/icons'

const SETUP_LABELS = {
  TA: 'Trade de Abertura',
  TC: 'Trade de Continuação',
  TRM: 'Retorno às Médias',
  FQ: 'Falha e Quebra',
}

export default function PlanoExecucao() {
  const { user } = useAuth()
  const [plan, setPlan] = useState(null)
  const [monitor, setMonitor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      setLoading(true); setErr(null)
      try {
        const p = await getMyExecutionPlan()
        setPlan(p)
        if (p?.defined_by) {
          const { data: mon } = await supabase
            .from('profiles').select('id, name, avatar_url')
            .eq('id', p.defined_by).maybeSingle()
          setMonitor(mon || null)
        }
      } catch (e) {
        setErr(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [user])

  if (loading) return <Loading />
  if (err) return <ErrorBox>{err}</ErrorBox>

  return (
    <div style={{ maxWidth: 900 }}>
      <PageTitle eyebrow="PLANO DE EXECUÇÃO" sub="o contrato que você tem com seu monitor pra esse período.">
        plano ativo
      </PageTitle>
      {!plan ? <NoPlan /> : <ActivePlanView plan={plan} monitor={monitor} />}
    </div>
  )
}

function NoPlan() {
  return (
    <div style={{
      padding: 28, borderRadius: 14, textAlign: 'center',
      background: 'linear-gradient(180deg, rgba(18,22,32,0.7), rgba(14,16,22,0.75))',
      border: '1px solid var(--border)',
    }}>
      <ITarget size={28} stroke={1.2} style={{ color: 'var(--text-muted)', marginBottom: 10 }} />
      <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 4 }}>
        Sem plano ativo no momento
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto', lineHeight: 1.5 }}>
        Planos de execução são definidos pelos monitores em sessões de acompanhamento.
        Agende uma sessão pra alinhar seu plano.
      </div>
      <Link to="/app/monitoria" className="btn btn-primary" style={{ fontSize: 12, marginTop: 16, display: 'inline-flex' }}>
        <IUsers size={12} stroke={2} /> agendar monitoria <IArrowRight size={11} stroke={2} />
      </Link>
    </div>
  )
}

function ActivePlanView({ plan, monitor }) {
  const now = new Date()
  const starts = plan.starts_at ? new Date(plan.starts_at + 'T00:00:00') : null
  const ends = plan.ends_at ? new Date(plan.ends_at + 'T23:59:59') : null
  const totalDays = starts && ends ? Math.max(1, Math.round((ends - starts) / 86400000)) : null
  const daysLeft = ends ? Math.max(0, Math.ceil((ends - now) / 86400000)) : null
  const daysElapsed = starts ? Math.max(0, Math.floor((now - starts) / 86400000)) : null
  const pctElapsed = totalDays && daysElapsed != null ? Math.min(100, Math.round(daysElapsed / totalDays * 100)) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{
        padding: 24, borderRadius: 14,
        background: `
          radial-gradient(ellipse at top left, rgba(0,217,255,0.1), transparent 55%),
          radial-gradient(ellipse at bottom right, rgba(168,85,247,0.08), transparent 55%),
          linear-gradient(180deg, rgba(18,22,32,0.8), rgba(14,16,22,0.85))
        `,
        border: '1px solid rgba(0,217,255,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--cyan)', fontWeight: 700, marginBottom: 6 }}>
              🎯 PLANO ATIVO
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>
              {plan.title || 'Plano de execução'}
            </h2>
            {monitor && (
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>
                definido por <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{monitor.name}</span>
              </div>
            )}
          </div>

          {daysLeft != null && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '10px 18px', borderRadius: 10,
              background: daysLeft <= 2 ? 'rgba(245,158,11,0.1)' : 'var(--surface-2)',
              border: `1px solid ${daysLeft <= 2 ? 'rgba(245,158,11,0.25)' : 'var(--border)'}`,
              minWidth: 100,
            }}>
              <div style={{
                fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-mono)',
                color: daysLeft <= 2 ? 'var(--amber)' : 'var(--cyan)',
                letterSpacing: '0.02em', lineHeight: 1,
              }}>{daysLeft}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.12em', marginTop: 2 }}>
                {daysLeft === 1 ? 'DIA RESTANTE' : 'DIAS RESTANTES'}
              </div>
            </div>
          )}
        </div>

        {starts && ends && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 5, fontFamily: 'var(--font-mono)' }}>
              <span>{fmtDate(starts)}</span>
              <span>{pctElapsed != null ? `${pctElapsed}%` : ''}</span>
              <span>{fmtDate(ends)}</span>
            </div>
            <div style={{ height: 5, borderRadius: 4, background: 'var(--surface-2)', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div style={{
                width: `${pctElapsed || 0}%`, height: '100%',
                background: 'linear-gradient(90deg, var(--cyan), var(--purple))',
                transition: 'width 300ms ease',
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Métricas principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
        <MetricCard label="MEN MÁXIMO"
          value={plan.men_max_pts != null ? `${plan.men_max_pts} pts` : '—'}
          sub="calor máximo por trade" color="var(--red)" />
        <MetricCard label="TRADES / DIA"
          value={plan.max_trades_per_day != null ? `até ${plan.max_trades_per_day}` : '—'}
          sub="volume máximo diário" color="var(--cyan)" />
        <MetricCard label="STOPS SEGUIDOS"
          value={plan.max_consecutive_stops != null ? `máx ${plan.max_consecutive_stops}` : '—'}
          sub="pausa o dia se estourar" color="var(--amber)" />
        {plan.contratos_maximos && (
          <MetricCard label="CONTRATOS MÁX"
            value={`${plan.contratos_maximos}`} sub="por trade" color="var(--purple)" />
        )}
      </div>

      {/* Stops legacy */}
      {(plan.stop_diario_brl || plan.stop_mensal_brl || plan.stop_por_trade_brl) && (
        <div style={{ padding: 16, borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 10 }}>
            STOPS EM R$
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            {plan.stop_por_trade_brl != null && <MiniVal label="por trade" value={fmtBRL(plan.stop_por_trade_brl)} />}
            {plan.stop_diario_brl != null && <MiniVal label="diário" value={fmtBRL(plan.stop_diario_brl)} />}
            {plan.stop_mensal_brl != null && <MiniVal label="mensal" value={fmtBRL(plan.stop_mensal_brl)} />}
          </div>
        </div>
      )}

      {/* Setups + ativos */}
      {(plan.setups_permitidos?.length || plan.ativos_permitidos?.length) ? (
        <div style={{ padding: 16, borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 10 }}>
            O QUE VOCÊ PODE OPERAR
          </div>
          {plan.ativos_permitidos?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>ativos:</span>
              {plan.ativos_permitidos.map(a => (
                <span key={a} className="pill" style={{ fontSize: 10, background: 'rgba(0,217,255,0.08)', borderColor: 'rgba(0,217,255,0.2)', color: 'var(--cyan)', fontWeight: 600 }}>
                  {a}
                </span>
              ))}
            </div>
          )}
          {plan.setups_permitidos?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>setups:</span>
              {plan.setups_permitidos.map(s => (
                <span key={s} className="pill" style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {s} <span style={{ opacity: 0.6, fontWeight: 400, fontFamily: 'inherit' }}>— {SETUP_LABELS[s]}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Regras extras */}
      {plan.extra_rules?.length > 0 && (
        <div style={{ padding: 18, borderRadius: 10, background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.2)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--purple)', fontWeight: 700, marginBottom: 10 }}>
            ⚡ REGRAS ESPECÍFICAS
          </div>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
            {plan.extra_rules.map((r, i) => (
              <li key={i} style={{
                fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6,
                padding: '6px 0', display: 'flex', gap: 10, alignItems: 'flex-start',
                borderTop: i > 0 ? '1px solid rgba(168,85,247,0.08)' : 'none',
              }}>
                <ICheck size={12} stroke={2} style={{ color: 'var(--purple)', marginTop: 3, flexShrink: 0 }} />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Regras booleanas */}
      {(plan.melhor_de_3 || plan.melhor_de_5 || plan.horario_limite) && (
        <div style={{
          padding: 14, borderRadius: 10,
          background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
          display: 'flex', gap: 12, flexWrap: 'wrap',
        }}>
          {plan.melhor_de_3 && (
            <span className="pill" style={{ fontSize: 11, color: 'var(--amber)', borderColor: 'rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.06)' }}>
              melhor de 3 trades
            </span>
          )}
          {plan.melhor_de_5 && (
            <span className="pill" style={{ fontSize: 11, color: 'var(--amber)', borderColor: 'rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.06)' }}>
              melhor de 5 trades
            </span>
          )}
          {plan.horario_limite && (
            <span className="pill" style={{ fontSize: 11 }}>
              <IClock size={10} stroke={1.6} /> não operar após {plan.horario_limite}
            </span>
          )}
        </div>
      )}

      {/* Observações */}
      {plan.observacoes && (
        <div style={{ padding: 16, borderRadius: 10, background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>
            OBSERVAÇÕES DO MONITOR
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {plan.observacoes}
          </div>
        </div>
      )}

      {/* Objetivos */}
      {plan.objetivos_semana && (
        <div style={{ padding: 16, borderRadius: 10, background: 'rgba(0,217,255,0.04)', border: '1px solid rgba(0,217,255,0.2)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--cyan)', fontWeight: 700, marginBottom: 8 }}>
            🎯 OBJETIVOS
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {plan.objetivos_semana}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, sub, color }) {
  return (
    <div style={{ padding: 14, borderRadius: 10, background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 9.5, letterSpacing: '0.14em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, color: color || 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>{sub}</div>}
    </div>
  )
}
function MiniVal({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.12em', fontWeight: 600, marginBottom: 3 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>
        {value}
      </div>
    </div>
  )
}
function fmtBRL(v) {
  if (v == null) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function fmtDate(d) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
