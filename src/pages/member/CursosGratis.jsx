import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { PageTitle, Placeholder, ErrorBox, Loading } from './ui'
import { IBook, IArrowRight } from '../../components/icons'

export default function CursosGratis() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  useEffect(() => {
    supabase.from('courses').select('*').eq('is_free', true).order('order_index')
      .then(({ data, error }) => {
        if (error) setErr(error.message)
        else setCourses(data || [])
      })
      .then(() => setLoading(false))
  }, [])

  return (
    <div style={{ maxWidth: 1040 }}>
      <PageTitle eyebrow="COMUNIDADE" sub="conteúdo liberado pra todo mundo — pra quem tá começando ou quer provar do Tradesystem.">
        cursos grátis
      </PageTitle>

      {err ? <ErrorBox>erro: {err}</ErrorBox>
       : loading ? <Loading />
       : courses.length === 0 ? (
          <Placeholder title="nenhum curso grátis ainda" subtitle="marque cursos com is_free=true no Supabase pra aparecer aqui." />
       ) : (
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
      )}
    </div>
  )
}
