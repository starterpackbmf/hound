import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthContext'
import { PageTitle, Section, ErrorBox, Loading } from './ui'
import { ICheck } from '../../components/icons'

const CHECKLIST_ITEMS = [
  'Segui meu plano de trading',
  'Respeitei meu gerenciamento de risco',
  'Mantive a disciplina emocional',
  'Fiz pausas quando necessário',
  'Registrei todos os trades',
  'Analisei o mercado antes de operar',
  'Aceitei perdas sem vingança',
  'Celebrei ganhos sem euforia',
]

function todayIso() { return new Date().toISOString().slice(0, 10) }

export default function FinalizarDia({ modal = false, onClose, onSaved, date: dateProp } = {}) {
  const { user } = useAuth()
  const nav = useNavigate()
  const today = dateProp || todayIso()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [existing, setExisting] = useState(null)
  const [todayTrades, setTodayTrades] = useState([])
  const [allDays, setAllDays] = useState([]) // summaries finalizados recentes
  const [form, setForm] = useState({
    performance: '',
    learning: '',
    checklist: [],
    did_not_trade: false,
  })

  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const [sumRes, tradesRes, allSumRes] = await Promise.all([
          supabase.from('day_summaries').select('*').eq('user_id', user.id).eq('date', today).maybeSingle(),
          supabase.from('trades').select('*').eq('user_id', user.id).eq('date', today),
          supabase.from('day_summaries').select('*').eq('user_id', user.id).eq('is_finalized', true).order('date', { ascending: false }).limit(20),
        ])
        setTodayTrades(tradesRes.data || [])
        setAllDays(allSumRes.data || [])
        if (sumRes.data) {
          setExisting(sumRes.data)
          setForm({
            performance: sumRes.data.performance || '',
            learning: sumRes.data.learning || '',
            checklist: sumRes.data.checklist || [],
            did_not_trade: sumRes.data.did_not_trade || false,
          })
        }
      } catch (e) {
        setErr(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [user, today])

  const stats = useMemo(() => {
    const pts = todayTrades.reduce((s, t) => s + (t.total_points || 0), 0)
    const brl = todayTrades.reduce((s, t) => s + (t.resultado_brl || 0), 0)
    const plano = todayTrades.filter(t => t.followed_plan === true).length
    const fora = todayTrades.filter(t => t.followed_plan === false).length
    const disciplined = todayTrades.length > 0 && fora === 0
    return { pts, brl, plano, fora, disciplined, total: todayTrades.length }
  }, [todayTrades])

  const streak = useMemo(() => {
    // dias consecutivos disciplinados (todos trades followed_plan=true ou sem fora do plano)
    const sorted = [...allDays].sort((a, b) => b.date.localeCompare(a.date))
    let count = 0
    for (const d of sorted) {
      if (d.is_finalized && d.checklist && d.checklist.length >= 6) count++
      else break
    }
    return count
  }, [allDays])

  function toggleItem(item) {
    setForm(f => ({
      ...f,
      checklist: f.checklist.includes(item) ? f.checklist.filter(x => x !== item) : [...f.checklist, item],
    }))
  }

  async function finalize() {
    setSaving(true); setErr(null)
    try {
      const payload = {
        user_id: user.id,
        date: today,
        performance: form.performance || null,
        learning: form.learning || null,
        checklist: form.checklist,
        did_not_trade: form.did_not_trade,
        is_finalized: true,
      }
      const { error } = existing
        ? await supabase.from('day_summaries').update(payload).eq('id', existing.id)
        : await supabase.from('day_summaries').insert(payload)
      if (error) throw error
      if (modal && onSaved) onSaved()
      else nav('/app/diario?date=' + today, { replace: true })
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  const finalized = existing?.is_finalized
  const todayFmt = new Date(today + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })

  return (
    <div style={{ maxWidth: 900 }}>
      <PageTitle eyebrow="FIM DE PREGÃO" sub={`${todayFmt} — revise o dia, marque o checklist e finalize.`}>
        finalizar o dia
      </PageTitle>

      {err && <ErrorBox>{err}</ErrorBox>}

      {finalized && (
        <div className="card" style={{
          padding: 16, marginBottom: 16,
          background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ color: 'var(--amber)', fontSize: 18 }}>🔒</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)' }}>Dia finalizado</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>os trades de hoje estão bloqueados pra edição. você pode ainda atualizar o resumo abaixo.</div>
          </div>
        </div>
      )}

      {/* Resumo do dia */}
      <Section title="resumo de hoje">
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          <Stat label="TRADES" value={stats.total} />
          <Stat label="PONTOS" value={(stats.pts >= 0 ? '+' : '') + stats.pts.toFixed(0)} color={stats.pts >= 0 ? 'var(--up)' : 'var(--down)'} />
          <Stat label="RESULTADO" value={`R$ ${stats.brl.toLocaleString('pt-BR')}`} color={stats.brl >= 0 ? 'var(--up)' : 'var(--down)'} />
          <Stat label="SEGUIU PLANO" value={`${stats.plano}/${stats.total}`} color="var(--cyan)" />
          <Stat label="FORA DO PLANO" value={stats.fora} color={stats.fora > 0 ? 'var(--down)' : 'var(--text-muted)'} />
          <Stat label="DISCIPLINADO" value={stats.disciplined ? 'SIM' : 'NÃO'} color={stats.disciplined ? 'var(--up)' : 'var(--amber)'} />
        </div>
        {streak > 0 && (
          <div style={{ marginTop: 12, padding: 12, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--purple)', fontWeight: 600 }}>
              🔥 {streak} dia{streak > 1 ? 's' : ''} consecutivo{streak > 1 ? 's' : ''} disciplinado{streak > 1 ? 's' : ''}
            </div>
          </div>
        )}
      </Section>

      {/* Checklist */}
      <Section title="checklist de disciplina">
        <div style={{ display: 'grid', gap: 6 }}>
          {CHECKLIST_ITEMS.map(item => {
            const on = form.checklist.includes(item)
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleItem(item)}
                disabled={finalized}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', borderRadius: 10,
                  border: `1px solid ${on ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`,
                  background: on ? 'rgba(34,197,94,0.08)' : 'var(--surface-2)',
                  color: on ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: 13, textAlign: 'left', cursor: finalized ? 'default' : 'pointer',
                  opacity: finalized ? 0.7 : 1,
                }}
              >
                <span style={{
                  width: 18, height: 18, borderRadius: 5,
                  border: `2px solid ${on ? 'var(--up)' : 'var(--text-muted)'}`,
                  background: on ? 'var(--up)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#0a0a0e', fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>{on && '✓'}</span>
                {item}
              </button>
            )
          })}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, fontFamily: 'var(--font-mono)' }}>
          {form.checklist.length}/{CHECKLIST_ITEMS.length} itens · recomendado ≥ 6 pra dia disciplinado
        </div>
      </Section>

      {/* Texto livre */}
      <Section title="como foi o dia">
        <textarea
          className="input"
          rows={4}
          disabled={finalized}
          value={form.performance}
          onChange={e => setForm(f => ({ ...f, performance: e.target.value }))}
          placeholder="resultado, emoções, ritmo, contexto..."
          style={{ resize: 'vertical', minHeight: 80 }}
        />
      </Section>

      <Section title="o que aprendi">
        <textarea
          className="input"
          rows={4}
          disabled={finalized}
          value={form.learning}
          onChange={e => setForm(f => ({ ...f, learning: e.target.value }))}
          placeholder="uma lição que leva pra amanhã..."
          style={{ resize: 'vertical', minHeight: 80 }}
        />
      </Section>

      <Section title="não operou hoje?">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: finalized ? 'default' : 'pointer' }}>
          <input
            type="checkbox"
            disabled={finalized}
            checked={form.did_not_trade}
            onChange={e => setForm(f => ({ ...f, did_not_trade: e.target.checked }))}
          />
          não operei hoje (reflection day)
        </label>
      </Section>

      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        <button onClick={finalize} disabled={saving} className="btn btn-primary">
          {saving ? 'finalizando...' : finalized ? 'atualizar resumo' : '🔒 finalizar o dia'}
        </button>
        <button onClick={() => modal ? onClose?.() : nav('/app/diario')} className="btn btn-ghost">{modal ? 'fechar' : 'voltar'}</button>
      </div>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div className="card" style={{ padding: '11px 13px' }}>
      <div className="label-muted" style={{ fontSize: 9, marginBottom: 6 }}>{label}</div>
      <div style={{
        fontSize: 16, fontWeight: 500,
        color: color || 'var(--text-primary)',
        fontFamily: 'var(--font-mono)',
      }}>{value}</div>
    </div>
  )
}
