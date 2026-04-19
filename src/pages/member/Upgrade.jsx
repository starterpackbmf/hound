import React from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import Hound from '../../components/Hound'
import {
  IBook, IPencil, IClock, IZap, ICalendar, IEye, IPlay,
  ITarget, IStar, GYinYang, IArrowRight, IMessage,
} from '../../components/icons'

const ROUTE_LABELS = {
  '/app/diario': 'Diário de trade',
  '/app/historico': 'Histórico',
  '/app/novo-trade': 'Registrar trade',
  '/app/estudo': 'Curso completo',
  '/app/aulas': 'Aulas ao vivo',
  '/app/imersoes': 'Imersões',
  '/app/monitoria': 'Monitoria individual',
  '/app/sessoes': 'Sessões de monitoria',
  '/app/plano-execucao': 'Plano de execução',
  '/app/oraculo': 'Oráculo IA',
  '/app/resumo-semanal': 'W.O.L.F AI',
  '/app/jornada': 'Minha Jornada',
}

const PERKS = [
  { icon: IPencil,    title: 'Diário de trade completo',     desc: 'Registre cada operação com MEN, MEP, parciais, emoções. Print + leitura técnica.', color: 'var(--cyan)' },
  { icon: IBook,      title: 'Curso Tradesystem completo',   desc: 'Todas as aulas, módulos aninhados, materiais PDF e mapas mentais. +6h de conteúdo exclusivo.', color: 'var(--purple)' },
  { icon: IPlay,      title: 'Aulas ao vivo + Open Class',   desc: 'Sala de trades diária, análise da abertura, Q&A semanal.', color: 'var(--pink)' },
  { icon: ICalendar,  title: 'Monitoria individual',         desc: 'Agende sessões com monitores certificados. Resumo pós-sessão salvo pra sempre.', color: 'var(--cyan)' },
  { icon: ITarget,    title: 'Plano de execução do monitor', desc: 'Seu monitor define stops, setups permitidos, regras anti-revenge adaptadas a você.', color: 'var(--purple)' },
  { icon: GYinYang,   title: 'Oráculo IA',                   desc: 'Pergunte qualquer coisa sobre o Tradesystem — IA treinada em todo acervo da mentoria.', color: 'var(--cyan)' },
  { icon: IZap,       title: 'W.O.L.F AI weekly report',     desc: 'Toda sexta às 17h, receba uma análise personalizada da sua semana operacional.', color: 'var(--pink)' },
  { icon: IEye,       title: 'Feedback do monitor',          desc: 'Monitor comenta teus trades individualmente, feedback diário com tags AJUSTAR/ELOGIAR.', color: 'var(--purple)' },
  { icon: IStar,      title: 'Imersões presenciais',         desc: 'Acesso aos eventos ao vivo da matilha + replays de imersões passadas.', color: 'var(--pink)' },
]

export default function Upgrade() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const fromRoute = params.get('from')
  const featureName = ROUTE_LABELS[fromRoute] || null

  // Link de checkout (Hotmart/Kiwify) — configurável via env
  const CHECKOUT_URL = import.meta.env.VITE_CHECKOUT_URL || 'https://matilha.app/mentoria'
  const CONTACT_WA = import.meta.env.VITE_SUPPORT_WA || '5511999999999'
  const waLink = `https://wa.me/${CONTACT_WA}?text=${encodeURIComponent('Quero virar mentorado da Matilha')}`

  return (
    <div style={{ maxWidth: 960, position: 'relative' }}>
      {/* Ambient glow reforçado */}
      <div style={{
        position: 'absolute', inset: '-40px',
        background: 'radial-gradient(ellipse 800px 600px at 50% 0%, rgba(236,72,153,0.12) 0%, transparent 60%), radial-gradient(ellipse 900px 700px at 80% 50%, rgba(168,85,247,0.1) 0%, transparent 60%), radial-gradient(ellipse 700px 500px at 10% 60%, rgba(0,217,255,0.1) 0%, transparent 60%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '40px 20px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--pink)', letterSpacing: '0.2em', fontWeight: 600, marginBottom: 16 }}>
            🔒 CONTEÚDO EXCLUSIVO DA MATILHA
          </div>
          <h1 className="display" style={{
            fontSize: 44, fontWeight: 400, margin: '0 0 14px',
            letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #00d9ff 100%)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 40px rgba(168,85,247,0.3))',
          }}>
            {featureName ? `${featureName} é premium` : 'Vira mentorado da matilha'}
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto 24px', lineHeight: 1.55 }}>
            {featureName
              ? `Pra acessar ${featureName.toLowerCase()} e o ecossistema completo de trade, vira mentorado.`
              : 'Acesso completo ao curso Tradesystem, diário de trade, monitoria individual, IA própria e a matilha inteira.'}
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
            <a href={CHECKOUT_URL} target="_blank" rel="noreferrer" className="btn btn-primary" style={{
              fontSize: 14, padding: '14px 28px',
              boxShadow: '0 0 40px rgba(0,217,255,0.4)',
            }}>
              virar mentorado agora <IArrowRight size={14} stroke={2} />
            </a>
            <a href={waLink} target="_blank" rel="noreferrer" className="btn btn-outline-cyan" style={{ fontSize: 13, padding: '14px 20px' }}>
              <IMessage size={13} stroke={1.8} /> falar com suporte
            </a>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            já é mentorado? {user?.email ? 'teu status ainda é pendente — contate o suporte pra ativar' : 'faça login'}
          </div>
        </div>

        {/* Grid de perks */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14,
          marginTop: 40, marginBottom: 40,
        }}>
          {PERKS.map((p, i) => (
            <div key={i} className="card" style={{ padding: 20 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${p.color}1f`, color: p.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 12,
                boxShadow: `0 0 20px ${p.color}22`,
              }}>
                <p.icon size={20} stroke={1.6} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
                {p.title}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {p.desc}
              </div>
            </div>
          ))}
        </div>

        {/* Comparação free vs premium */}
        <div className="card" style={{ padding: 24, marginBottom: 40 }}>
          <div className="eyebrow" style={{ textAlign: 'center', marginBottom: 20 }}>
            FREE × MENTORADO
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <ComparisonCol
              title="GRÁTIS"
              color="var(--text-muted)"
              items={[
                'Fórum da comunidade',
                'Social feed',
                'Cursos gratuitos (demo)',
                'Relatório público da matilha',
                'Pack Store (ganhar moedas)',
                'Parcerias (bônus em corretoras)',
              ]}
            />
            <ComparisonCol
              title="MENTORADO"
              color="var(--cyan)"
              highlight
              items={[
                'Tudo do grátis +',
                '✨ Curso Tradesystem completo',
                '✨ Diário de trade V3.0',
                '✨ Aulas ao vivo + Open Class',
                '✨ Monitoria individual ilimitada',
                '✨ Plano de execução personalizado',
                '✨ Oráculo IA + W.O.L.F weekly',
                '✨ Feedback do monitor em cada trade',
                '✨ Ranking Matilha (6 níveis)',
                '✨ Imersões presenciais',
              ]}
            />
          </div>
        </div>

        {/* CTA final */}
        <div style={{
          padding: 32, marginBottom: 40, textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(236,72,153,0.08) 0%, rgba(168,85,247,0.08) 50%, rgba(0,217,255,0.08) 100%)',
          border: '1px solid rgba(168,85,247,0.25)',
          borderRadius: 16,
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        }}>
          <div style={{ marginBottom: 14, opacity: 0.7 }}>
            <Hound size={56} />
          </div>
          <h2 className="display" style={{ fontSize: 22, fontWeight: 500, margin: '0 0 8px' }}>
            a matilha tá te esperando
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 440, margin: '0 auto 18px', lineHeight: 1.6 }}>
            Mais de 140 traders dentro. Semana passada a matilha fechou +R$26k de resultado agregado. Bora?
          </p>
          <a href={CHECKOUT_URL} target="_blank" rel="noreferrer" className="btn btn-primary" style={{
            fontSize: 13, padding: '12px 24px',
            boxShadow: '0 0 30px rgba(0,217,255,0.3)',
          }}>
            quero virar mentorado <IArrowRight size={13} stroke={2} />
          </a>
          <div style={{ marginTop: 20 }}>
            <Link to="/app/inicio" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              ← voltar pra área grátis
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function ComparisonCol({ title, color, items, highlight }) {
  return (
    <div style={{
      padding: 16,
      borderRadius: 10,
      background: highlight ? 'rgba(0,217,255,0.05)' : 'transparent',
      border: highlight ? '1px solid rgba(0,217,255,0.2)' : '1px solid transparent',
    }}>
      <div style={{
        fontSize: 11, letterSpacing: '0.2em', color, fontWeight: 600,
        textAlign: 'center', marginBottom: 14,
      }}>
        {title}
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it, i) => (
          <li key={i} style={{
            fontSize: 12.5,
            color: highlight ? 'var(--text-primary)' : 'var(--text-secondary)',
            lineHeight: 1.55,
          }}>
            {it}
          </li>
        ))}
      </ul>
    </div>
  )
}
