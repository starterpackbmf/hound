import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { panda } from '../../lib/panda'
import { uploadCourseCover } from '../../lib/storage'
import { PageTitle, Section, Placeholder, ErrorBox, Loading } from '../member/ui'
import { IPlus, IX, IArrowRight, IArrowLeft, IBook, IChevronRight, IChevronDown } from '../../components/icons'

export default function AdminConteudos() {
  const [tab, setTab] = useState('cursos')
  return (
    <div style={{ maxWidth: 1040 }}>
      <PageTitle eyebrow="ÁREA DO MONITOR" sub="crie, edite e reorganize cursos, módulos e materiais sem precisar de SQL.">
        conteúdos
      </PageTitle>

      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {['cursos', 'modulos', 'panda'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={tab === t ? 'pill pill-active' : 'pill'}
            style={{ cursor: 'pointer' }}>
            {t === 'cursos' ? 'cursos' : t === 'modulos' ? 'árvore de módulos' : 'pastas do panda'}
          </button>
        ))}
      </div>

      {tab === 'cursos' && <CursosTab />}
      {tab === 'modulos' && <ModulosTab />}
      {tab === 'panda' && <PandaTab />}
    </div>
  )
}

function CursosTab() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({ slug: '', title: '', description: '', cover_url: '', is_free: false, published: true })

  async function load() {
    const { data, error } = await supabase.from('courses').select('*').order('order_index')
    if (!error) setCourses(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function startCreate() {
    setEditing(null); setDraft({ slug: '', title: '', description: '', cover_url: '', is_free: false, published: true })
    setCreating(true)
  }
  function startEdit(c) {
    setEditing(c.id); setDraft({ ...c })
    setCreating(true)
  }
  async function submit() {
    if (!draft.slug.trim() || !draft.title.trim()) return alert('slug e título são obrigatórios')
    const payload = {
      slug: draft.slug.trim(),
      title: draft.title.trim(),
      description: draft.description?.trim() || null,
      cover_url: draft.cover_url?.trim() || null,
      is_free: !!draft.is_free,
      published: !!draft.published,
    }
    try {
      const { error } = editing
        ? await supabase.from('courses').update(payload).eq('id', editing)
        : await supabase.from('courses').insert(payload)
      if (error) throw error
      setCreating(false); setEditing(null)
      await load()
    } catch (e) {
      alert('erro: ' + (e.message || e))
      console.error('course save error:', e)
    }
  }
  async function remove(id) {
    if (!confirm('apagar curso (junto com módulos)?')) return
    await supabase.from('courses').delete().eq('id', id)
    await load()
  }

  if (loading) return <Loading />

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        {!creating ? (
          <button onClick={startCreate} className="btn btn-outline-cyan">
            <IPlus size={12} stroke={2} /> novo curso
          </button>
        ) : (
          <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              <Field label="slug (url)">
                <input className="input" placeholder="tradesystem-starter" value={draft.slug} onChange={e => setDraft({ ...draft, slug: e.target.value })} />
              </Field>
              <Field label="título *">
                <input className="input" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
              </Field>
              <Field label="capa">
                <CoverPicker value={draft.cover_url} slug={draft.slug} onChange={url => setDraft({ ...draft, cover_url: url })} />
              </Field>
            </div>
            <Field label="descrição">
              <textarea className="input" rows={2} style={{ resize: 'vertical' }} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} />
            </Field>
            <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-secondary)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={!!draft.is_free} onChange={e => setDraft({ ...draft, is_free: e.target.checked })} />
                é grátis
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={!!draft.published} onChange={e => setDraft({ ...draft, published: e.target.checked })} />
                publicado
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={submit} className="btn btn-primary">{editing ? 'salvar' : 'criar curso'}</button>
              <button onClick={() => { setCreating(false); setEditing(null) }} className="btn btn-ghost">cancelar</button>
            </div>
          </div>
        )}
      </div>

      {courses.length === 0 ? (
        <Placeholder title="nenhum curso ainda" subtitle="crie o primeiro acima ou rode o script scripts/sync-panda.js pra importar do Panda." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {courses.map(c => (
            <div key={c.id} className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <IBook size={16} stroke={1.5} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{c.title}</span>
                  {c.is_free && <span className="pill pill-up" style={{ fontSize: 9 }}>GRÁTIS</span>}
                  {!c.published && <span className="pill pill-gray" style={{ fontSize: 9 }}>RASCUNHO</span>}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  /{c.slug}
                </div>
              </div>
              <button onClick={() => startEdit(c)} className="btn" style={{ fontSize: 11 }}>editar</button>
              <button onClick={() => remove(c.id)} className="btn btn-ghost" style={{ padding: 6 }}><IX size={12} stroke={1.8} /></button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function ModulosTab() {
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [modules, setModules] = useState([])
  const [pandaFolders, setPandaFolders] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [creating, setCreating] = useState(null) // { parent_id } or { editing: id }
  const [draft, setDraft] = useState({})

  useEffect(() => {
    Promise.all([
      supabase.from('courses').select('*').order('order_index'),
      panda.folders().catch(() => ({ folders: [] })),
    ]).then(([c, p]) => {
      setCourses(c.data || [])
      setPandaFolders(p.folders || [])
      if (c.data?.[0]) setSelectedCourse(c.data[0].id)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!selectedCourse) return
    supabase.from('modules').select('*').eq('course_id', selectedCourse).order('order_index')
      .then(({ data }) => setModules(data || []))
  }, [selectedCourse])

  function buildTree(flat) {
    const by = {}
    const roots = []
    flat.forEach(n => { by[n.id] = { ...n, children: [] } })
    flat.forEach(n => {
      if (n.parent_id && by[n.parent_id]) by[n.parent_id].children.push(by[n.id])
      else roots.push(by[n.id])
    })
    return roots
  }

  async function saveModule() {
    if (!draft.title?.trim()) return
    const payload = {
      title: draft.title.trim(),
      description: draft.description?.trim() || null,
      panda_folder_id: draft.panda_folder_id || null,
      cover_url: draft.cover_url?.trim() || null,
    }
    try {
      let error
      if (creating.editing) {
        ({ error } = await supabase.from('modules').update(payload).eq('id', creating.editing))
      } else {
        payload.course_id = selectedCourse
        payload.parent_id = creating.parent_id || null
        payload.order_index = modules.filter(m => m.parent_id === (creating.parent_id || null)).length
        ;({ error } = await supabase.from('modules').insert(payload))
      }
      if (error) throw error
      setCreating(null); setDraft({})
      const { data } = await supabase.from('modules').select('*').eq('course_id', selectedCourse).order('order_index')
      setModules(data || [])
    } catch (e) {
      alert('erro: ' + (e.message || e))
      console.error(e)
    }
  }

  async function remove(id) {
    if (!confirm('apagar módulo (e filhos)?')) return
    await supabase.from('modules').delete().eq('id', id)
    const { data } = await supabase.from('modules').select('*').eq('course_id', selectedCourse).order('order_index')
    setModules(data || [])
  }

  if (loading) return <Loading />
  if (err) return <ErrorBox>{err}</ErrorBox>
  if (courses.length === 0) return <Placeholder title="crie um curso antes" subtitle="vai na aba cursos acima e cria o primeiro." />

  const tree = buildTree(modules)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <select value={selectedCourse || ''} onChange={e => setSelectedCourse(e.target.value)}
          style={{ padding: '7px 10px', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12 }}>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <button onClick={() => { setCreating({ parent_id: null }); setDraft({}) }} className="btn btn-outline-cyan" style={{ fontSize: 11 }}>
          <IPlus size={11} stroke={2} /> novo módulo raiz
        </button>
      </div>

      {creating && (
        <div className="card" style={{ padding: 16, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--cyan)', letterSpacing: '0.14em', fontWeight: 600 }}>
            {creating.editing ? 'EDITAR MÓDULO' : `NOVO MÓDULO ${creating.parent_id ? 'FILHO' : 'RAIZ'}`}
          </div>
          <Field label="título *">
            <input className="input" value={draft.title || ''} onChange={e => setDraft({ ...draft, title: e.target.value })} autoFocus />
          </Field>
          <Field label="descrição">
            <textarea className="input" rows={2} style={{ resize: 'vertical' }} value={draft.description || ''} onChange={e => setDraft({ ...draft, description: e.target.value })} />
          </Field>
          <Field label="capa">
            <CoverPicker value={draft.cover_url} slug={`modulo-${(draft.title || 'novo').toLowerCase().replace(/[^a-z0-9-]/gi, '-').slice(0, 30)}`} onChange={url => setDraft({ ...draft, cover_url: url })} />
          </Field>
          <Field label="pasta do Panda (opcional — pega vídeos de lá)">
            <select className="input" value={draft.panda_folder_id || ''} onChange={e => setDraft({ ...draft, panda_folder_id: e.target.value || null })}>
              <option value="">— nenhuma (módulo só agrupa sub-módulos) —</option>
              {pandaFolders.map(f => (
                <option key={f.id} value={f.id}>{f.name} ({f.videos_count} vídeos)</option>
              ))}
            </select>
          </Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveModule} className="btn btn-primary">{creating.editing ? 'salvar' : 'criar'}</button>
            <button onClick={() => { setCreating(null); setDraft({}) }} className="btn btn-ghost">cancelar</button>
          </div>
        </div>
      )}

      {tree.length === 0 ? (
        <Placeholder title="sem módulos ainda" subtitle="crie o primeiro módulo acima." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tree.map(n => <ModuleNode key={n.id} node={n} depth={0}
            onAddChild={(parentId) => { setCreating({ parent_id: parentId }); setDraft({}) }}
            onEdit={(node) => { setCreating({ editing: node.id, parent_id: node.parent_id }); setDraft({ title: node.title, description: node.description, cover_url: node.cover_url, panda_folder_id: node.panda_folder_id }) }}
            onRemove={remove} />)}
        </div>
      )}
    </>
  )
}

function ModuleNode({ node, depth, onAddChild, onEdit, onRemove }) {
  const [open, setOpen] = useState(true)
  const hasChildren = node.children.length > 0
  return (
    <div>
      <div className="card" style={{
        padding: '8px 12px',
        marginLeft: depth * 18,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {hasChildren ? (
          <button onClick={() => setOpen(v => !v)} style={{ color: 'var(--text-muted)', padding: 2 }}>
            {open ? <IChevronDown size={11} stroke={1.8} /> : <IChevronRight size={11} stroke={1.8} />}
          </button>
        ) : <span style={{ width: 11 }}></span>}
        {node.cover_url && (
          <div style={{ width: 32, height: 20, borderRadius: 3, background: `url(${node.cover_url}) center/cover, var(--surface-2)`, flexShrink: 0 }} />
        )}
        <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text-primary)' }}>{node.title}</span>
        {node.panda_folder_id && <span className="pill pill-cyan" style={{ fontSize: 9 }}>PANDA</span>}
        <button onClick={() => onEdit(node)} className="btn btn-ghost" style={{ fontSize: 10 }}>
          editar
        </button>
        <button onClick={() => onAddChild(node.id)} className="btn btn-ghost" style={{ fontSize: 10 }}>
          <IPlus size={10} stroke={2} /> filho
        </button>
        <button onClick={() => onRemove(node.id)} className="btn btn-ghost" style={{ padding: 4 }}>
          <IX size={11} stroke={1.8} />
        </button>
      </div>
      {hasChildren && open && node.children.map(c => (
        <ModuleNode key={c.id} node={c} depth={depth + 1} onAddChild={onAddChild} onEdit={onEdit} onRemove={onRemove} />
      ))}
    </div>
  )
}

function PandaTab() {
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [expanded, setExpanded] = useState(new Set())
  const [videosByFolder, setVideosByFolder] = useState({})

  useEffect(() => {
    panda.folders()
      .then(r => setFolders(r.folders || []))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function toggle(id) {
    const n = new Set(expanded)
    if (n.has(id)) { n.delete(id); setExpanded(n); return }
    n.add(id); setExpanded(n)
    if (!videosByFolder[id]) {
      try {
        const r = await panda.videos(id, { limit: 100 })
        setVideosByFolder(v => ({ ...v, [id]: r.videos || [] }))
      } catch {}
    }
  }

  if (loading) return <Loading />
  if (err) return <ErrorBox>erro conectando Panda: {err}</ErrorBox>

  // Build folder tree
  const children = {}
  folders.forEach(f => {
    const p = f.parent_folder_id || 'ROOT'
    children[p] = children[p] || []
    children[p].push(f)
  })

  function renderNode(folder, depth = 0) {
    const subs = (children[folder.id] || []).sort((a, b) => a.name.localeCompare(b.name))
    const open = expanded.has(folder.id)
    const vids = videosByFolder[folder.id] || []
    return (
      <div key={folder.id}>
        <button onClick={() => toggle(folder.id)} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px',
          paddingLeft: 10 + depth * 18,
          width: '100%', textAlign: 'left',
          background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 5,
          color: 'var(--text-primary)', fontSize: 12,
          marginBottom: 3,
        }}>
          {open ? <IChevronDown size={11} stroke={1.8} style={{ color: 'var(--text-muted)' }} /> : <IChevronRight size={11} stroke={1.8} style={{ color: 'var(--text-muted)' }} />}
          📁 {folder.name}
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>
            {folder.videos_count} vídeos
          </span>
        </button>
        {open && (
          <>
            {vids.map(v => (
              <div key={v.id} style={{
                marginLeft: 30 + depth * 18,
                padding: '4px 10px',
                fontSize: 11, color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                🎬 {v.title} <span style={{ color: 'var(--text-faint)' }}>· {v.id.slice(0, 8)}</span>
              </div>
            ))}
            {subs.map(sub => renderNode(sub, depth + 1))}
          </>
        )}
      </div>
    )
  }

  const roots = (children['ROOT'] || []).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
        Só leitura. Estrutura pra referência na hora de criar módulos.
      </div>
      <div>{roots.map(r => renderNode(r))}</div>
    </>
  )
}

function CoverPicker({ value, slug, onChange }) {
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState(null)
  const inputRef = React.useRef(null)

  async function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setErr(null)
    try {
      const { url } = await uploadCourseCover(file, slug)
      onChange(url)
    } catch (er) {
      setErr(er.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {value && (
        <div style={{
          width: '100%', aspectRatio: '16/9',
          background: `url(${value}) center/cover, var(--surface-2)`,
          borderRadius: 6, border: '1px solid var(--border)',
        }} />
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <input className="input" style={{ flex: 1, fontSize: 11 }}
          value={value || ''} onChange={e => onChange(e.target.value)}
          placeholder="cole URL OU clica em escolher →" />
        <button type="button" onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn btn-ghost" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
          {uploading ? 'subindo...' : '📁 escolher'}
        </button>
        <input ref={inputRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
      </div>
      {err && <div style={{ fontSize: 10, color: 'var(--down)' }}>⚠ {err}</div>}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="label-muted">{label}</span>
      {children}
    </div>
  )
}
