import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { matilha } from '../../lib/matilha'
import { getMyProfile } from '../../lib/profile'
import { isPremium } from '../../lib/gate'
import { PageTitle, Placeholder, ErrorBox, Loading } from './ui'
import { IBook, IArrowRight } from '../../components/icons'

export default function CursosGratis() {
  const [courses, setCourses] = useState([])
  const [premiumPreview, setPremiumPreview] = useState([])
  const [userIsPremium, setUserIsPremium] = useState(true)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        const [localRes, lovableCourses, profile] = await Promise.all([
          supabase.from('courses').select('*').eq('is_free', true).order('order_index'),
          matilha.table('courses', { limit: 50, order: 'order_index.asc' }).catch(() => []),
          getMyProfile().catch(() => null),
        ])
        if (cancel) return
        if (localRes.error) setErr(localRes.error.message)
        else setCourses(localRes.data || [])
        const isPro = isPremium(profile)
        setUserIsPremium(isPro)
        // mostra preview dos cursos do Lovable só pra quem é free
        if (!isPro) {
          setPremiumPreview((lovableCourses || []).filter(c => c.published !== false).slice(0, 6))
        }
      } catch (e) {
        if (!cancel) setErr(e.message)
      } finally {
        if (!cancel) setLoading(false)
      }
    })()
    return () => { cancel = true }
  }, [])

  return (
    <div style={{ maxWidth: 1040 }}>
      <PageTitle eyebrow="COMUNIDADE" sub="conteúdo liberado pra todo mundo — pra quem tá começando ou quer provar do Tradesystem.">
        cursos grátis
      </PageTitle>

      {err ? <ErrorBox>erro: {err}</ErrorBox>
       : loading ? <Loading />
       : courses.length === 0 && premiumPreview.length === 0 ? (
          <Placeholder title="nenhum curso grátis ainda" subtitle="marque cursos com is_free=true no Supabase pra aparecer aqui." />
       ) : (
        <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {courses.map(c => (
            <Link key={c.id} to={`/app/estudo/${c.slug}`} className="card card-hover" style={{
              display: 'flex', flexDirection: 'column', gap: 10, padding: 16,
              color: 'var(--text-primary)',
            }}>
              {c.cover_url ? (
                <img src={c.cover_url} alt="" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 6 }} />
              ) : (
                <div style={{
                  width: '100%', aspectRatio: '16/9', borderRadius: 6,
                  background: 'linear-gradient(135deg, #0d0d0f, #18181b)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--up)', opacity: 0.6,
                }}>
                  <IBook size={28} stroke={1.2} />
                </div>
              )}
              <span className="pill pill-up" style={{ alignSelf: 'flex-start', fontSize: 9 }}>GRÁTIS</span>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{c.title}</div>
              {c.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.description}</div>}
              <div style={{ fontSize: 11, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto' }}>
                entrar <IArrowRight size={11} stroke={1.8} />
              </div>
            </Link>
          ))}
        </div>

        {!userIsPremium && premiumPreview.length > 0 && (
          <div style={{ marginTop: 36 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
            }}>
              <span className="label-muted">🔒 bloqueado — só pra mentorados</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              {premiumPreview.map(c => (
                <Link key={c.id} to={`/app/upgrade?from=/app/estudo/${c.slug || c.id}`} className="card card-hover" style={{
                  display: 'flex', flexDirection: 'column', gap: 10, padding: 16,
                  color: 'var(--text-primary)', position: 'relative', overflow: 'hidden',
                  opacity: 0.92,
                }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(135deg, rgba(168,85,247,0.08), transparent 70%)',
                    pointerEvents: 'none',
                  }} />
                  {c.cover_url ? (
                    <img src={c.cover_url} alt="" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 6, filter: 'grayscale(0.3)' }} />
                  ) : (
                    <div style={{
                      width: '100%', aspectRatio: '16/9', borderRadius: 6,
                      background: 'linear-gradient(135deg, #1a1a1f, #0d0d12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--purple)', opacity: 0.7,
                    }}>
                      <IBook size={28} stroke={1.2} />
                    </div>
                  )}
                  <span className="pill" style={{
                    alignSelf: 'flex-start', fontSize: 9, color: 'var(--purple)',
                    borderColor: 'rgba(168,85,247,0.3)',
                  }}>🔒 MENTORADO</span>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{c.title}</div>
                  {c.description && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {c.description.slice(0, 90)}{c.description.length > 90 ? '…' : ''}
                    </div>
                  )}
                  <div style={{
                    fontSize: 11, color: 'var(--pink)',
                    display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto',
                  }}>
                    destrave <IArrowRight size={11} stroke={1.8} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
        </>
      )}
    </div>
  )
}
