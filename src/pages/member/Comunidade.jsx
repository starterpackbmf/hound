import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listThreads, createThread, fetchAuthorsForUserIds } from '../../lib/free'
import { PageTitle, Placeholder, ErrorBox, Loading } from './ui'
import RankBadge from '../../components/RankBadge'
import { IPlus, IX } from '../../components/icons'

export default function Comunidade() {
  const [threads, setThreads] = useState([])
  const [authors, setAuthors] = useState({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newTags, setNewTags] = useState('')
  const [posting, setPosting] = useState(false)

  async function reload() {
    const ts = await listThreads().catch(e => { setErr(e.message); return [] })
    setThreads(ts)
    const authorMap = await fetchAuthorsForUserIds(ts.map(t => t.user_id))
    setAuthors(authorMap)
  }

  useEffect(() => { reload().finally(() => setLoading(false)) }, [])

  async function onSubmit(e) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setPosting(true)
    try {
      await createThread({
        title: newTitle.trim(),
        body: newBody.trim() || null,
        tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
      })
      setNewTitle(''); setNewBody(''); setNewTags(''); setShowNew(false)
      await reload()
    } catch (e) { alert(e.message) } finally { setPosting(false) }
  }

  return (
    <div style={{ maxWidth: 1040 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <PageTitle eyebrow="COMUNIDADE">fórum da matilha</PageTitle>
        <button onClick={() => setShowNew(v => !v)} className={showNew ? 'btn' : 'btn btn-outline-amber'}>
          {showNew ? <><IX size={12} stroke={2} /> cancelar</> : <><IPlus size={12} stroke={2} /> nova thread</>}
        </button>
      </div>

      {showNew && (
        <form onSubmit={onSubmit} style={{
          display: 'flex', flexDirection: 'column', gap: 12,
          padding: 16, marginBottom: 20,
          background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-8)',
        }}>
          <input className="input" placeholder="título" value={newTitle} onChange={e => setNewTitle(e.target.value)} required />
          <textarea className="input" style={{ resize: 'vertical', minHeight: 100 }} placeholder="corpo (opcional)" value={newBody} onChange={e => setNewBody(e.target.value)} />
          <input className="input" placeholder="tags (ex: dúvida, fibo, gestão)" value={newTags} onChange={e => setNewTags(e.target.value)} />
          <button type="submit" disabled={posting || !newTitle.trim()} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
            {posting ? 'publicando...' : 'publicar'}
          </button>
        </form>
      )}

      {err ? <ErrorBox>erro: {err} — rode <code>0005_free.sql</code>.</ErrorBox>
       : loading ? <Loading />
       : threads.length === 0 ? (
          <Placeholder title="ainda sem discussões" subtitle="começa a primeira thread." />
       ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {threads.map(t => {
            const a = authors[t.user_id]
            return (
              <Link key={t.id} to={`/app/comunidade/${t.id}`} className="card card-hover" style={{
                padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
                color: 'var(--text-primary)',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                    {t.status === 'pinned' && <span style={{ fontSize: 11, color: 'var(--amber)' }}>📌</span>}
                    {t.status === 'closed' && <span style={{ fontSize: 11, color: 'var(--down)' }}>🔒</span>}
                    <span style={{ fontSize: 13.5, fontWeight: 500 }}>{t.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 10.5, color: 'var(--text-muted)' }}>
                    <span>por {a?.name?.trim() || 'anônimo'}</span>
                    {a?.current_badge && <RankBadge rank={a.current_badge} size="xs" />}
                    <span>· {fmtRel(t.last_reply_at || t.created_at)}</span>
                    {t.tags?.length > 0 && (
                      <span style={{ display: 'flex', gap: 4 }}>
                        {t.tags.slice(0, 3).map(tag => (
                          <span key={tag} style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>#{tag}</span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right', paddingLeft: 12, whiteSpace: 'nowrap' }}>
                  <div style={{
                    fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-mono)',
                    color: t.reply_count > 0 ? 'var(--text-primary)' : 'var(--text-faint)',
                  }}>
                    {t.reply_count}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>respostas</div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function fmtRel(iso) {
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d atrás`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
