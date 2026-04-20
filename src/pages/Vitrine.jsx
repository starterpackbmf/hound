import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Hound from '../components/Hound'

const CHECKOUT_URL = import.meta.env.VITE_CHECKOUT_URL || '#'
const WA_URL = import.meta.env.VITE_SUPPORT_WA || '#'

const PILARES = [
  {
    emoji: '📓', titulo: 'diário de trade',
    desc: 'cada trade com contexto, setup, emoção e print. o diário cresce com você — virando a memória da sua evolução.',
    color: '#00d9ff',
  },
  {
    emoji: '🐺', titulo: 'w.o.l.f ai',
    desc: 'a IA da matilha lê seu diário toda semana e te dá um raio-x: padrões, vícios, pontos cegos. nada de achismo.',
    color: '#a855f7',
  },
  {
    emoji: '📅', titulo: 'monitoria ao vivo',
    desc: 'acompanhamento semanal com o monitor, plano de execução customizado e revisão de trades reais seus.',
    color: '#ec4899',
  },
  {
    emoji: '🔮', titulo: 'oráculo',
    desc: 'biblioteca de casos + assistente com contexto. pergunta qualquer coisa sobre o método e tem resposta em segundos.',
    color: '#f59e0b',
  },
  {
    emoji: '🎓', titulo: 'tradesystem completo',
    desc: 'mais de 80 aulas estruturadas, imersões mensais e open classes ao vivo toda semana.',
    color: '#00d9ff',
  },
  {
    emoji: '⚡', titulo: 'comunidade predadora',
    desc: 'matilha fechada, desafios semanais, ranking de consistência, SC (soul coins) e packstore exclusivo.',
    color: '#a855f7',
  },
]

const FAQ = [
  {
    q: 'preciso ter experiência pra entrar?',
    a: 'não. o método é do zero ao operacional — a gente te pega onde você tá e te leva pra onde você quer chegar.',
  },
  {
    q: 'quanto tempo vou precisar dedicar?',
    a: '2h por dia pra estudar + o tempo da janela de operação (das 09h às 10h30, geralmente). quem dedica menos demora mais — é matemática.',
  },
  {
    q: 'como funciona o diário e o W.O.L.F?',
    a: 'você lança cada trade no diário (setup, contexto, emoção, print). toda semana o W.O.L.F lê tudo e te devolve um relatório com padrões, pontos fortes e vícios a corrigir.',
  },
  {
    q: 'a monitoria é em grupo ou individual?',
    a: 'grupo pequeno, com o monitor revisando trades reais seus semana após semana. a frequência e formato a gente alinha no onboarding.',
  },
  {
    q: 'e se eu quiser desistir?',
    a: 'garantia de 7 dias. entrou, não gostou, devolvemos. simples.',
  },
]

export default function Vitrine() {
  const [open, setOpen] = useState(null)

  useEffect(() => {
    document.title = 'Matilha — mentoria de day trade'
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0e',
      color: '#fff',
      fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{CSS}</style>

      {/* ambient background */}
      <div style={{
        position: 'fixed', inset: 0,
        background: `
          radial-gradient(ellipse at 15% 0%, rgba(236,72,153,0.12) 0%, transparent 40%),
          radial-gradient(ellipse at 85% 100%, rgba(0,217,255,0.10) 0%, transparent 40%),
          radial-gradient(ellipse at 50% 50%, rgba(168,85,247,0.08) 0%, transparent 60%)
        `,
        pointerEvents: 'none',
      }} />
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      {/* NAV */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 20,
        padding: '16px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(10,10,14,0.55)',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none" style={{ color: '#00d9ff', filter: 'drop-shadow(0 0 8px #00d9ff)' }}>
            <polygon points="7 1 13 12 1 12" fill="currentColor" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.22em' }}>MATILHA</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <a href="#pilares" style={navLink}>o método</a>
          <a href="#comparativo" style={navLink}>planos</a>
          <a href="#faq" style={navLink}>faq</a>
          <Link to="/login" style={{ ...navLink, color: '#fff' }}>entrar</Link>
          <a href={CHECKOUT_URL} style={ctaNavBtn}>virar mentorado</a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: 'relative', zIndex: 2, padding: '80px 40px 120px', textAlign: 'center', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <Hound size={72} />
        </div>
        <div style={{
          display: 'inline-block',
          fontSize: 11, letterSpacing: '0.22em', fontFamily: 'JetBrains Mono, monospace',
          padding: '6px 14px', borderRadius: 999,
          background: 'rgba(168,85,247,0.15)',
          border: '1px solid rgba(168,85,247,0.35)',
          color: '#a855f7',
          marginBottom: 28,
        }}>
          MENTORIA DE DAY TRADE — MINI ÍNDICE E MINI DÓLAR
        </div>
        <h1 style={{
          fontSize: 'clamp(40px, 7vw, 84px)',
          fontWeight: 300, letterSpacing: '-0.04em', lineHeight: 1.02,
          margin: '0 0 28px',
        }}>
          vire trader<br/>
          <span style={{
            background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #00d9ff 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>de verdade</span>
        </h1>
        <p style={{
          fontSize: 'clamp(15px, 1.5vw, 19px)', color: 'rgba(255,255,255,0.7)',
          lineHeight: 1.6, maxWidth: 640, margin: '0 auto 44px',
        }}>
          método estruturado, diário inteligente, monitoria ao vivo e uma IA que lê seus trades toda semana. a matilha transforma iniciante em predador disciplinado.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href={CHECKOUT_URL} style={{
            padding: '16px 28px',
            borderRadius: 10,
            background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #00d9ff 100%)',
            color: '#0a0a0e', fontSize: 14, fontWeight: 700,
            letterSpacing: '0.04em',
            textDecoration: 'none',
            boxShadow: '0 20px 60px -10px rgba(168,85,247,0.5)',
            transition: 'transform 0.2s',
          }}>
            QUERO ENTRAR NA MATILHA →
          </a>
          <a href="#pilares" style={{
            padding: '16px 28px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff', fontSize: 14, fontWeight: 500,
            textDecoration: 'none',
          }}>
            ver o método
          </a>
        </div>
        <div style={{
          marginTop: 48, display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap',
          fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          <span>✓ 7 dias de garantia</span>
          <span>✓ acesso vitalício ao curso</span>
          <span>✓ monitoria ao vivo</span>
        </div>
      </section>

      {/* PILARES */}
      <section id="pilares" style={{ position: 'relative', zIndex: 2, padding: '80px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="eyebrow">O MÉTODO</div>
          <h2 style={sectionTitle}>6 pilares que viram 1 trader</h2>
          <p style={sectionSub}>cada peça da matilha foi desenhada pra te tirar do achismo e te colocar no operacional consistente.</p>
        </div>
        <div style={{
          display: 'grid', gap: 16,
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        }}>
          {PILARES.map((p, i) => (
            <div key={p.titulo} className="pillar-card" style={{
              padding: 28,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: -30, right: -30, width: 120, height: 120,
                background: `radial-gradient(circle, ${p.color}22 0%, transparent 70%)`,
                pointerEvents: 'none',
              }} />
              <div style={{ fontSize: 30, marginBottom: 14 }}>{p.emoji}</div>
              <div style={{
                fontSize: 18, fontWeight: 600, color: p.color, marginBottom: 10,
                letterSpacing: '-0.01em',
              }}>{p.titulo}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.55 }}>
                {p.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* COMPARATIVO */}
      <section id="comparativo" style={{ position: 'relative', zIndex: 2, padding: '80px 40px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="eyebrow">PLANOS</div>
          <h2 style={sectionTitle}>grátis × mentorado</h2>
          <p style={sectionSub}>o plano grátis é um gostinho. o mentorado é o caminho inteiro.</p>
        </div>
        <div style={{
          display: 'grid', gap: 16,
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        }}>
          <div style={{
            padding: 32, borderRadius: 16,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: 10 }}>FREE</div>
            <div style={{ fontSize: 32, fontWeight: 300, marginBottom: 4 }}>R$ 0</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>sempre grátis</div>
            <ul style={listStyle}>
              {['comunidade', 'cursos grátis', 'desafios semanais', 'pack store (com SC)', 'destaques'].map(i => (
                <li key={i} style={liStyle}>✓ {i}</li>
              ))}
              {['❌ diário de trade', '❌ W.O.L.F AI', '❌ monitoria ao vivo', '❌ oráculo', '❌ tradesystem completo', '❌ imersões'].map(i => (
                <li key={i} style={{ ...liStyle, color: 'rgba(255,255,255,0.3)' }}>{i}</li>
              ))}
            </ul>
            <Link to="/login" style={secondaryCta}>criar conta grátis</Link>
          </div>
          <div style={{
            padding: 32, borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(236,72,153,0.08) 0%, rgba(168,85,247,0.08) 50%, rgba(0,217,255,0.08) 100%)',
            border: '1px solid rgba(168,85,247,0.4)',
            boxShadow: '0 0 40px rgba(168,85,247,0.18)',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: -10, right: 24,
              padding: '4px 10px', borderRadius: 999,
              background: 'linear-gradient(135deg, #ec4899, #a855f7, #00d9ff)',
              color: '#0a0a0e', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
            }}>RECOMENDADO</div>
            <div style={{
              fontSize: 11, letterSpacing: '0.18em', fontWeight: 600, marginBottom: 10,
              background: 'linear-gradient(90deg, #ec4899, #a855f7, #00d9ff)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>MENTORADO</div>
            <div style={{ fontSize: 32, fontWeight: 300, marginBottom: 4 }}>consultar</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>pagamento único ou parcelado</div>
            <ul style={listStyle}>
              {[
                'tudo do free',
                'diário de trade + histórico',
                'W.O.L.F AI semanal',
                'monitoria ao vivo',
                'plano de execução',
                'oráculo (IA com contexto)',
                'tradesystem (80+ aulas)',
                'imersões presenciais',
                'feedback de trades reais',
                'jornada do trader (rank)',
              ].map(i => (
                <li key={i} style={liStyle}>✓ {i}</li>
              ))}
            </ul>
            <a href={CHECKOUT_URL} style={primaryCta}>quero virar mentorado</a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ position: 'relative', zIndex: 2, padding: '80px 40px 40px', maxWidth: 720, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div className="eyebrow">DÚVIDAS FREQUENTES</div>
          <h2 style={sectionTitle}>perguntas que sempre aparecem</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FAQ.map((item, i) => (
            <button
              key={i}
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                textAlign: 'left',
                padding: '18px 22px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
                color: '#fff',
                fontFamily: 'inherit',
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: 15, fontWeight: 500,
              }}>
                <span>{item.q}</span>
                <span style={{ color: '#a855f7', transform: open === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>+</span>
              </div>
              {open === i && (
                <div style={{
                  marginTop: 14, fontSize: 14, lineHeight: 1.6,
                  color: 'rgba(255,255,255,0.65)',
                }}>
                  {item.a}
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ position: 'relative', zIndex: 2, padding: '80px 40px 120px', textAlign: 'center', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <Hound size={56} />
        </div>
        <h2 style={{
          fontSize: 'clamp(32px, 5vw, 56px)',
          fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.05,
          margin: '0 0 20px',
        }}>
          a matilha tá te esperando.
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 36 }}>
          quem entra hoje tá operando em 30 dias. quem deixa pra depois continua onde tá.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href={CHECKOUT_URL} style={{
            padding: '18px 32px',
            borderRadius: 10,
            background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #00d9ff 100%)',
            color: '#0a0a0e', fontSize: 15, fontWeight: 700, letterSpacing: '0.04em',
            textDecoration: 'none',
            boxShadow: '0 20px 60px -10px rgba(168,85,247,0.5)',
          }}>
            QUERO ENTRAR NA MATILHA →
          </a>
          {WA_URL !== '#' && (
            <a href={WA_URL} style={{
              padding: '18px 32px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', fontSize: 15, fontWeight: 500,
              textDecoration: 'none',
            }}>
              tirar dúvida no whatsapp
            </a>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        position: 'relative', zIndex: 2,
        padding: '40px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        textAlign: 'center',
        fontSize: 12, color: 'rgba(255,255,255,0.4)',
      }}>
        <div style={{ marginBottom: 8 }}>MATILHA · mentoria de day trade</div>
        <div>© {new Date().getFullYear()} — todos os direitos reservados</div>
      </footer>
    </div>
  )
}

const navLink = {
  fontSize: 13, color: 'rgba(255,255,255,0.65)',
  textDecoration: 'none', transition: 'color 0.15s',
}
const ctaNavBtn = {
  padding: '8px 14px', borderRadius: 8,
  background: 'linear-gradient(135deg, #ec4899, #a855f7, #00d9ff)',
  color: '#0a0a0e', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
  textDecoration: 'none',
}
const sectionTitle = {
  fontSize: 'clamp(30px, 4.5vw, 48px)',
  fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.1,
  margin: '0 0 14px',
}
const sectionSub = {
  fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, maxWidth: 560, margin: '0 auto',
}
const listStyle = {
  listStyle: 'none', padding: 0, margin: '0 0 28px',
  display: 'flex', flexDirection: 'column', gap: 10,
}
const liStyle = {
  fontSize: 14, color: 'rgba(255,255,255,0.85)',
}
const primaryCta = {
  display: 'block', textAlign: 'center',
  padding: '14px 20px', borderRadius: 10,
  background: 'linear-gradient(135deg, #ec4899, #a855f7, #00d9ff)',
  color: '#0a0a0e', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
  textDecoration: 'none',
}
const secondaryCta = {
  display: 'block', textAlign: 'center',
  padding: '14px 20px', borderRadius: 10,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', fontSize: 13, fontWeight: 500,
  textDecoration: 'none',
}

const CSS = `
  .eyebrow {
    font-size: 11px; letter-spacing: 0.22em; font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
    color: rgba(255,255,255,0.5); margin-bottom: 14px;
  }
  .pillar-card { transition: transform 0.2s, border-color 0.2s; }
  .pillar-card:hover { transform: translateY(-3px); border-color: rgba(255,255,255,0.18) !important; }
  .orb {
    position: fixed; border-radius: 50%; filter: blur(80px);
    pointer-events: none; z-index: 1;
    animation: float 18s ease-in-out infinite;
  }
  .orb-1 {
    width: 400px; height: 400px;
    background: rgba(236,72,153,0.15);
    top: -100px; left: -100px;
  }
  .orb-2 {
    width: 500px; height: 500px;
    background: rgba(0,217,255,0.12);
    bottom: -150px; right: -150px;
    animation-delay: -9s;
  }
  @keyframes float {
    0%, 100% { transform: translate(0, 0); }
    33% { transform: translate(40px, -30px); }
    66% { transform: translate(-30px, 40px); }
  }
  html { scroll-behavior: smooth; }
  a:hover { opacity: 0.85; }
`
