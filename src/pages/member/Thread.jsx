import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getThread, listReplies, postReply, fetchAuthorsForUserIds } from '../../lib/free'
import { ErrorBox, Loading } from './ui'
import RankBadge from '../../components/RankBadge'
import { IArrowLeft } from '../../components/icons'

export default function Thread() {
  const { id } = useParams()
  const [thread, setThread] = useState(null)
  const [replies, setReplies] = useState([])
  const [authors, setAuthors] = useState({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [reply, setReply] = useState('')
  const [posting, setPosting] = useState(false)

  async function load() {
    const t = await getThread(id)
    if (!t) { setErr('thread não encontrada'); return }
    setThread(t)
    const r = await listReplies(id)
    setReplies(r)
    const ids = [t.user_id, ...r.map(x => x.user_id)]
    setAuthors(await fetchAuthorsForUserIds(ids))
  }

  useEffect(() => {
    load().catch(e => setErr(e.message)).finally(() => setLoading(false))
  }, [id])

  async function onSubmit(e) {
    e.preventDefault()
    if (!reply.trim()) return
    setPosting(true)
    try { await postReply(id, reply.trim()); setReply(''); await load() }
    catch (e) { alert(e.message) } finally { setPosting(false) }
  }

  if (loading) return <Loading />
  if (err) return <ErrorBox>{err}</ErrorBox>
  if (!thread) return null

  const op = authors[thread.user_id]

  return (
    <div style={{ maxWidth: 720 }}>
      <Link to="/app/comunidade" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 11, color: 'var(--text-muted)', marginBottom: 16,
      }}>
        <IArrowLeft size={12} stroke={1.6} />
        fórum
      </Link>

      <h1 className="display" style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em', margin: '0 0 12px', lineHeight: 1.3 }}>
        {thread.status === 'pinned' && <span style={{ fontSize: 16, marginRight: 8 }}>📌</span>}
        {thread.title}
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-muted)', marginBottom: 20 }}>
        <span>por {op?.name?.trim() || 'anônimo'}</span>
        {op?.current_badge && <RankBadge rank={op.current_badge} size="xs" />}
        <span>·</span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>
          {new Date(thread.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
        {thread.tags?.length > 0 && (
          <>
            <span>·</span>
            <span style={{ display: 'flex', gap: 4 }}>
              {thread.tags.map(tag => <span key={tag} style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>#{tag}</span>)}
            </span>
          </>
        )}
      </div>

      {thread.body && (
        <div className="card" style={{ padding: 18, marginBottom: 28 }}>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.65 }}>
            {thread.body}
          </div>
        </div>
      )}

      <div className="label-muted" style={{ marginBottom: 12 }}>
        {replies.length} {replies.length === 1 ? 'resposta' : 'respostas'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {replies.map(r => {
          const a = authors[r.user_id]
          return (
            <div key={r.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 500 }}>
                  {a?.name?.trim() || 'anônimo'}
                </span>
                {a?.current_badge && <RankBadge rank={a.current_badge} size="xs" />}
                <span>· <span style={{ fontFamily: 'var(--font-mono)' }}>
                  {new Date(r.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span></span>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                {r.body}
              </div>
            </div>
          )
        })}
      </div>

      {thread.status !== 'closed' ? (
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            className="input"
            placeholder="escreve uma resposta..."
            value={reply}
            onChange={e => setReply(e.target.value)}
            rows={4}
            style={{ resize: 'vertical', minHeight: 100 }}
          />
          <button type="submit" disabled={posting || !reply.trim()} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
            {posting ? 'publicando...' : 'responder'}
          </button>
        </form>
      ) : (
        <div style={{ padding: 12, background: '#ef444411', border: '1px solid #ef444444', borderRadius: 'var(--r-8)', fontSize: 12, color: 'var(--down)' }}>
          thread fechada — não aceita mais respostas.
        </div>
      )}
    </div>
  )
}
