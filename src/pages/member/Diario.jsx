import React from 'react'
import { PageTitle, Section } from './ui'
import { IArrowRight, IPencil } from '../../components/icons'

const DIARIO_URL = import.meta.env.VITE_DIARIO_URL || 'https://diario-matilha.lovable.app'

export default function Diario() {
  return (
    <div style={{ maxWidth: 1040 }}>
      <PageTitle eyebrow="A MATILHA" sub="registro de trades, métricas, checklists — tudo integrado ao seu progresso na matilha.">
        diário de trade
      </PageTitle>

      <Section title="acesso">
        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 8, flexShrink: 0,
            background: 'var(--amber-dim-15)', color: 'var(--amber)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IPencil size={20} stroke={1.6} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
              diário externo (Lovable)
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
              o app que você já usa fica aqui fora por enquanto. dados aparecem no dashboard e em destaques, mas o registro é nele. em breve migra pra dentro.
            </div>
            <a href={DIARIO_URL} target="_blank" rel="noreferrer" className="btn btn-primary">
              abrir diário <IArrowRight size={12} stroke={2} />
            </a>
          </div>
        </div>
      </Section>
    </div>
  )
}
