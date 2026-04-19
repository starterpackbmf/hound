import React, { useEffect, useState } from 'react'
import { listPartners } from '../../lib/free'
import { PageTitle, Placeholder, ErrorBox, Loading } from './ui'
import { IArrowRight, IExternalLink } from '../../components/icons'

const KIND_LABELS = {
  corretora: 'CORRETORA',
  fintech: 'FINTECH',
  curso: 'CURSO',
  outros: 'PARCERIA',
}

export default function Parcerias() {
  const [partners, setPartners] = useState([])
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listPartners().then(setPartners).catch(e => setErr(e.message)).finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ maxWidth: 1040 }}>
      <PageTitle eyebrow="COMUNIDADE" sub="corretoras e ferramentas recomendadas pela matilha. abrir conta pelos links libera bônus exclusivos.">
        parcerias
      </PageTitle>

      {err ? <ErrorBox>erro: {err} — rode <code>0005_free.sql</code>.</ErrorBox>
       : loading ? <Loading />
       : partners.length === 0 ? (
          <Placeholder title="nenhuma parceria cadastrada" subtitle="cadastre em public.partners no Supabase." />
       ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
          {partners.map(p => (
            <a key={p.id} href={p.cta_url} target="_blank" rel="noreferrer" className="card card-hover" style={{
              display: 'flex', flexDirection: 'column', gap: 12, padding: 18,
              color: 'var(--text-primary)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                {p.logo_url ? (
                  <img src={p.logo_url} alt="" style={{ width: 44, height: 44, borderRadius: 6, background: 'var(--surface-2)', padding: 4, objectFit: 'contain' }} />
                ) : (
                  <div style={{
                    width: 44, height: 44, borderRadius: 6,
                    background: 'var(--amber-dim-15)', color: 'var(--amber)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><IExternalLink size={18} stroke={1.5} /></div>
                )}
                <div style={{ flex: 1 }}>
                  <div className="label-muted" style={{ fontSize: 9, marginBottom: 4 }}>{KIND_LABELS[p.kind] || 'PARCERIA'}</div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>{p.name}</div>
                </div>
              </div>

              {p.description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{p.description}</p>}

              {p.bonus_label && (
                <div style={{ padding: 10, background: 'var(--amber-dim-15)', border: '1px solid var(--amber-dim-25)', borderRadius: 6 }}>
                  <div style={{ fontSize: 9, color: 'var(--amber)', letterSpacing: '0.12em', marginBottom: 2, fontWeight: 500 }}>BÔNUS</div>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{p.bonus_label}</div>
                  {p.bonus_description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{p.bonus_description}</div>}
                </div>
              )}

              <div className="btn btn-primary" style={{ justifyContent: 'center' }}>
                abrir conta <IArrowRight size={12} stroke={2} />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
