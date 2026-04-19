import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { partitionEvents, isYoutubeUrl, youtubeEmbedUrl } from '../../lib/events'
import { PageTitle, Section, Placeholder, ErrorBox, Loading } from './ui'
import { IArrowRight, IZap } from '../../components/icons'

export default function Imersoes() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  useEffect(() => {
    supabase.from('events').select('*').eq('kind', 'imersao').order('starts_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) setErr(error.message)
        else setEvents(data || [])
      })
      .then(() => setLoading(false))
  }, [])

  const { live, upcoming, past } = partitionEvents(events)

  return (
    <div style={{ maxWidth: 1040 }}>
      <PageTitle eyebrow="A MATILHA" sub="imersões presenciais e online — formato intensivo pra acelerar evolução.">imersões</PageTitle>

      {err ? <ErrorBox>erro: {err}</ErrorBox>
       : loading ? <Loading />
       : events.length === 0 ? (
          <Placeholder title="nenhuma imersão cadastrada" subtitle="cadastre em public.events com kind='imersao'." />
       ) : (
        <>
          {live.length > 0 && (
            <Section title="🔴 agora">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {live.map(e => <ImersaoCard key={e.id} event={e} live />)}
              </div>
            </Section>
          )}

          <Section title="próximas imersões">
            {upcoming.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>nenhuma imersão agendada no momento.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
                {upcoming.map(e => <ImersaoCard key={e.id} event={e} />)}
              </div>
            )}
          </Section>

          <Section title="replays de imersões">
            {past.filter(e => e.recording_url).length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>sem replays disponíveis.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                {past.filter(e => e.recording_url).map(e => <ImersaoCard key={e.id} event={e} replay />)}
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  )
}

function ImersaoCard({ event: e, live, replay }) {
  return (
    <div className="card" style={{
      padding: 18,
      background: live ? 'linear-gradient(135deg, #ef444410 0%, var(--surface-1) 50%)' : 'var(--surface-1)',
      borderColor: live ? '#ef444444' : 'var(--border)',
    }}>
      {e.cover_url && <img src={e.cover_url} alt="" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 6, marginBottom: 12 }} />}
      {live && (
        <div style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--live)', fontWeight: 600, fontFamily: 'var(--font-mono)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="dot dot-live" style={{ width: 6, height: 6 }} />
          AO VIVO
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <IZap size={12} stroke={1.6} style={{ color: 'var(--amber)' }} />
        <span className="label-muted" style={{ fontSize: 9 }}>IMERSÃO</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>
          {fmtDate(e.starts_at)}
        </span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>{e.title}</div>
      {e.host_name && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>com {e.host_name}</div>}
      {e.description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 12 }}>{e.description}</p>}

      {replay && e.recording_url && (isYoutubeUrl(e.recording_url) ? (
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 6, overflow: 'hidden' }}>
          <iframe src={youtubeEmbedUrl(e.recording_url)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} allow="accelerometer;autoplay;encrypted-media;picture-in-picture" allowFullScreen />
        </div>
      ) : (
        <a href={e.recording_url} target="_blank" rel="noreferrer" className="btn btn-primary">
          ver replay <IArrowRight size={12} stroke={2} />
        </a>
      ))}

      {!replay && e.live_url && (
        <a href={e.live_url} target="_blank" rel="noreferrer" className={live ? 'btn btn-primary' : 'btn'}>
          {live ? 'entrar na sala' : 'link da sala'} <IArrowRight size={12} stroke={2} />
        </a>
      )}
    </div>
  )
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
