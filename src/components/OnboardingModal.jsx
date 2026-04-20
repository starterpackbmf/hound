import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Hound from './Hound'
import { getMyProfile } from '../lib/profile'
import { isPremium } from '../lib/gate'

const STORAGE_KEY = 'matilha:onboarding:v1'

const STEPS_FREE = [
  {
    emoji: '🐺',
    title: 'bem-vindo à matilha',
    body: 'aqui é onde traders iniciantes viram predadores disciplinados. mesmo no plano grátis, você já tem acesso a um monte de coisa.',
    cta: 'vamos começar',
  },
  {
    emoji: '⚡',
    title: 'o que você pode fazer já',
    body: '• comunidade matilha + comentários\n• cursos grátis do tradesystem\n• desafios semanais pra ganhar StarterCoins\n• pack store com moedas\n• destaques dos traders da semana',
    cta: 'legal, próximo',
  },
  {
    emoji: '✨',
    title: 'e se quiser mais…',
    body: 'virando mentorado você destrava diário de trade, W.O.L.F AI, monitoria ao vivo, oráculo, plano de execução e o tradesystem completo com 80+ aulas.',
    cta: 'ver planos',
    link: '/app/upgrade',
  },
]

const STEPS_PREMIUM = [
  {
    emoji: '🐺',
    title: 'bem-vindo à matilha',
    body: 'você acabou de entrar no sistema que transforma trader iniciante em predador disciplinado. prepara, porque aqui a coisa é séria.',
    cta: 'vamos começar',
  },
  {
    emoji: '📓',
    title: 'comece pelo diário',
    body: 'todo trade que você fizer, registra. contexto, setup, emoção e print. o diário é a memória do seu operacional — e o que alimenta o W.O.L.F AI.',
    cta: 'entendi',
  },
  {
    emoji: '🐺',
    title: 'w.o.l.f ai toda semana',
    body: 'toda semana o W.O.L.F lê seu diário e gera um relatório: padrões, vícios, pontos cegos. não perde por nada — é onde tá a evolução.',
    cta: 'próximo',
  },
  {
    emoji: '🎓',
    title: 'estuda todo dia',
    body: 'o tradesystem tá todo em "aulas". estuda na ordem. as imersões mensais e as open classes ao vivo aceleram tudo. chega pra jogar.',
    cta: 'bora começar',
  },
]

export default function OnboardingModal() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [premium, setPremium] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY)
    if (seen) return
    getMyProfile().catch(() => null).then(p => {
      if (!p) return
      setPremium(isPremium(p))
      setTimeout(() => setOpen(true), 600)
    })
  }, [])

  function close() {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
    setOpen(false)
  }

  if (!open) return null

  const steps = premium ? STEPS_PREMIUM : STEPS_FREE
  const current = steps[step]
  const isLast = step === steps.length - 1

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(5,5,8,0.78)',
      backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      animation: 'fadeIn 0.3s ease',
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={{
        maxWidth: 460, width: '100%',
        padding: '36px 32px 28px',
        borderRadius: 20,
        background: 'linear-gradient(180deg, rgba(20,20,28,0.95), rgba(10,10,14,0.95))',
        border: '1px solid rgba(168,85,247,0.25)',
        boxShadow: '0 30px 80px -20px rgba(168,85,247,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
        position: 'relative',
        animation: 'slideUp 0.4s cubic-bezier(.2,.8,.2,1)',
      }}>
        <button onClick={close} style={{
          position: 'absolute', top: 14, right: 14,
          width: 28, height: 28, borderRadius: 8,
          background: 'rgba(255,255,255,0.05)', border: 'none',
          color: 'rgba(255,255,255,0.6)', fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <Hound size={56} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>{current.emoji}</div>
          <div style={{
            fontSize: 22, fontWeight: 500, color: '#fff',
            letterSpacing: '-0.02em', marginBottom: 12,
          }}>
            {current.title}
          </div>
          <div style={{
            fontSize: 13.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6,
            whiteSpace: 'pre-line',
          }}>
            {current.body}
          </div>
        </div>

        {/* progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 22 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 20 : 6,
              height: 6, borderRadius: 999,
              background: i === step
                ? 'linear-gradient(90deg, #ec4899, #a855f7, #00d9ff)'
                : 'rgba(255,255,255,0.15)',
              transition: 'width 0.3s',
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{
              padding: '12px 18px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', fontSize: 12, cursor: 'pointer',
            }}>
              voltar
            </button>
          )}
          {isLast && current.link ? (
            <Link
              to={current.link}
              onClick={close}
              style={{
                flex: 1, padding: '12px 18px', borderRadius: 10,
                background: 'linear-gradient(135deg, #ec4899, #a855f7, #00d9ff)',
                color: '#0a0a0e', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
                textAlign: 'center', textDecoration: 'none',
              }}
            >
              {current.cta.toUpperCase()} →
            </Link>
          ) : (
            <button
              onClick={() => isLast ? close() : setStep(s => s + 1)}
              style={{
                flex: 1, padding: '12px 18px', borderRadius: 10,
                background: isLast ? 'linear-gradient(135deg, #ec4899, #a855f7, #00d9ff)' : 'rgba(255,255,255,0.08)',
                border: isLast ? 'none' : '1px solid rgba(255,255,255,0.12)',
                color: isLast ? '#0a0a0e' : '#fff',
                fontSize: 13, fontWeight: 600, letterSpacing: '0.04em',
                cursor: 'pointer',
              }}
            >
              {current.cta}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
