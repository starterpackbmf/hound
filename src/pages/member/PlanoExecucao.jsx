import React, { useEffect, useState } from 'react'
import { getMyExecutionPlan } from '../../lib/plans'
import { PageTitle, Section, Placeholder, ErrorBox, Loading } from './ui'
import { ITarget, IClock } from '../../components/icons'

const SETUP_LABELS = {
  TA: 'Trade de Abertura',
  TC: 'Trade de Continuação',
  TRM: 'Retorno às Médias',
  FQ: 'Falha e Quebra',
}

export default function PlanoExecucao() {
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  useEffect(() => {
    getMyExecutionPlan().then(setPlan).catch(e => {
      if (/execution_plans|does not exist/i.test(e.message)) setErr('rode supabase/migrations/0010_monitor_features.sql primeiro.')
      else setErr(e.message)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />
  if (err) return <ErrorBox>{err}</ErrorBox>

  if (!plan) {
    return (
      <div style={{ maxWidth: 700 }}>
        <PageTitle eyebrow="MONITORIA" sub="seu plano operacional definido pelo mentor.">
          plano de execução
        </PageTitle>
        <Placeholder
          title="aguardando plano do mentor"
          subtitle="quando seu monitor definir seu plano de execução, ele aparece aqui com as diretrizes operacionais."
        />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <PageTitle eyebrow="MONITORIA" sub={`última atualização: ${new Date(plan.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`}>
        plano de execução
      </PageTitle>

      {plan.objetivos_semana && (
        <div className="card" style={{
          padding: 20, marginBottom: 24,
          background: 'var(--cyan-dim)',
          borderColor: 'var(--cyan-dim-20)',
        }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>🎯 OBJETIVOS DA SEMANA</div>
          <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {plan.objetivos_semana}
          </div>
        </div>
      )}

      <Section title="limites operacionais">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <Stat label="STOP DIÁRIO" value={plan.stop_diario_brl ? `R$ ${Number(plan.stop_diario_brl).toLocaleString('pt-BR')}` : '—'} color="var(--down)" />
          <Stat label="STOP MENSAL" value={plan.stop_mensal_brl ? `R$ ${Number(plan.stop_mensal_brl).toLocaleString('pt-BR')}` : '—'} color="var(--down)" />
          <Stat label="STOP POR TRADE" value={plan.stop_por_trade_brl ? `R$ ${Number(plan.stop_por_trade_brl).toLocaleString('pt-BR')}` : '—'} color="var(--down)" />
          <Stat label="CONTRATOS MÁX" value={plan.contratos_maximos ?? '—'} color="var(--cyan)" />
          <Stat label="HORÁRIO LIMITE" value={plan.horario_limite ? String(plan.horario_limite).slice(0, 5) : 'livre'} color="var(--purple)" />
        </div>
      </Section>

      <Section title="setups permitidos">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(plan.setups_permitidos || []).map(s => (
            <span key={s} className="pill pill-cyan" style={{ fontSize: 11 }}>
              {s} · {SETUP_LABELS[s]}
            </span>
          ))}
        </div>
      </Section>

      <Section title="ativos permitidos">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(plan.ativos_permitidos || []).map(a => (
            <span key={a} className="pill" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>{a}</span>
          ))}
        </div>
      </Section>

      {(plan.melhor_de_3 || plan.melhor_de_5) && (
        <Section title="regras anti-revenge">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {plan.melhor_de_3 && (
              <div className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18, color: 'var(--pink)' }}>⚡</span>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>melhor de 3</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>parar após 2 stops consecutivos — aceitar o loss do dia.</div>
                </div>
              </div>
            )}
            {plan.melhor_de_5 && (
              <div className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18, color: 'var(--pink)' }}>⚡</span>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>melhor de 5</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>parar após 3 stops em 5 trades — revisar plano.</div>
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {plan.observacoes && (
        <Section title="observações do monitor">
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
              {plan.observacoes}
            </div>
          </div>
        </Section>
      )}
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div className="card" style={{ padding: '12px 14px' }}>
      <div className="label-muted" style={{ fontSize: 9.5, marginBottom: 6 }}>{label}</div>
      <div style={{
        fontSize: 16, fontWeight: 500, fontFamily: 'var(--font-mono)',
        color: color || 'var(--text-primary)',
      }}>{value}</div>
    </div>
  )
}
