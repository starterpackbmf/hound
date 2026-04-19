import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listCourses } from '../../lib/courses'
import { PageTitle, Section, Placeholder, ErrorBox, Loading } from './ui'
import { IBook, IArrowRight } from '../../components/icons'

export default function Estudo() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  useEffect(() => {
    listCourses()
      .then(setCourses)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ maxWidth: 1040 }}>
      <PageTitle eyebrow="A MATILHA" sub="conteúdo da mentoria — estudo dirigido, acompanhado e vivo.">estudo</PageTitle>

      <Section title="cursos disponíveis">
        {loading ? <Loading />
         : err ? <ErrorBox>erro: {err} — rode <code>supabase/migrations/0002_estudo.sql</code> se ainda não rodou.</ErrorBox>
         : courses.length === 0 ? (
           <Placeholder
             title="nenhum curso cadastrado ainda"
             subtitle="rode scripts/sync-panda.js pra importar do Panda Video, ou crie em public.courses no Supabase."
           />
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
                     width: '100%', aspectRatio: '16/9',
                     background: 'linear-gradient(135deg, #0d0d0f, #18181b)',
                     borderRadius: 6,
                     display: 'flex', alignItems: 'center', justifyContent: 'center',
                     color: 'var(--amber)', opacity: 0.6,
                   }}>
                     <IBook size={28} stroke={1.2} />
                   </div>
                 )}
                 {c.is_free && (
                   <span className="pill pill-up" style={{ alignSelf: 'flex-start', fontSize: 9 }}>GRÁTIS</span>
                 )}
                 <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{c.title}</div>
                 {c.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.description}</div>}
                 <div style={{ fontSize: 11, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto' }}>
                   entrar <IArrowRight size={11} stroke={1.8} />
                 </div>
               </Link>
             ))}
           </div>
         )}
      </Section>
    </div>
  )
}
