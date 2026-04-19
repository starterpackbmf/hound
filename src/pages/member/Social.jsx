import React, { useEffect, useState } from 'react'
import { listSocialPosts } from '../../lib/free'
import { PageTitle, Placeholder, ErrorBox, Loading } from './ui'
import { IGlobe, IArrowRight } from '../../components/icons'

const PLATFORM_META = {
  instagram: { label: 'INSTAGRAM', color: '#E1306C' },
  youtube:   { label: 'YOUTUBE',   color: '#FF0000' },
  twitter:   { label: 'X',         color: '#ededed' },
  other:     { label: 'LINK',      color: 'var(--amber)' },
}

export default function Social() {
  const [posts, setPosts] = useState([])
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listSocialPosts().then(setPosts).catch(e => setErr(e.message)).finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ maxWidth: 1040 }}>
      <PageTitle eyebrow="COMUNIDADE" sub="últimos posts do Mateus no Instagram, YouTube e outros canais.">social</PageTitle>

      {err ? <ErrorBox>erro: {err} — rode <code>0005_free.sql</code>.</ErrorBox>
       : loading ? <Loading />
       : posts.length === 0 ? (
          <Placeholder title="nenhum post ainda" subtitle="cadastre em public.social_posts pra aparecer aqui." />
       ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {posts.map(p => {
            const pm = PLATFORM_META[p.platform] || PLATFORM_META.other
            return (
              <a key={p.id} href={p.post_url} target="_blank" rel="noreferrer" className="card card-hover" style={{
                display: 'flex', flexDirection: 'column', gap: 10, padding: 14,
                color: 'var(--text-primary)',
              }}>
                {p.thumbnail_url ? (
                  <img src={p.thumbnail_url} alt="" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 6 }} />
                ) : (
                  <div style={{
                    width: '100%', aspectRatio: '16/9', borderRadius: 6,
                    background: 'linear-gradient(135deg, #0d0d0f, #18181b)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: pm.color, opacity: 0.5,
                  }}>
                    <IGlobe size={28} stroke={1.2} />
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 9, color: pm.color, letterSpacing: '0.12em', fontWeight: 500 }}>{pm.label}</span>
                  {p.posted_at && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>{fmtDate(p.posted_at)}</span>}
                </div>
                {p.title && <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.4 }}>{p.title}</div>}
                {p.description && <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{p.description.slice(0, 140)}{p.description.length > 140 ? '…' : ''}</div>}
                <div style={{ fontSize: 11, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto' }}>
                  abrir <IArrowRight size={11} stroke={1.8} />
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
