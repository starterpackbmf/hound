import React, { useEffect, useState } from 'react'
import {
  POST_CATEGORIES, categoryMeta,
  listPosts, createPost, deletePost, toggleLike, fetchMyLikes,
  listComments, postComment, fetchAuthors,
} from '../../lib/community'
import { matilha } from '../../lib/matilha'
import { earnByRule } from '../../lib/free'
import { PageTitle, Placeholder, ErrorBox, Loading } from './ui'
import RankBadge from '../../components/RankBadge'
import { IPlus, IX, IMessage, ICheck } from '../../components/icons'
import { useAuth } from '../../auth/AuthContext'

export default function Comunidade() {
  const { user } = useAuth()
  const [filter, setFilter] = useState('all')
  const [posts, setPosts] = useState([])
  const [authors, setAuthors] = useState({})
  const [likes, setLikes] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [composer, setComposer] = useState({ body: '', category: 'geral', open: false })
  const [posting, setPosting] = useState(false)

  async function reload() {
    setLoading(true)
    try {
      const [localPs, lovablePs, lovableProfiles] = await Promise.all([
        listPosts({ category: filter }).catch(() => []),
        matilha.communityPosts(30).catch(() => []),
        matilha.profiles().catch(() => []),
      ])

      // marca posts do lovable como read-only espelho
      const lovableTagged = (lovablePs || [])
        .filter(p => filter === 'all' || p.category === filter)
        .map(p => ({ ...p, _mirror: true }))

      // merge + dedup por id, ordena por created_at desc
      const byId = new Map()
      ;[...localPs, ...lovableTagged].forEach(p => { if (!byId.has(p.id)) byId.set(p.id, p) })
      const merged = Array.from(byId.values()).sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      )
      setPosts(merged)

      // autores: local do supabase + espelho do lovable
      const localAuthors = await fetchAuthors(localPs.map(p => p.user_id))
      const lovableAuthorMap = {}
      ;(lovableProfiles || []).forEach(p => { lovableAuthorMap[p.id] = p })
      setAuthors({ ...lovableAuthorMap, ...localAuthors })

      const likeSet = await fetchMyLikes(localPs.map(p => p.id))
      setLikes(likeSet)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [filter])

  async function submit() {
    if (!composer.body.trim()) return
    setPosting(true)
    try {
      await createPost({ body: composer.body, category: composer.category })
      setComposer({ body: '', category: 'geral', open: false })
      earnByRule('community_activity', 'post na comunidade').catch(() => {})
      await reload()
    } catch (e) {
      alert(e.message)
    } finally {
      setPosting(false)
    }
  }

  async function onLike(p) {
    try {
      const { liked } = await toggleLike(p.id)
      setLikes(s => {
        const n = new Set(s)
        if (liked) n.add(p.id); else n.delete(p.id)
        return n
      })
      setPosts(arr => arr.map(x => x.id === p.id ? { ...x, likes_count: x.likes_count + (liked ? 1 : -1) } : x))
    } catch (e) { alert(e.message) }
  }

  async function onDelete(id) {
    if (!confirm('apagar post?')) return
    try { await deletePost(id); await reload() } catch (e) { alert(e.message) }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <PageTitle eyebrow="SOCIAL" sub="feed da matilha — onde a comunidade fala sobre os trades do dia.">
        comunidade
      </PageTitle>

      {err ? <ErrorBox>erro: {err} — rode <code>0009_community_feed.sql</code>.</ErrorBox> : null}

      {/* Composer */}
      <div className="card" style={{ padding: 14, marginBottom: 16 }}>
        {!composer.open ? (
          <button onClick={() => setComposer(c => ({ ...c, open: true }))} style={{
            width: '100%', textAlign: 'left',
            padding: '10px 12px',
            background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6,
            color: 'var(--text-muted)', fontSize: 13,
          }}>
            o que rolou com você no mercado hoje?
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <textarea
              className="input"
              rows={3}
              style={{ resize: 'vertical', minHeight: 70 }}
              placeholder="compartilha com a matilha..."
              value={composer.body}
              onChange={e => setComposer(c => ({ ...c, body: e.target.value }))}
              autoFocus
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              {POST_CATEGORIES.map(c => (
                <button key={c.code}
                  onClick={() => setComposer(x => ({ ...x, category: c.code }))}
                  className={composer.category === c.code ? 'pill pill-active' : 'pill'}
                  style={{ cursor: 'pointer' }}>
                  {c.emoji} {c.label}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <button onClick={() => setComposer({ body: '', category: 'geral', open: false })} className="btn btn-ghost" style={{ fontSize: 11 }}>
                cancelar
              </button>
              <button onClick={submit} disabled={posting || !composer.body.trim()} className="btn btn-primary" style={{ fontSize: 11 }}>
                {posting ? '...' : 'publicar'}
              </button>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              ⎈ +10 SC por atividade diária na comunidade
            </div>
          </div>
        )}
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('all')} className={filter === 'all' ? 'pill pill-active' : 'pill'} style={{ cursor: 'pointer' }}>
          tudo
        </button>
        {POST_CATEGORIES.map(c => (
          <button key={c.code} onClick={() => setFilter(c.code)}
            className={filter === c.code ? 'pill pill-active' : 'pill'} style={{ cursor: 'pointer' }}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {loading ? <Loading />
       : posts.length === 0 ? <Placeholder title="sem posts ainda" subtitle="sê o primeiro a postar." />
       : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {posts.map(p => (
            <PostCard
              key={p.id + (p._mirror ? '-mirror' : '')}
              post={p}
              author={authors[p.user_id]}
              liked={likes.has(p.id)}
              isOwn={!p._mirror && p.user_id === user?.id}
              mirror={p._mirror}
              onLike={() => !p._mirror && onLike(p)}
              onDelete={() => onDelete(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PostCard({ post: p, author, liked, isOwn, mirror, onLike, onDelete }) {
  const [open, setOpen] = useState(false)
  const cat = categoryMeta(p.category)
  const isMonitor = (author?.roles || []).some(r => ['monitor', 'admin', 'imortal'].includes(r))
  const initial = (author?.name?.[0] || '?').toUpperCase()

  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #00d9ff 100%)',
          color: '#0a0a0e', fontSize: 12, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{initial}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)' }}>
              {author?.name?.trim() || 'mentorado'}
            </span>
            {author?.current_badge && <RankBadge rank={author.current_badge} size="xs" />}
            {isMonitor && <span className="pill pill-amber" style={{ fontSize: 9 }}>MONITOR</span>}
            {mirror && <span className="pill" style={{ fontSize: 9, color: '#a855f7', borderColor: 'rgba(168,85,247,0.3)' }}>ESPELHO</span>}
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>·</span>
            <span className="pill" style={{ fontSize: 10 }}>{cat.emoji} {cat.label}</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>
              {fmtRel(p.created_at)}
            </span>
            {isOwn && (
              <button onClick={onDelete} className="btn btn-ghost" style={{ padding: 3 }}>
                <IX size={11} stroke={1.8} />
              </button>
            )}
          </div>

          <div style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.55, whiteSpace: 'pre-wrap', marginBottom: 10 }}>
            {p.body}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={onLike} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, color: liked ? 'var(--amber)' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}>
              {liked ? '❤' : '♡'} {p.likes_count}
            </button>
            <button onClick={() => setOpen(o => !o)} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, color: open ? 'var(--amber)' : 'var(--text-muted)',
            }}>
              <IMessage size={11} stroke={1.6} /> {p.comments_count}
            </button>
          </div>

          {open && <Comments postId={p.id} />}
        </div>
      </div>
    </div>
  )
}

function Comments({ postId }) {
  const [comments, setComments] = useState([])
  const [authors, setAuthors] = useState({})
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const [loading, setLoading] = useState(true)

  async function reload() {
    const cs = await listComments(postId).catch(() => [])
    setComments(cs)
    setAuthors(await fetchAuthors(cs.map(c => c.user_id)))
  }
  useEffect(() => { reload().finally(() => setLoading(false)) }, [postId])

  async function submit() {
    if (!text.trim()) return
    setPosting(true)
    try { await postComment(postId, text); setText(''); await reload() }
    catch (e) { alert(e.message) } finally { setPosting(false) }
  }

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
      {loading ? <Loading /> :
        comments.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>sem comentários ainda</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            {comments.map(c => {
              const a = authors[c.user_id]
              return (
                <div key={c.id} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    background: 'linear-gradient(135deg, #ec4899, #a855f7)',
                    color: '#0a0a0e', fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{(a?.name?.[0] || '?').toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{a?.name?.trim() || 'mentorado'}</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: 10, fontFamily: 'var(--font-mono)' }}>{fmtRel(c.created_at)}</span>
                    <div style={{ color: 'var(--text-secondary)', marginTop: 2, whiteSpace: 'pre-wrap' }}>{c.body}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      }
      <form onSubmit={e => { e.preventDefault(); submit() }} style={{ display: 'flex', gap: 6 }}>
        <input
          className="input"
          placeholder="comentar..."
          value={text}
          onChange={e => setText(e.target.value)}
          style={{ fontSize: 12 }}
        />
        <button disabled={posting || !text.trim()} className="btn btn-primary" style={{ fontSize: 11 }}>
          enviar
        </button>
      </form>
    </div>
  )
}

function fmtRel(iso) {
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`
  if (diff < 86400 * 7) return `há ${Math.floor(diff / 86400)}d`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
