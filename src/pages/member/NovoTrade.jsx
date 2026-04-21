import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
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

export default function NovoTrade({ modal = false, onClose, onSaved, defaultDate } = {}) {
  const { id } = useParams()
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
    setup: 'TA',
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
    <div style={{ maxWidth: 780 }}>
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

      <header style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>REGISTRO DE OPERAÇÃO</div>
          <h1 className="display" style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.02em', margin: 0 }}>
            {isEdit ? 'Editar trade' : 'Novo trade'}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
            Protocolo de Performance · V3.0
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <QualityBadge quality={entryQuality.quality} score={entryQuality.score} />
          {modal && onClose && (
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }} title="fechar">
              <IX size={14} stroke={1.8} />
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

      <div style={modal ? { columnCount: 2, columnGap: 28, columnFill: 'balance' } : undefined}>
      {/* IDENTIFICAÇÃO */}
      <Section title="identificação">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {accounts.length > 1 && (
            <Field label="conta">
              <select className="input" value={form.account_id} onChange={e => set('account_id', e.target.value)}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="data">
            <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </Field>
          <Field label="entrada">
            <input className="input" type="time" value={form.horario_entrada} onChange={e => set('horario_entrada', e.target.value)} />
          </Field>
          <Field label="saída">
            <input className="input" type="time" value={form.horario_saida} onChange={e => set('horario_saida', e.target.value)} />
          </Field>
          <Field label="ativo financeiro">
            <select className="input" value={form.ativo} onChange={e => set('ativo', e.target.value)}>
              {ASSETS.map(a => <option key={a.code} value={a.code}>{a.label}</option>)}
            </select>
          </Field>
          <Field label="setup">
            <select className="input" value={form.setup} onChange={e => set('setup', e.target.value)}>
              {SETUPS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <span className="label-muted" style={{ marginBottom: 6, display: 'block' }}>direção</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={() => set('direction', 'compra')} className={form.direction === 'compra' ? 'pill pill-up' : 'pill'} style={{ cursor: 'pointer' }}>
              ▲ Compra
            </button>
            <button type="button" onClick={() => set('direction', 'venda')} className={form.direction === 'venda' ? 'pill pill-down' : 'pill'} style={{ cursor: 'pointer' }}>
              ▼ Venda
            </button>
          </div>
        </div>
      </Section>

      {/* REGRAS + FILTROS (qualidade aparece no badge do header) */}
      <Section title="protocolo de entrada">
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
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
      </Section>

      {/* EMOCIONAL */}
      <Section title={`estado emocional (máx 3) — ${form.emotions.length}/3 selecionados`}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {EMOTIONS.map(e => {
            const selected = form.emotions.includes(e)
            const tone = EMOTION_TONES[e]
            const toneClass = selected ? (tone === 'up' ? 'pill-up' : tone === 'down' ? 'pill-down' : 'pill-active') : ''
            return (
              <button
                key={e}
                type="button"
                onClick={() => toggleEmotion(e)}
                disabled={!selected && form.emotions.length >= 3}
                className={`pill ${toneClass}`}
                style={{ cursor: selected || form.emotions.length < 3 ? 'pointer' : 'not-allowed', opacity: !selected && form.emotions.length >= 3 ? 0.4 : 1 }}
              >
                {e}
              </button>
            )
          })}
        </div>
      </Section>

      {/* LEITURA TÉCNICA */}
      <Section title="leitura técnica">
        <textarea
          className="input"
          rows={4}
          style={{ resize: 'vertical', minHeight: 90 }}
          placeholder="o que viu no gráfico? porquê entrou? o que faria diferente?"
          value={form.leitura_tecnica}
          onChange={e => set('leitura_tecnica', e.target.value)}
        />
      </Section>

      {/* PRINT */}
      <Section title="print da operação">
        <PrintUploader value={form.print_url} onChange={v => set('print_url', v)} />
      </Section>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        <button onClick={save} disabled={saving} className="btn btn-primary">
          {saving ? 'gravando...' : isEdit ? 'atualizar' : 'gravar operação'}
        </button>
        {modal && onClose ? (
          <button onClick={onClose} className="btn btn-ghost">descartar</button>
        ) : (
          <Link to={`/app/diario?date=${form.date}`} className="btn btn-ghost">descartar</Link>
        )}
        {!isEdit && <span style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center', fontFamily: 'var(--font-mono)' }}>+3 SC ao registrar</span>}
      </div>
    </div>
  )
}

function PrintUploader({ value, onChange }) {
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState(null)

  async function onFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setUploading(true); setErr(null)
    try {
      const { url } = await uploadPrint(f)
      onChange(url)
    } catch (ex) { setErr(ex.message) } finally { setUploading(false); e.target.value = '' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {value && (
        <div style={{ position: 'relative' }}>
          <img src={value} alt="print"
            style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 8, border: '1px solid var(--border)', objectFit: 'contain', background: 'var(--surface-2)' }}
            onError={e => { e.currentTarget.style.display = 'none' }} />
          <button type="button" onClick={() => onChange('')}
            style={{ position: 'absolute', top: 8, right: 8, background: '#00000099', color: 'white', border: '1px solid #ffffff33', borderRadius: 4, padding: '4px 8px', fontSize: 10 }}>
            remover
          </button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <label className={uploading ? 'btn' : 'btn btn-outline-cyan'} style={{ cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
          {uploading ? 'enviando...' : '📷 upload (jpg/png até 5MB)'}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onFile} style={{ display: 'none' }} disabled={uploading} />
        </label>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>ou cole um link:</span>
        <input
          className="input"
          type="url"
          placeholder="https://imgur.com/..."
          value={value?.startsWith('http') ? value : ''}
          onChange={e => onChange(e.target.value)}
          style={{ flex: 1, minWidth: 200, fontSize: 11 }}
        />
      </div>
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
