import React from 'react'
import { embedUrl } from '../../lib/panda'

export default function PandaPlayer({ videoId, title }) {
  const url = embedUrl(videoId)
  if (!url) return <div style={{ color: '#ff453a' }}>player host não configurado</div>
  return (
    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, background: '#000', borderRadius: 8, overflow: 'hidden' }}>
      <iframe
        key={videoId}
        src={url}
        title={title || 'aula'}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
        allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}
