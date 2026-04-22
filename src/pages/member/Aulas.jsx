import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listEvents, partitionEvents, EVENT_KIND_LABELS, isYoutubeUrl, youtubeEmbedUrl } from '../../lib/events'
import { listLiveSessions } from '../../lib/liveSessions'
import { getMyProfile } from '../../lib/profile'
import { PageTitle, Section, Placeholder, ErrorBox, Loading } from './ui'
import { IArrowRight, IPlay, ICalendar, IX, IPlus } from '../../components/icons'
import LiveJoinCTA from '../../components/LiveJoinCTA'

export default function Aulas() {
  const [events, setEvents] = useState([])
  const [liveSessions, setLiveSessions] = useState([])
  const [isMonitor, setIsMonitor] = useState(false)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [replay, setReplay] = useState(null)

  useEffect(() => {
    Promise.all([
      listEvents({ limit: 100 }).catch(() => []),
      listLiveSessions({ upcoming: true, limit: 50 }).catch(() => []),
      getMyProfile().catch(() => null),
    ]).then(([ev, ls, p]) => {
      setEvents(ev)
      setLiveSessions(ls)
      setIsMonitor((p?.roles || []).some(r => ['admin', 'monitor', 'imortal'].includes(r)))
    })
    .catch(e => setErr(e.message))
    .finally(() => setLoading(false))
  }, [])

  const { live, upcoming, past } = partitionEvents(events)
  const replayable = past.filter(e => e.recording_url)

  return (
    <div style={{ maxWidth: 1040 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <PageTitle eyebrow="A MATILHA" sub="aulas ao vivo, open class, sala diária e todos os replays.">ao vivo</PageTitle>
        {isMonitor && (
          <Link to="/mentor/aulas/nova" className="btn btn-primary" style={{ fontSize: 12 }}>
            <IPlus size={12} stroke={2} /> agendar aula
          </Link>
        )}
      </div>

      {/* CTA principal — sala fixa do Zoom (link pessoal, gated) */}
      <div style={{ marginTop: 20 }}>
        <LiveJoinCTA />
      </div>

      {/* Sessões Zoom (sala embutida) */}
      {liveSessions.length > 0 && (
        <Section title="🎥 sala zoom ao vivo">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {liveSessions.map(s => <ZoomSessionCard key={s.id} session={s} />)}
          </div>
        </Section>
      )}

      {err ? <ErrorBox>erro: {err} — rode <code>supabase/migrations/0003_events.sql</code> se ainda não rodou.</ErrorBox>
       : loading ? <Loading />
       : (
        <>
          <Section title="🔴 acontecendo agora">
            {live.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>nada rolando no momento.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {live.map(e => <LiveCard key={e.id} event={e} />)}
              </div>
            )}
          </Section>

          <Section title="próximas">
            {upcoming.length === 0 ? (
              <Placeholder title="nenhuma aula agendada" subtitle="eventos novos cadastrados no Supabase aparecem aqui automaticamente." />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                {upcoming.map(e => <UpcomingCard key={e.id} event={e} />)}
              </div>
            )}
          </Section>

          <Section title="replays">
            {replay && <ReplayPlayer event={replay} onClose={() => setReplay(null)} />}
            {replayable.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>nenhum replay disponível.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                {replayable.map(e => (
                  <button key={e.id} onClick={() => setReplay(e)} className="card card-hover" style={{
                    padding: 14, textAlign: 'left',
                    display: 'flex', flexDirection: 'column', gap: 8,
                    color: 'var(--text-primary)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="pill pill-gray" style={{ fontSize: 9 }}>{EVENT_KIND_LABELS[e.kind]}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>
                        {fmtDate(e.starts_at)}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{e.title}</div>
                    {e.host_name && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>com {e.host_name}</div>}
                    <div style={{ fontSize: 11, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto' }}>
                      ver replay <IArrowRight size={11} stroke={1.8} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  )
}

function ZoomSessionCard({ session: s }) {
  const now = Date.now()
  const starts = new Date(s.starts_at).getTime()
  const ends = s.ends_at ? new Date(s.ends_at).getTime() : starts + 2 * 3600 * 1000
  const isLive = now >= starts - 10 * 60 * 1000 && now <= ends
  const minutesToStart = Math.round((starts - now) / 60000)

  return (
    <Link to={`/app/aulas/ao-vivo/${s.id}`} className="card card-hover" style={{
      padding: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      color: 'var(--text-primary)', textDecoration: 'none',
      background: isLive ? 'linear-gradient(90deg, rgba(236,72,153,0.08), var(--surface-1))' : undefined,
      borderColor: isLive ? 'rgba(236,72,153,0.4)' : 'var(--border)',
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
        background: isLive ? 'rgba(236,72,153,0.2)' : 'var(--surface-2)',
        color: isLive ? 'var(--pink)' : 'var(--text-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isLive ? <span className="dot dot-live" style={{ width: 10, height: 10 }} /> : <IPlay size={18} stroke={1.6} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          {isLive && (
            <span className="pill" style={{ fontSize: 9, color: 'var(--pink)', borderColor: 'var(--pink)', fontWeight: 700 }}>
              AO VIVO AGORA
            </span>
          )}
          <span style={{ fontSize: 14, fontWeight: 500 }}>{s.title}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {s.host_name ? `${s.host_name} · ` : ''}
          {isLive ? 'entre agora' : minutesToStart > 0 ? `em ${minutesToStart}min` : fmtDate(s.starts_at)}
        </div>
      </div>
      <span className="btn btn-primary" style={{ pointerEvents: 'none', fontSize: 11 }}>
        entrar <IArrowRight size={11} stroke={2} />
      </span>
    </Link>
  )
}

function LiveCard({ event: e }) {
  const embed = isYoutubeUrl(e.live_url) ? youtubeEmbedUrl(e.live_url) : null
  return (
    <div style={{
      padding: 20,
      background: 'linear-gradient(90deg, #ef444410 0%, var(--surface-1) 40%)',
      border: '1px solid #ef444428',
      borderRadius: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span className="dot dot-live" style={{ width: 8, height: 8 }} />
        <span style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--live)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
          AO VIVO AGORA
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>· {EVENT_KIND_LABELS[e.kind]}</span>
      </div>
      <h3 className="display" style={{ fontSize: 18, fontWeight: 500, margin: '0 0 4px', letterSpacing: '-0.02em' }}>{e.title}</h3>
      {e.host_name && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>com {e.host_name}</div>}
      {e.description && <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.55 }}>{e.description}</p>}
      {embed ? (
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
          <iframe src={embed} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} allow="accelerometer;autoplay;encrypted-media;picture-in-picture" allowFullScreen />
        </div>
      ) : e.live_url && (
        <a href={e.live_url} target="_blank" rel="noreferrer" className="btn btn-primary">
          entrar na sala <IArrowRight size={12} stroke={2} />
        </a>
      )}
    </div>
  )
}

function UpcomingCard({ event: e }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <ICalendar size={12} stroke={1.6} style={{ color: 'var(--amber)' }} />
        <span className="label-muted" style={{ fontSize: 9 }}>{EVENT_KIND_LABELS[e.kind]}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>
          {fmtDate(e.starts_at)}
        </span>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>{e.title}</div>
      {e.host_name && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>com {e.host_name}</div>}
      {e.description && <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>{e.description}</p>}
      {e.live_url && (
        <a href={e.live_url} target="_blank" rel="noreferrer" className="btn" style={{ fontSize: 11 }}>
          link da sala <IArrowRight size={11} stroke={1.8} />
        </a>
      )}
    </div>
  )
}

function ReplayPlayer({ event: e, onClose }) {
  const url = e.recording_url
  const embed = isYoutubeUrl(url) ? youtubeEmbedUrl(url) : null
  return (
    <div className="card" style={{ padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{e.title}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {EVENT_KIND_LABELS[e.kind]?.toUpperCase()} · {fmtDate(e.starts_at)}
          </div>
        </div>
        <button onClick={onClose} className="btn btn-ghost" style={{ padding: 6 }}>
          <IX size={14} stroke={1.8} />
        </button>
      </div>
      {embed ? (
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 8, overflow: 'hidden' }}>
          <iframe src={embed} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} allow="accelerometer;autoplay;encrypted-media;picture-in-picture" allowFullScreen />
        </div>
      ) : (
        <a href={url} target="_blank" rel="noreferrer" className="btn btn-primary">
          abrir replay <IArrowRight size={12} stroke={2} />
        </a>
      )}
    </div>
  )
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
