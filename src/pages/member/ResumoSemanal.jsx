import React, { useEffect, useState } from 'react'
import { listMyReports, generateReport, currentWeek, getReportForWeek } from '../../lib/wolf'
import { PageTitle, Section, Placeholder, ErrorBox, Loading } from './ui'
import { IArrowRight } from '../../components/icons'

export default function ResumoSemanal() {
  const [list, setList] = useState([])
  const [currentReport, setCurrentReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [err, setErr] = useState(null)

  async function reload() {
    try {
      const { start } = currentWeek()
      const [all, current] = await Promise.all([
        listMyReports({ limit: 8 }),
        getReportForWeek(start).catch(() => null),
      ])
      setList(all)
      setCurrentReport(current)
    } catch (e) {
      if (/weekly_ai_reports|does not exist/i.test(e.message)) setErr('rode 0011_align_lovable.sql primeiro.')
      else setErr(e.message)
    } finally { setLoading(false) }
  }

  useEffect(() => { reload() }, [])

  async function onGenerate() {
    setGenerating(true); setErr(null)
    try {
      await generateReport()
      await reload()
    } catch (e) { setErr(e.message) } finally { setGenerating(false) }
  }

  if (loading) return <Loading />

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      <PageTitle eyebrow="APRENDIZADO" sub="seu mentor de trading com IA — resumos semanais baseados no seu diário.">
        w.o.l.f ai
      </PageTitle>

      {err && <ErrorBox>{err}</ErrorBox>}

      {/* Esta semana */}
      {!currentReport ? (
        <div className="card" style={{ padding: 20, marginBottom: 24, borderColor: 'var(--cyan-dim-20)' }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>ESTA SEMANA</div>
          <div style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 10, fontWeight: 500 }}>
            Ainda não gerou o resumo desta semana
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
            o w.o.l.f lê seu diário da semana (trades + emoções + feedback do monitor) e gera uma análise personalizada com 3-5 dicas e 3-5 ações concretas.
          </div>
          <button onClick={onGenerate} disabled={generating} className="btn btn-primary">
            {generating ? 'gerando...' : 'gerar resumo desta semana'}
          </button>
        </div>
      ) : (
        <ReportCard report={currentReport} highlight />
      )}

      {/* Histórico */}
      {list.filter(r => r.id !== currentReport?.id).length > 0 && (
        <Section title="histórico">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {list.filter(r => r.id !== currentReport?.id).map(r => <ReportCard key={r.id} report={r} />)}
          </div>
        </Section>
      )}
    </div>
  )
}

function ReportCard({ report: r, highlight }) {
  const [expanded, setExpanded] = useState(highlight)
  return (
    <div className="card" style={{
      padding: 16,
      borderColor: highlight ? 'var(--cyan-dim-20)' : 'var(--border)',
      background: highlight ? 'var(--cyan-dim)' : 'var(--surface-1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--cyan)', letterSpacing: '0.14em', fontWeight: 600 }}>
            SEMANA · {fmtRange(r.week_start, r.week_end)}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            {r.model} · {new Date(r.generated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        {!highlight && (
          <button onClick={() => setExpanded(e => !e)} className="btn btn-ghost" style={{ fontSize: 11 }}>
            {expanded ? 'recolher' : 'abrir'}
          </button>
        )}
      </div>

      {(expanded || highlight) && (
        <>
          {r.output_summary && (
            <div style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: 14, whiteSpace: 'pre-wrap' }}>
              {r.output_summary}
            </div>
          )}

          {(r.output_tips || []).length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="label-muted" style={{ marginBottom: 6, color: 'var(--pink)' }}>💡 DICAS</div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                {r.output_tips.map((t, i) => <li key={i} style={{ marginBottom: 4 }}>{t}</li>)}
              </ul>
            </div>
          )}

          {(r.output_actions || []).length > 0 && (
            <div>
              <div className="label-muted" style={{ marginBottom: 6, color: 'var(--cyan)' }}>⚡ AÇÕES</div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                {r.output_actions.map((a, i) => <li key={i} style={{ marginBottom: 4 }}>{a}</li>)}
              </ul>
            </div>
          )}

          {r.input_snapshot && (
            <details style={{ marginTop: 14, fontSize: 11 }}>
              <summary style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>dados que alimentaram o resumo</summary>
              <pre style={{
                marginTop: 8, padding: 10, fontSize: 10,
                background: 'var(--surface-2)', borderRadius: 4,
                color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
                overflow: 'auto', maxHeight: 300,
              }}>{JSON.stringify(r.input_snapshot, null, 2)}</pre>
            </details>
          )}
        </>
      )}
    </div>
  )
}

function fmtRange(start, end) {
  const s = new Date(start + 'T12:00:00'), e = new Date(end + 'T12:00:00')
  return `${s.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} → ${e.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
}
