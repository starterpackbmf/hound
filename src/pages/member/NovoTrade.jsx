import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { InkSelect, InkDate } from '../../components/InkControls'
import {
  listAccounts, getTrade, upsertTrade, calcMediaPonderada, calcResultadoBrl,
  EMOTIONS, EMOTION_TONES, assetMultiplier,
} from '../../lib/trades'
import { earnByRule } from '../../lib/free'
import { getTradeFeedback, saveTradeFeedback, TRADE_STATUS_META } from '../../lib/feedback'
import { getMyProfile } from '../../lib/profile'
import { uploadPrint } from '../../lib/storage'
import { calculateEntryQuality, QUALITY_TO_INT, INT_TO_QUALITY } from '../../lib/tradeCalculations'
import { RulesSelector, FiltersSelector, QualityDisplay, QualityBadge, ResultsPreview } from '../../components/TradeSelectors'
import { PageTitle, Section, ErrorBox, Loading } from './ui'
import { IArrowLeft, IPlus, IX, ICheck, ITarget, IPlay } from '../../components/icons'

const SETUPS = [
  { code: 'TA',  label: 'TA — Trade de Abertura' },
  { code: 'TC',  label: 'TC — Trade de Continuação' },
  { code: 'TRM', label: 'TRM — Retorno às Médias' },
  { code: 'FQ',  label: 'FQ — Falha e Quebra' },
]

const ASSETS = [
  { code: 'WIN', label: 'Mini Índice (WIN)' },
  { code: 'WDO', label: 'Mini Dólar (WDO)' },
]

function todayIso() { return new Date().toISOString().slice(0, 10) }

// (InkSelect + InkDate movidos pra src/components/InkControls.jsx)

function formatTime(v) {
  const digits = (v || '').replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return digits.slice(0, 2) + ':' + digits.slice(2)
}

export default function NovoTrade({ modal = false, onClose, onSaved, defaultDate, tradeId: tradeIdProp } = {}) {
  const { id: routeId } = useParams()
  const id = tradeIdProp || routeId
  const [params] = useSearchParams()
  const nav = useNavigate()
  const isEdit = !!id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [feedback, setFeedback] = useState(null)
  const [isMonitor, setIsMonitor] = useState(false)
  const [tradeOwnerId, setTradeOwnerId] = useState(null)

  const [form, setForm] = useState({
    account_id: '',
    date: defaultDate || params.get('date') || todayIso(),
    horario_entrada: '09:00',
    horario_saida: '09:00',
    ativo: 'WIN',
    setup: '',
    direction: 'compra',
    contratos_iniciais: 1,
    men_pts: '',
    mep_pts: '',
    partials: [],
    encerramento_pts: '',
    emotions: [],
    followed_plan: null,
    leitura_tecnica: '',
    print_url: '',
    selected_rules: [],
    selected_filters: [],
  })
  const [uploadingPrint, setUploadingPrint] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const accs = await listAccounts()
        setAccounts(accs)
        const defaultAcc = accs.find(a => a.is_default) || accs[0]
        if (defaultAcc && !form.account_id) {
          setForm(f => ({ ...f, account_id: defaultAcc.id }))
        }

        getMyProfile().then(p => {
          setIsMonitor((p?.roles || []).some(r => ['monitor', 'admin'].includes(r)))
        }).catch(() => {})

        if (isEdit) {
          const t = await getTrade(id)
          if (t) {
            setTradeOwnerId(t.user_id)
            getTradeFeedback(id).then(setFeedback).catch(() => {})
            setForm({
              account_id: t.account_id || '',
              date: t.date,
              horario_entrada: t.horario_entrada || '09:00',
              horario_saida: t.horario_saida || '09:00',
              ativo: t.ativo,
              setup: t.setup,
              direction: t.direction,
              contratos_iniciais: t.contratos_iniciais,
              men_pts: t.men_pts ?? '',
              mep_pts: t.mep_pts ?? '',
              partials: t.partials || [],
              encerramento_pts: t.encerramento_pts ?? '',
              emotions: t.emotions || [],
              followed_plan: t.followed_plan,
              leitura_tecnica: t.leitura_tecnica || '',
              print_url: t.print_url || '',
              selected_rules: t.selected_rules || [],
              selected_filters: t.selected_filters || [],
            })
          }
        }
      } catch (e) {
        setErr(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  const saldoAberto = useMemo(() => {
    const c = Number(form.contratos_iniciais) || 0
    const used = (form.partials || []).reduce((a, p) => a + (Number(p.contratos) || 0), 0)
    return Math.max(0, c - used)
  }, [form.contratos_iniciais, form.partials])

  const mediaPonderada = useMemo(() => {
    return calcMediaPonderada(form.partials, form.encerramento_pts, form.contratos_iniciais)
  }, [form.partials, form.encerramento_pts, form.contratos_iniciais])

  const resultadoBrl = useMemo(() => {
    return calcResultadoBrl(mediaPonderada, form.contratos_iniciais, form.ativo)
  }, [mediaPonderada, form.contratos_iniciais, form.ativo])

  const entryQuality = useMemo(() => {
    return calculateEntryQuality(form.selected_rules, form.selected_filters, form.setup)
  }, [form.selected_rules, form.selected_filters, form.setup])

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function toggleEmotion(e) {
    setForm(f => {
      const has = f.emotions.includes(e)
      if (has) return { ...f, emotions: f.emotions.filter(x => x !== e) }
      if (f.emotions.length >= 3) return f
      return { ...f, emotions: [...f.emotions, e] }
    })
  }

  function addParcial() {
    setForm(f => ({ ...f, partials: [...f.partials, { pts: '', contratos: 1, horario: '' }] }))
  }
  function updateParcial(i, key, val) {
    setForm(f => ({
      ...f,
      partials: f.partials.map((p, idx) => idx === i ? { ...p, [key]: val } : p),
    }))
  }
  function removeParcial(i) {
    setForm(f => ({ ...f, partials: f.partials.filter((_, idx) => idx !== i) }))
  }

  async function save() {
    setSaving(true); setErr(null)
    try {
      const payload = {
        ...(isEdit ? { id } : {}),
        account_id: form.account_id || null,
        date: form.date,
        horario_entrada: form.horario_entrada || null,
        horario_saida: form.horario_saida || null,
        ativo: (form.ativo || '').toUpperCase().trim(),
        setup: form.setup,
        direction: form.direction,
        contratos_iniciais: Number(form.contratos_iniciais) || 1,
        men_pts: form.men_pts === '' ? null : Number(form.men_pts),
        mep_pts: form.mep_pts === '' ? null : Number(form.mep_pts),
        partials: (form.partials || []).map(p => ({
          pts: Number(p.pts) || 0,
          contratos: Number(p.contratos) || 0,
          horario: p.horario || null,
        })),
        encerramento_pts: form.encerramento_pts === '' ? null : Number(form.encerramento_pts),
        media_ponderada: mediaPonderada,
        resultado_brl: resultadoBrl,
        emotions: form.emotions,
        followed_plan: entryQuality.followedPlan,
        leitura_tecnica: form.leitura_tecnica || null,
        print_url: form.print_url || null,
        selected_rules: form.selected_rules,
        selected_filters: form.selected_filters,
        entry_quality: QUALITY_TO_INT[entryQuality.quality] ?? null,
      }
      const saved = await upsertTrade(payload)
      if (!isEdit) {
        earnByRule('trade_registered', `trade ${saved.ativo} ${saved.setup}`).catch(() => {})
      }
      if (modal && onSaved) {
        onSaved(saved)
      } else {
        nav('/app/diario?date=' + form.date, { replace: true })
      }
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div className={modal ? 'ink-modal' : ''} style={modal ? undefined : { maxWidth: 780 }}>
      {!modal && (
        <div style={{ marginBottom: 16 }}>
          <Link to={`/app/diario?date=${form.date}`} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, color: 'var(--text-muted)',
          }}>
            <IArrowLeft size={12} stroke={1.6} />
            voltar pro diário
          </Link>
        </div>
      )}

      <header style={{ marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{
            fontSize: modal ? 28 : 26, fontWeight: 700, letterSpacing: '0.02em',
            margin: 0, color: 'var(--ink-text, var(--text-primary))',
            textTransform: 'uppercase',
          }}>
            {isEdit ? 'Editar Operação' : 'Registro de Operação'}
          </h1>
          <p style={{ fontSize: 11, color: 'var(--ink-dim, var(--text-muted))', marginTop: 4, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em' }}>
            Protocolo de Performance · V3.0
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <QualityBadge quality={entryQuality.quality} score={entryQuality.score} />
          {modal && onClose && (
            <button onClick={onClose} style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--ink-line, var(--border))',
              color: 'var(--ink-muted, var(--text-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'background .12s',
            }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
               onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              title="fechar">
              <IX size={16} stroke={1.8} />
            </button>
          )}
        </div>
      </header>

      {err && <div style={{ marginBottom: 16 }}><ErrorBox>{err}</ErrorBox></div>}

      {feedback && <FeedbackBanner feedback={feedback} />}

      {isEdit && isMonitor && tradeOwnerId && (
        <FeedbackEditor
          tradeId={id}
          studentId={tradeOwnerId}
          existing={feedback}
          onSaved={fb => setFeedback(fb)}
        />
      )}

      <div style={modal ? { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 24, alignItems: 'start' } : undefined}>
      {/* ────── COLUNA ESQUERDA ────── */}
      <div>
      {/* IDENTIFICAÇÃO */}
      <Section title="identificação">
        {accounts.length > 1 && (
          <div style={{ marginBottom: 12 }}>
            <Field label="conta">
              <InkSelect
                value={form.account_id}
                onChange={v => set('account_id', v)}
                options={accounts.map(a => ({ value: a.id, label: a.name }))}
              />
            </Field>
          </div>
        )}
        {/* Row 1: data + entrada + saída — 3 colunas balanceadas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <Field label="data">
            <InkDate value={form.date} onChange={v => set('date', v)} />
          </Field>
          <Field label="entrada">
            <input className="input" type="text" inputMode="numeric" maxLength={5}
              value={form.horario_entrada}
              onChange={e => set('horario_entrada', formatTime(e.target.value))}
              placeholder="HH:MM"
              style={{ fontFamily: 'JetBrains Mono, monospace', textAlign: 'center' }} />
          </Field>
          <Field label="saída">
            <input className="input" type="text" inputMode="numeric" maxLength={5}
              value={form.horario_saida}
              onChange={e => set('horario_saida', formatTime(e.target.value))}
              placeholder="HH:MM"
              style={{ fontFamily: 'JetBrains Mono, monospace', textAlign: 'center' }} />
          </Field>
        </div>
        {/* Row 2: ativo + setup + direção */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="ativo financeiro">
            <InkSelect
              value={form.ativo}
              onChange={v => set('ativo', v)}
              options={ASSETS.map(a => ({ value: a.code, label: a.label }))}
            />
          </Field>
          <Field label="setup">
            <InkSelect
              value={form.setup}
              onChange={v => set('setup', v)}
              options={SETUPS.map(s => ({ value: s.code, label: s.label }))}
              placeholder="Selecione"
            />
          </Field>
          <Field label="direção">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <button
                type="button"
                onClick={() => set('direction', 'compra')}
                style={{
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: `1px solid ${form.direction === 'compra' ? 'rgba(24,209,138,0.5)' : 'var(--ink-line)'}`,
                  background: form.direction === 'compra' ? 'rgba(24,209,138,0.14)' : 'rgba(255,255,255,0.02)',
                  color: form.direction === 'compra' ? 'var(--ink-green)' : 'var(--ink-muted)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all .15s ease',
                  boxShadow: form.direction === 'compra' ? '0 0 14px rgba(24,209,138,0.22)' : 'none',
                  height: '100%',
                }}
              >
                ▲ Compra
              </button>
              <button
                type="button"
                onClick={() => set('direction', 'venda')}
                style={{
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: `1px solid ${form.direction === 'venda' ? 'rgba(255,84,112,0.5)' : 'var(--ink-line)'}`,
                  background: form.direction === 'venda' ? 'rgba(255,84,112,0.14)' : 'rgba(255,255,255,0.02)',
                  color: form.direction === 'venda' ? 'var(--ink-red)' : 'var(--ink-muted)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all .15s ease',
                  boxShadow: form.direction === 'venda' ? '0 0 14px rgba(255,84,112,0.22)' : 'none',
                  height: '100%',
                }}
              >
                ▼ Venda
              </button>
            </div>
          </Field>
        </div>
      </Section>

      {/* REGRAS + FILTROS — expande de cima pra baixo empurrando o resto */}
      <div style={{
        display: 'grid',
        gridTemplateRows: form.setup ? '1fr' : '0fr',
        opacity: form.setup ? 1 : 0,
        transition: 'grid-template-rows 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 280ms ease-out',
      }}>
        <div style={{ overflow: 'hidden' }}>
          {form.setup && (
            <Section title="protocolo de entrada">
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                <RulesSelector
                  operational={form.setup}
                  selectedRules={form.selected_rules}
                  onChange={rules => set('selected_rules', rules)}
                />
                <FiltersSelector
                  operational={form.setup}
                  selectedFilters={form.selected_filters}
                  onChange={filters => set('selected_filters', filters)}
                />
              </div>
            </Section>
          )}
        </div>
      </div>

      {/* EXECUÇÃO */}
      <Section title="execução e métricas">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
          <Field label="contratos iniciais">
            <input className="input" type="number" min="1" value={form.contratos_iniciais} onChange={e => set('contratos_iniciais', e.target.value)} />
          </Field>
          <Field label="MEN (calor) pts">
            <input className="input" type="number" step="0.5" value={form.men_pts} onChange={e => set('men_pts', e.target.value)} placeholder="-125" />
          </Field>
          <Field label="MEP (favor) pts">
            <input className="input" type="number" step="0.5" value={form.mep_pts} onChange={e => set('mep_pts', e.target.value)} placeholder="+320" />
          </Field>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="label-muted">saídas parciais</span>
            <button type="button" onClick={addParcial} className="btn btn-ghost" style={{ fontSize: 11 }}>
              <IPlus size={11} stroke={2} /> adicionar parcial
            </button>
          </div>
          {form.partials.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '8px 0' }}>nenhuma parcial registrada</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {form.partials.map((p, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', width: 24 }}>#{i + 1}</span>
                  <input className="input" type="number" min="1" placeholder="contratos" value={p.contratos} onChange={e => updateParcial(i, 'contratos', e.target.value)} />
                  <input className="input" type="number" step="0.5" placeholder="pts" value={p.pts} onChange={e => updateParcial(i, 'pts', e.target.value)} />
                  <input className="input" type="time" value={p.horario || ''} onChange={e => updateParcial(i, 'horario', e.target.value)} />
                  <button type="button" onClick={() => removeParcial(i)} className="btn btn-ghost" style={{ padding: 6 }}>
                    <IX size={11} stroke={1.8} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {!modal && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              <Field label="saldo em aberto">
                <div className="input" style={{ opacity: 0.7, fontFamily: 'var(--font-mono)' }}>
                  {saldoAberto} contrato{saldoAberto === 1 ? '' : 's'}
                </div>
              </Field>
              <Field label="encerramento final (pts)">
                <input className="input" type="number" step="0.5" value={form.encerramento_pts} onChange={e => set('encerramento_pts', e.target.value)} placeholder={saldoAberto > 0 ? 'pts do saldo restante' : 'não há saldo aberto'} disabled={saldoAberto === 0} />
              </Field>
              <Field label="média ponderada (calc)">
                <div className="input" style={{ opacity: 0.7, fontFamily: 'var(--font-mono)' }}>
                  {mediaPonderada.toFixed(1)} pts
                </div>
              </Field>
              <Field label="resultado R$ (calc)">
                <div className="input" style={{
                  opacity: 0.95, fontFamily: 'var(--font-mono)',
                  color: resultadoBrl > 0 ? 'var(--up)' : resultadoBrl < 0 ? 'var(--down)' : 'var(--text-primary)',
                  fontWeight: 500,
                }}>
                  {resultadoBrl >= 0 ? '+' : ''}R$ {resultadoBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </Field>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
              multiplicador {form.ativo}: R$ {assetMultiplier(form.ativo).toFixed(2)}/pt
            </div>
            <div style={{ marginTop: 14 }}>
              <ResultsPreview
                totalPoints={mediaPonderada}
                resultBrl={resultadoBrl}
                initialContracts={Number(form.contratos_iniciais) || 0}
                asset={form.ativo}
              />
            </div>
          </>
        )}
      </Section>

      {/* LEITURA TÉCNICA — só no modo full page; no modal vai pra direita */}
      {!modal && <Section title="leitura técnica">
        <textarea
          className="input"
          rows={4}
          style={{ resize: 'vertical', minHeight: 90 }}
          placeholder="o que viu no gráfico? porquê entrou? o que faria diferente?"
          value={form.leitura_tecnica}
          onChange={e => set('leitura_tecnica', e.target.value)}
        />
      </Section>}

      {/* PRINT */}
      <Section title="print da operação">
        <PrintUploader value={form.print_url} onChange={v => set('print_url', v)} />
      </Section>

      {/* BOTÕES — no modal ficam dentro da coluna esquerda, debaixo do print */}
      {modal && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={save} disabled={saving} className="btn btn-primary"
            style={{ padding: '11px 26px', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700, minWidth: 220, justifyContent: 'center' }}>
            {saving ? 'gravando...' : isEdit ? 'atualizar operação' : 'gravar operação'}
          </button>
          <button onClick={onClose} className="btn"
            style={{ padding: '11px 22px', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
            descartar
          </button>
        </div>
      )}
      </div>
      {/* ────── COLUNA DIREITA ────── */}
      {modal && (
        <aside style={{ position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* RESUMO DA OPERAÇÃO */}
          <div className="ink-card" style={{ padding: 18 }}>
            <div className="label-muted" style={{ marginBottom: 14, fontSize: 10, letterSpacing: '0.14em' }}>
              📊 RESUMO DA OPERAÇÃO
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '0.12em', fontWeight: 600, marginBottom: 6 }}>RESULTADO FINANCEIRO</div>
                <div className="ink-num" style={{ fontSize: 22, fontWeight: 600, color: resultadoBrl > 0 ? 'var(--ink-green)' : resultadoBrl < 0 ? 'var(--ink-red)' : 'var(--ink-text)', lineHeight: 1 }}>
                  {resultadoBrl >= 0 ? '' : '−'}R$ {Math.abs(resultadoBrl).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'var(--ink-dim)', letterSpacing: '0.12em', fontWeight: 600, marginBottom: 6 }}>MÉDIA PONDERADA</div>
                <div className="ink-num" style={{ fontSize: 22, fontWeight: 600, color: mediaPonderada > 0 ? 'var(--ink-green)' : mediaPonderada < 0 ? 'var(--ink-red)' : 'var(--ink-text)', lineHeight: 1 }}>
                  {mediaPonderada.toFixed(1)} <span style={{ fontSize: 11, opacity: 0.55 }}>pts</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 14, borderTop: '1px solid var(--ink-line)' }}>
              <Field label="saldo em aberto">
                <div className="input" style={{ opacity: 0.7, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {saldoAberto} contrato{saldoAberto === 1 ? '' : 's'}
                </div>
              </Field>
              <Field label="encerramento final">
                <input
                  className="input" type="number" step="0.5" style={{ fontSize: 12 }}
                  value={form.encerramento_pts}
                  onChange={e => set('encerramento_pts', e.target.value)}
                  placeholder={saldoAberto > 0 ? 'pts' : '—'}
                  disabled={saldoAberto === 0}
                />
              </Field>
            </div>
            <div style={{ fontSize: 9, color: 'var(--ink-faint)', marginTop: 10, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em' }}>
              {form.ativo} · R$ {assetMultiplier(form.ativo).toFixed(2)}/pt
            </div>
          </div>

          {/* EMOCIONAL — 3 colunas: positivas / neutras / negativas */}
          <Section title={`estado emocional (máx 3) — ${form.emotions.length}/3`}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: '▲ positivas', tone: 'up', color: 'var(--ink-green)' },
                { label: '● neutras', tone: 'neutral', color: 'var(--ink-muted)' },
                { label: '▼ negativas', tone: 'down', color: 'var(--ink-red)' },
              ].map(group => (
                <div key={group.tone} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.1em', color: group.color, fontWeight: 600, marginBottom: 2 }}>
                    {group.label}
                  </div>
                  {EMOTIONS.filter(e => EMOTION_TONES[e] === group.tone).map(e => {
                    const selected = form.emotions.includes(e)
                    const toneClass = selected ? (group.tone === 'up' ? 'pill-up' : group.tone === 'down' ? 'pill-down' : 'pill-active') : ''
                    return (
                      <button
                        key={e}
                        type="button"
                        onClick={() => toggleEmotion(e)}
                        disabled={!selected && form.emotions.length >= 3}
                        className={`pill ${toneClass}`}
                        style={{
                          cursor: selected || form.emotions.length < 3 ? 'pointer' : 'not-allowed',
                          opacity: !selected && form.emotions.length >= 3 ? 0.4 : 1,
                          justifyContent: 'center', fontSize: 11,
                        }}
                      >
                        {e}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </Section>

          {/* LEITURA TÉCNICA — no modal fica na direita */}
          <Section title="leitura técnica">
            <textarea
              className="input"
              rows={4}
              style={{ resize: 'vertical', minHeight: 88 }}
              placeholder="o que viu no gráfico? porquê entrou? o que faria diferente?"
              value={form.leitura_tecnica}
              onChange={e => set('leitura_tecnica', e.target.value)}
            />
          </Section>

        </aside>
      )}
      </div>

      {/* No modo full-page (não-modal), botões abaixo do form todo */}
      {!modal && (
        <div style={{
          display: 'flex', gap: 10, alignItems: 'center',
          marginTop: 20,
        }}>
          <button onClick={save} disabled={saving} className="btn btn-primary"
            style={{ padding: '10px 26px', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700, minWidth: 200, justifyContent: 'center' }}>
            {saving ? 'gravando...' : isEdit ? 'atualizar operação' : 'gravar operação'}
          </button>
          <Link to={`/app/diario?date=${form.date}`} className="btn"
            style={{ padding: '10px 22px', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
            descartar
          </Link>
        </div>
      )}
    </div>
  )
}

function PrintUploader({ value, onChange }) {
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [justPasted, setJustPasted] = useState(false)
  const fileRef = React.useRef(null)

  async function handleFile(f) {
    if (!f) return
    setUploading(true); setErr(null)
    try {
      const { url } = await uploadPrint(f)
      onChange(url)
    } catch (ex) { setErr(ex.message) } finally { setUploading(false) }
  }

  async function onFile(e) {
    await handleFile(e.target.files?.[0])
    e.target.value = ''
  }

  function onDrop(e) {
    e.preventDefault(); e.stopPropagation(); setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  // Ctrl+V global: cola imagem do clipboard quando o modal/página está aberta
  // e nenhum input de texto tá focado.
  React.useEffect(() => {
    if (value) return // já tem print, não escuta paste
    function onPaste(e) {
      // ignora se o foco tá num input/textarea (deixa o paste normal acontecer)
      const tag = (document.activeElement?.tagName || '').toLowerCase()
      const editable = document.activeElement?.isContentEditable
      if (['input', 'textarea', 'select'].includes(tag) || editable) return

      const items = e.clipboardData?.items || []
      for (const it of items) {
        if (it.type?.startsWith('image/')) {
          const file = it.getAsFile()
          if (file) {
            e.preventDefault()
            setJustPasted(true)
            setTimeout(() => setJustPasted(false), 600)
            handleFile(file)
            return
          }
        }
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [value])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {value ? (
        <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--ink-line, var(--border))' }}>
          <img src={value} alt="print"
            style={{ display: 'block', width: '100%', maxHeight: 280, objectFit: 'contain', background: 'rgba(255,255,255,0.02)' }}
            onError={e => { e.currentTarget.style.display = 'none' }} />
          <button type="button" onClick={() => onChange('')}
            style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, background: 'rgba(0,0,0,0.6)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '12px 16px',
            borderRadius: 8,
            border: `1.5px dashed ${dragOver || justPasted ? 'var(--ink-green)' : 'rgba(24,209,138,0.3)'}`,
            background: dragOver || justPasted ? 'rgba(24,209,138,0.12)' : 'rgba(24,209,138,0.02)',
            color: 'var(--ink-text, var(--text-primary))',
            cursor: uploading ? 'wait' : 'pointer',
            transition: 'border-color .25s, background .25s',
            width: '100%',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink-green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.9, flexShrink: 0 }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-green)' }}>
            {uploading ? 'enviando…' : justPasted ? 'colado!' : 'Upload, arraste ou cole (Ctrl+V)'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-muted, var(--text-muted))' }}>
            · jpg/png até 5MB
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onFile} style={{ display: 'none' }} disabled={uploading} />
        </button>
      )}

      {!value && (
        <input
          className="input"
          type="url"
          placeholder="https://imgur.com/..."
          value={typeof value === 'string' && value.startsWith('http') ? value : ''}
          onChange={e => onChange(e.target.value)}
          style={{ fontSize: 11.5 }}
        />
      )}
      {err && <div style={{ fontSize: 11, color: 'var(--down)' }}>{err}</div>}
    </div>
  )
}

function FeedbackEditor({ tradeId, studentId, existing, onSaved }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState(existing?.status || 'OK')
  const [text, setText] = useState(existing?.feedback || '')
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    try {
      const fb = await saveTradeFeedback({
        trade_id: tradeId,
        student_id: studentId,
        status,
        feedback: text.trim() || null,
      })
      onSaved?.(fb)
      setOpen(false)
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn btn-outline-purple" style={{ marginBottom: 20 }}>
        {existing ? '✎ editar feedback' : '＋ dar feedback (monitor)'}
      </button>
    )
  }

  return (
    <div className="card" style={{ padding: 16, marginBottom: 20, borderColor: 'var(--purple-dim-20)' }}>
      <div className="eyebrow" style={{ color: 'var(--purple)', marginBottom: 10 }}>FEEDBACK DO MONITOR</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {Object.entries(TRADE_STATUS_META).map(([key, m]) => (
          <button key={key} onClick={() => setStatus(key)}
            className={status === key ? 'pill' : 'pill'}
            style={{
              cursor: 'pointer',
              background: status === key ? m.bg : 'var(--surface-1)',
              borderColor: status === key ? m.color : 'var(--border)',
              color: status === key ? m.color : 'var(--text-secondary)',
            }}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>
      <textarea className="input" rows={3} style={{ resize: 'vertical', marginBottom: 10 }}
        placeholder="feedback técnico / emocional / ajuste pro próximo trade..."
        value={text} onChange={e => setText(e.target.value)} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={submit} disabled={saving} className="btn btn-primary">
          {saving ? 'salvando...' : 'salvar feedback'}
        </button>
        <button onClick={() => setOpen(false)} className="btn btn-ghost">cancelar</button>
      </div>
    </div>
  )
}

function FeedbackBanner({ feedback: f }) {
  const meta = TRADE_STATUS_META[f.status] || TRADE_STATUS_META.OK
  return (
    <div style={{
      marginBottom: 20, padding: 14,
      background: meta.bg, border: `1px solid ${meta.color}44`, borderRadius: 8,
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 6,
        background: meta.color, color: '#0a0a0e',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 700, flexShrink: 0,
      }}>{meta.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: meta.color, fontWeight: 600, letterSpacing: '0.14em' }}>
            FEEDBACK DO MONITOR · {meta.label}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {new Date(f.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </span>
        </div>
        {f.feedback && (
          <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
            {f.feedback}
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="label-muted">{label}</span>
      {children}
    </label>
  )
}
