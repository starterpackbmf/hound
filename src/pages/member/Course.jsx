import React, { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  getCourseBySlug, listModules, buildModuleTree, listLessonMeta,
  listMaterials, getMyProgress, markWatched,
} from '../../lib/courses'
import { panda } from '../../lib/panda'
import { useIsMobile } from '../../lib/useMedia'
import PandaPlayer from './PandaPlayer'
import { ErrorBox, Loading } from './ui'
import {
  IArrowLeft, IArrowRight, IChevronDown, IChevronRight, IPlay, ICheck, IStar,
  IFile, IExternalLink, ITarget, IDownload,
} from '../../components/icons'

export default function Course() {
  const { slug } = useParams()
  const isMobile = useIsMobile(900)
  const [course, setCourse] = useState(null)
  const [modules, setModules] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(true)
  const [treeOpen, setTreeOpen] = useState(!isMobile)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const c = await getCourseBySlug(slug)
        if (!c) { setErr('curso não encontrado ou sem acesso'); return }
        setCourse(c)
        const mods = await listModules(c.id)
        setModules(mods)
      } catch (e) { setErr(e.message) } finally { setLoading(false) }
    })()
  }, [slug])

  const tree = useMemo(() => buildModuleTree(modules), [modules])
  const selected = useMemo(() => modules.find(m => m.id === selectedId), [modules, selectedId])
  const [gridParent, setGridParent] = useState(null) // id do módulo cujos filhos estão sendo mostrados no grid

  const gridNodes = useMemo(() => {
    if (gridParent) {
      const parent = modules.find(m => m.id === gridParent)
      if (!parent) return tree
      // re-monta só os filhos deste parent como "tree" local
      const children = modules.filter(m => m.parent_id === gridParent)
      const flatByParent = {}
      modules.forEach(m => {
        if (!flatByParent[m.parent_id]) flatByParent[m.parent_id] = []
        flatByParent[m.parent_id].push(m)
      })
      function attach(n) {
        return { ...n, children: (flatByParent[n.id] || []).map(attach) }
      }
      return children.map(attach)
    }
    return tree
  }, [tree, gridParent, modules])
  const gridParentNode = useMemo(() => modules.find(m => m.id === gridParent), [modules, gridParent])

  if (loading) return <Loading />
  if (err) return <ErrorBox>{err}</ErrorBox>
  if (!course) return null

  const totalLessons = modules.reduce((a, m) => a + (m.panda_folder_id ? 1 : 0), 0) // rough

  return (
    <div style={{
      display: 'flex', gap: 0,
      margin: isMobile ? '0' : '-32px -40px',
      minHeight: isMobile ? 'auto' : 'calc(100vh - 0px)',
    }}>
      {/* Tree */}
      {(!isMobile || treeOpen) && (
        <aside style={{
          width: isMobile ? '100%' : 260, minWidth: isMobile ? 'auto' : 260,
          background: '#0d0d0f',
          borderRight: isMobile ? 'none' : '1px solid var(--border)',
          padding: isMobile ? '0 0 20px' : '20px 14px',
          overflowY: 'auto',
          maxHeight: isMobile ? 'none' : '100vh',
          position: isMobile ? 'static' : 'sticky',
          top: 0,
        }}>
          <Link to="/app/estudo" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, color: 'var(--text-muted)',
            padding: '4px 0', marginBottom: 10,
          }}>
            <IArrowLeft size={12} stroke={1.6} />
            cursos
          </Link>

          <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
            {course.title}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 16, fontFamily: 'var(--font-mono)' }}>
            {modules.length} módulo{modules.length !== 1 ? 's' : ''}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {tree.map(node => (
              <TreeNode key={node.id} node={node} selectedId={selectedId} onSelect={id => { setSelectedId(id); if (isMobile) setTreeOpen(false) }} depth={0} />
            ))}
            {tree.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>nenhum módulo ainda</div>}
          </div>
        </aside>
      )}

      {/* Main */}
      <div style={{
        flex: 1, minWidth: 0,
        padding: isMobile ? '16px 0' : '24px 36px 40px',
        maxWidth: 900,
      }}>
        {isMobile && (
          <button
            onClick={() => setTreeOpen(v => !v)}
            style={{
              padding: '8px 12px', fontSize: 11,
              background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 6,
              color: 'var(--text-secondary)', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {treeOpen ? <IChevronDown size={12} /> : <IChevronRight size={12} />}
            {selected?.title || 'navegar módulos'}
          </button>
        )}

        <Breadcrumb parts={[
          { label: course.title, to: `/app/estudo/${course.slug}` },
          ...(selected ? [{ label: selected.title }] : []),
        ]} />

        {selected
          ? <ModuleContent module={selected} />
          : <ModulesGrid
              course={course}
              tree={gridNodes}
              parentNode={gridParentNode}
              onEnterGroup={id => setGridParent(id)}
              onBackGroup={() => setGridParent(gridParentNode?.parent_id || null)}
              onSelectVideo={id => setSelectedId(id)}
            />}
      </div>
    </div>
  )
}

function Breadcrumb({ parts }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, flexWrap: 'wrap' }}>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 && <IChevronRight size={10} stroke={1.6} />}
          {p.to ? (
            <Link to={p.to} style={{ color: 'var(--text-muted)' }}>{p.label}</Link>
          ) : (
            <span style={{ color: 'var(--text-secondary)' }}>{p.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

function TreeNode({ node, selectedId, onSelect, depth }) {
  const hasChildren = node.children.length > 0
  const hasVideos = !!node.panda_folder_id
  const isSelected = node.id === selectedId
  const [expanded, setExpanded] = useState(() => hasChildren && (isSelected || containsSelected(node, selectedId)))

  useEffect(() => {
    if (containsSelected(node, selectedId)) setExpanded(true)
  }, [selectedId])

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) setExpanded(v => !v)
          if (hasVideos) onSelect(node.id)
        }}
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', gap: 6,
          padding: `5px 8px 5px ${8 + depth * 10}px`,
          borderRadius: 4,
          fontSize: 12, fontWeight: isSelected ? 500 : 450,
          color: isSelected ? 'var(--amber)' : 'var(--text-secondary)',
          background: isSelected ? 'var(--amber-dim-15)' : 'transparent',
          width: '100%', textAlign: 'left',
          transition: 'background 150ms',
        }}
        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--surface-2)' }}
        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
      >
        <span style={{
          position: 'absolute', left: 0, top: 5, bottom: 5, width: 2,
          background: isSelected ? 'var(--amber)' : 'transparent',
          borderRadius: '0 2px 2px 0',
        }} />
        {hasChildren ? (
          <IChevronDown size={11} stroke={1.8} style={{
            color: 'var(--text-muted)',
            transform: expanded ? 'none' : 'rotate(-90deg)',
            transition: 'transform 150ms',
          }} />
        ) : (
          <span style={{ width: 11, display: 'inline-block' }} />
        )}
        <span style={{ flex: 1 }}>{node.title}</span>
        {hasVideos && <IPlay size={8} stroke={2} style={{ color: 'var(--text-faint)', opacity: 0.7 }} />}
      </button>
      {hasChildren && expanded && node.children.map(c => (
        <TreeNode key={c.id} node={c} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  )
}

function containsSelected(node, id) {
  if (node.id === id) return true
  return (node.children || []).some(c => containsSelected(c, id))
}

function ModulesGrid({ course, tree, parentNode, onEnterGroup, onBackGroup, onSelectVideo }) {
  if (tree.length === 0 && !parentNode) {
    return <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>sem módulos ainda.</div>
  }
  const heading = parentNode ? parentNode.title : course.title
  const subtitle = parentNode
    ? (parentNode.description || null)
    : course.description

  return (
    <div>
      {parentNode && (
        <button onClick={onBackGroup} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11,
          color: 'var(--text-muted)', marginBottom: 10, padding: '4px 0',
        }}>
          <IArrowLeft size={12} stroke={1.6} /> voltar
        </button>
      )}
      <h1 className="display" style={{ fontSize: 24, fontWeight: 500, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
        {heading}
      </h1>
      {subtitle && (
        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '0 0 20px', maxWidth: 640, lineHeight: 1.55 }}>
          {subtitle}
        </p>
      )}
      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        {tree.map(node => (
          <ModuleCard key={node.id} node={node} onEnterGroup={onEnterGroup} onSelectVideo={onSelectVideo} />
        ))}
      </div>
      {tree.length === 0 && parentNode && (
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 20 }}>
          sem submódulos ainda.
        </div>
      )}
    </div>
  )
}

function ModuleCard({ node, onEnterGroup, onSelectVideo }) {
  const hasChildren = (node.children?.length || 0) > 0
  const hasVideos = !!node.panda_folder_id
  function handleClick() {
    // Prioriza navegar pros filhos se tiver. Se for leaf com panda, vai pro player.
    if (hasChildren) onEnterGroup(node.id)
    else if (hasVideos) onSelectVideo(node.id)
  }
  const clickable = hasChildren || hasVideos
  const label = hasChildren && hasVideos ? `${node.children.length} submódulo${node.children.length !== 1 ? 's' : ''} + aulas`
    : hasChildren ? `${node.children.length} submódulo${node.children.length !== 1 ? 's' : ''}`
    : hasVideos ? 'ver aulas'
    : 'em breve'
  return (
    <button
      onClick={handleClick}
      disabled={!clickable}
      style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: 0, background: 'transparent', border: 'none',
        cursor: clickable ? 'pointer' : 'default',
        textAlign: 'left', color: 'inherit',
        opacity: clickable ? 1 : 0.55,
      }}
    >
      <div style={{
        width: '100%', aspectRatio: '9/16',
        borderRadius: 10, overflow: 'hidden',
        background: node.cover_url
          ? `linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.6)), url(${node.cover_url}) center/cover`
          : 'linear-gradient(135deg, #0d0d0f, #18181b)',
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'flex-end', padding: 10,
        transition: 'transform 200ms, border-color 200ms',
        position: 'relative',
      }}
      onMouseEnter={(e) => { if (clickable) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'var(--amber)' } }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border)' }}
      >
        {!node.cover_url && (
          <IPlay size={36} stroke={1.2} style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'var(--amber)', opacity: 0.35,
          }} />
        )}
        <div style={{ color: '#fff', fontSize: 12.5, fontWeight: 500, lineHeight: 1.3, width: '100%' }}>
          {node.title}
        </div>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        {label}
      </div>
    </button>
  )
}

function ModuleContent({ module: mod }) {
  const [videos, setVideos] = useState([])
  const [metaMap, setMetaMap] = useState({})
  const [materials, setMaterials] = useState([])
  const [progress, setProgress] = useState({})
  const [playing, setPlaying] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!mod) return
    let cancel = false
    ;(async () => {
      setLoading(true); setErr(null); setVideos([]); setPlaying(null)
      try {
        if (!mod.panda_folder_id) return
        const [vRes, meta, mats] = await Promise.all([
          panda.videos(mod.panda_folder_id, { limit: 100 }),
          listLessonMeta(mod.id),
          listMaterials(mod.id),
        ])
        if (cancel) return
        const metaByVid = {}
        meta.forEach(m => { metaByVid[m.panda_video_id] = m })
        const visible = (vRes.videos || []).filter(v => !metaByVid[v.id]?.hidden)
        const sorted = visible.sort((a, b) => {
          const oa = metaByVid[a.id]?.order_index
          const ob = metaByVid[b.id]?.order_index
          if (oa != null && ob != null) return oa - ob
          if (oa != null) return -1
          if (ob != null) return 1
          return (a.title || '').localeCompare(b.title || '')
        })
        setVideos(sorted)
        setMetaMap(metaByVid)
        setMaterials(mats)
        const prog = await getMyProgress(sorted.map(v => v.id))
        if (!cancel) setProgress(prog)
        if (!cancel && sorted.length > 0) setPlaying(sorted[0].id)
      } catch (e) {
        if (!cancel) setErr(e.message)
      } finally {
        if (!cancel) setLoading(false)
      }
    })()
    return () => { cancel = true }
  }, [mod?.id])

  if (!mod) return <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>escolha um módulo à esquerda</div>

  if (!mod.panda_folder_id) {
    return (
      <>
        {mod.cover_url && (
          <div style={{
            width: 180, aspectRatio: '9/16',
            background: `url(${mod.cover_url}) center/cover, var(--surface-2)`,
            borderRadius: 10, marginBottom: 16,
            border: '1px solid var(--border)',
          }} />
        )}
        <h1 className="display" style={{ fontSize: 24, fontWeight: 500, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          {mod.title}
        </h1>
        {mod.description && <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '0 0 20px', maxWidth: 640, lineHeight: 1.55 }}>{mod.description}</p>}
        <div style={{ padding: 20, background: 'var(--surface-1)', border: '1px dashed var(--border-strong)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          este módulo não tem vídeos vinculados diretamente. escolha um sub-módulo na árvore.
        </div>
      </>
    )
  }

  const currentVideo = videos.find(v => v.id === playing)
  const doneCount = videos.filter(v => {
    const p = progress[v.id]
    return p?.watched_percent >= 90 || p?.completed_at
  }).length

  return (
    <div>
      <h1 className="display" style={{ fontSize: 24, fontWeight: 500, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
        {currentVideo?.title || mod.title}
      </h1>
      {mod.description && (
        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '0 0 20px', maxWidth: 640, lineHeight: 1.55 }}>
          {mod.description}
        </p>
      )}

      {loading ? <Loading label="carregando vídeos..." />
       : err ? <ErrorBox>{err}</ErrorBox>
       : videos.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>nenhum vídeo nesta pasta do Panda ainda.</div>
       ) : (
        <>
          <div style={{ marginBottom: 10 }}>
            {playing && <PandaPlayer videoId={playing} title={currentVideo?.title} />}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {metaMap[playing]?.must_watch && (
              <span className="pill pill-amber">
                <IStar size={10} stroke={1.8} />
                MUST WATCH
              </span>
            )}
            <div style={{ flex: 1 }} />
            <button
              className="btn"
              onClick={async () => {
                if (!playing) return
                await markWatched(playing)
                setProgress(p => ({ ...p, [playing]: { ...(p[playing] || {}), watched_percent: 100, completed_at: new Date().toISOString() } }))
              }}
              style={{ fontSize: 11 }}
            >
              marcar como visto <ICheck size={12} stroke={1.8} />
            </button>
          </div>

          <div style={sectionHead}>
            <span className="label-muted">aulas deste módulo</span>
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {doneCount} / {videos.length} concluída{videos.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 28 }}>
            {videos.map((v, i) => {
              const p = progress[v.id]
              const done = p?.watched_percent >= 90 || p?.completed_at
              const isPlaying = playing === v.id
              const status = isPlaying ? 'playing' : done ? 'done' : 'todo'
              const meta = metaMap[v.id]
              return (
                <LessonRow
                  key={v.id}
                  n={String(i + 1).padStart(2, '0')}
                  title={meta?.title_override || v.title || '(sem título)'}
                  dur={v.length ? fmtLen(v.length) : ''}
                  status={status}
                  mustWatch={meta?.must_watch}
                  onClick={() => setPlaying(v.id)}
                />
              )
            })}
          </div>

          {materials.length > 0 && (
            <>
              <div style={sectionHead}>
                <span className="label-muted">materiais complementares</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                {materials.map(m => (
                  <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="card card-hover" style={{
                    padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
                    color: 'var(--text-primary)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      {(m.kind === 'pdf' ? IFile : m.kind === 'mindmap' ? ITarget : IExternalLink)({ size: 14, stroke: 1.6, style: { color: 'var(--amber)' } })}
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
                        {(m.kind || 'link').toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 450 }}>{m.title}</div>
                  </a>
                ))}
              </div>
            </>
          )}
        </>
       )}
    </div>
  )
}

function LessonRow({ n, title, dur, status, mustWatch, onClick }) {
  const isPlaying = status === 'playing'
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 12px',
      background: isPlaying ? 'var(--amber-dim)' : 'var(--surface-1)',
      border: `1px solid ${isPlaying ? 'var(--amber-dim-25)' : 'var(--border)'}`,
      borderRadius: 6, textAlign: 'left',
      transition: 'all 150ms',
      width: '100%',
    }}
    onMouseEnter={(e) => { if (!isPlaying) { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--border-strong)' } }}
    onMouseLeave={(e) => { if (!isPlaying) { e.currentTarget.style.background = 'var(--surface-1)'; e.currentTarget.style.borderColor = 'var(--border)' } }}
    >
      <span style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', width: 18 }}>{n}</span>
      <span style={{
        width: 22, height: 22, borderRadius: 99,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: status === 'done' ? 'transparent' : isPlaying ? 'var(--amber)' : 'transparent',
        border: status === 'done' ? '1px solid var(--up)' : isPlaying ? 'none' : '1px solid var(--border-strong)',
        color: status === 'done' ? 'var(--up)' : isPlaying ? '#0a0a0a' : 'var(--text-muted)',
        flexShrink: 0,
      }}>
        {status === 'done' && <ICheck size={11} stroke={2.5} />}
        {status === 'playing' && <IPlay size={9} stroke={0} style={{ fill: 'currentColor', marginLeft: 1 }} />}
        {status === 'todo' && <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--text-faint)' }} />}
      </span>
      <span style={{
        flex: 1, fontSize: 12.5,
        color: isPlaying ? 'var(--amber)' : 'var(--text-primary)',
        fontWeight: isPlaying ? 500 : 450,
      }}>
        {title}
      </span>
      {mustWatch && <span className="pill pill-amber" style={{ fontSize: 9.5 }}>MUST WATCH</span>}
      {dur && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{dur}</span>}
    </button>
  )
}

function fmtLen(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

const sectionHead = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
}
