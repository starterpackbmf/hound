import React, { useEffect, useState } from 'react'
import { getMyMentorshipSessions } from '../../lib/feedback'
import { PageTitle, Placeholder, Loading } from './ui'

export default function Sessoes() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyMentorshipSessions().then(setList).finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ maxWidth: 780 }}>
      <PageTitle eyebrow="MONITORIA" sub="resumos das suas sessões de monitoria.">
        sessões
      </PageTitle>

      {loading ? <Loading />
       : list.length === 0 ? (
          <Placeholder title="nenhuma sessão registrada" subtitle="depois de cada monitoria, o monitor registra um resumo que aparece aqui." />
       ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(s => (
            <div key={s.id} className="card" style={{ padding: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 10, color: 'var(--purple)' }}>
                {new Date(s.session_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.65, whiteSpace: 'pre-wrap', marginBottom: 14 }}>
                {s.summary}
              </div>
              <Field label="ajustes técnicos" value={s.technical_adjustments} />
              <Field label="observações emocionais" value={s.emotional_observations} />
              <Field label="estratégias sugeridas" value={s.suggested_strategies} />
              <Field label="próximo foco" value={s.next_focus} highlight />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, value, highlight }) {
  if (!value) return null
  return (
    <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: `2px solid ${highlight ? 'var(--cyan)' : 'var(--border)'}` }}>
      <div style={{ fontSize: 9, color: highlight ? 'var(--cyan)' : 'var(--text-muted)', letterSpacing: '0.12em', marginBottom: 3, fontWeight: 500 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
        {value}
      </div>
    </div>
  )
}
