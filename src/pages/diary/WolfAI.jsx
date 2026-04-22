import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { listAccounts } from '../../lib/trades'
import { getMyProfile } from '../../lib/profile'
import {
  getBriefing, listBriefings, generateBriefing,
  currentMonday, previousMonday, nextMonday, formatWeekLabel, parseLightMarkdown,
} from '../../lib/wolfBriefing'
import { ErrorBox, Loading } from '../member/ui'
import { InkSelect } from '../../components/InkControls'
import {
  IArrowLeft, IArrowRight, ITrendingUp, ITrendingDown, IZap,
  ITarget, ICheck, IChevronDown, IChevronRight, IStar,
} from '../../components/icons'

// TODO: quando tiver sistema de roles, trocar pra checar mentorado real
function isMentorado(profile) {
  // placeholder: libera pra todo mundo por enquanto
  return true
}

export default function WolfAI() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [accountId, setAccountId] = useState('')

  const [currentWeek, setCurrentWeek] = useState(currentMonday())
  const [briefing, setBriefing] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [err, setErr] = useState(null)

  // init
  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const [p, accs] = await Promise.all([getMyProfile(), listAccounts()])
        setProfile(p)
        setAccounts(accs)
        const def = accs.find(a => a.is_default) || accs[0]
        if (def) setAccountId(def.id)
      } catch (e) {
        setErr(e.message)
      }
    })()
  }, [user])

  // fetch briefing quando muda semana (1 briefing por aluno por semana, independente de conta)
  useEffect(() => {
    if (!accountId) return
    setLoading(true)
    ;(async () => {
      try {
        const [b, h] = await Promise.all([
          getBriefing({ weekStart: currentWeek }),
          listBriefings({ limit: 12 }),
        ])
        setBriefing(b)
        setHistory(h)
        setErr(null)
      } catch (e) {
        setErr(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [accountId, currentWeek])

  async function onGenerate(force = false) {
    if (generating) return
    setGenerating(true)
    setErr(null)
    try {
      const b = await generateBriefing({ weekStart: currentWeek, accountId, force })
      setBriefing(b)
      const h = await listBriefings({ limit: 12 })
      setHistory(h)
    } catch (e) {
      setErr(e.message || 'falha ao gerar briefing')
    } finally {
      setGenerating(false)
    }
  }

  const mentorado = isMentorado(profile)

  if (!mentorado) return <NotMentoradoGate />

  return (
    <div className="ink-modal" style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-green)', fontWeight: 700, marginBottom: 4 }}>
            W.O.L.F AI
          </div>
          <h1 style={{
            fontSize: 28, fontWeight: 700, letterSpacing: '0.02em',
            margin: 0, color: 'var(--ink-text, var(--text-primary))',
            textTransform: 'uppercase',
          }}>
            Briefing Semanal
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            análise narrativa da sua semana de operações gerada pelo W.O.L.F.
          </div>
        </div>
        {accounts.length > 1 && (
          <div style={{ minWidth: 200 }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4, fontWeight: 600, textAlign: 'right' }}>
              Conta
            </div>
            <InkSelect
              glass
              value={accountId}
              onChange={setAccountId}
              options={accounts.map(a => ({ value: a.id, label: a.name }))}
            />
          </div>
        )}
      </div>

      {/* Week navigator */}
      <div className="ink-card" style={{
        padding: '12px 14px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        <button
          onClick={() => setCurrentWeek(previousMonday(currentWeek))}
          className="btn btn-ghost" style={{ padding: 8 }}
          title="Semana anterior"
        >
          <IArrowLeft size={14} stroke={1.8} />
        </button>
        <div style={{
          fontSize: 13, color: 'var(--text-primary)',
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 500,
          minWidth: 180, textAlign: 'center',
        }}>
          {formatWeekLabel(currentWeek)}
          {currentWeek === currentMonday() && (
            <span style={{
              marginLeft: 8, padding: '2px 8px', borderRadius: 4,
              background: 'rgba(24,209,138,0.14)', color: 'var(--ink-green)',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
            }}>
              atual
            </span>
          )}
        </div>
        <button
          onClick={() => setCurrentWeek(nextMonday(currentWeek))}
          disabled={currentWeek >= currentMonday()}
          className="btn btn-ghost" style={{ padding: 8, opacity: currentWeek >= currentMonday() ? 0.3 : 1 }}
          title="Próxima semana"
        >
          <IArrowRight size={14} stroke={1.8} />
        </button>
        <div style={{ flex: 1 }} />
        {history.length > 0 && (
          <InkSelect
            glass
            value={currentWeek}
            onChange={setCurrentWeek}
            options={history.map(b => ({
              value: b.week_start,
              label: formatWeekLabel(b.week_start) + ' · ' + (b.mood_tag || '—'),
            }))}
          />
        )}
      </div>

      {err && <ErrorBox>{err}</ErrorBox>}

      {loading ? (
        <Loading />
      ) : briefing ? (
        <BriefingView
          briefing={briefing}
          accounts={accounts}
          onRegenerate={() => onGenerate(true)}
          generating={generating}
        />
      ) : (
        <EmptyState
          weekStart={currentWeek}
          accountId={accountId}
          accounts={accounts}
          onGenerate={() => onGenerate(false)}
          generating={generating}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// BRIEFING VIEW
// ═══════════════════════════════════════════════════════════
function BriefingView({ briefing, accounts, onRegenerate, generating }) {
  const sourceAccount = accounts?.find(a => a.id === briefing.account_id)
  const moodColor = (briefing.mood_tag || '').toLowerCase().includes('positiv') ? 'var(--up)'
    : (briefing.mood_tag || '').toLowerCase().includes('ajuste') ? 'var(--amber)'
    : (briefing.mood_tag || '').toLowerCase().includes('negativ') ? 'var(--down)'
    : 'var(--ink-green)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* HERO — summary + stats */}
      <div style={{
        padding: '22px 24px', borderRadius: 12,
        background: `
          radial-gradient(ellipse 70% 80% at 0% 0%, color-mix(in srgb, ${moodColor} 10%, transparent), transparent 60%),
          linear-gradient(180deg, rgba(20,24,29,0.55), rgba(14,16,19,0.45))
        `,
        border: `1px solid color-mix(in srgb, ${moodColor} 30%, transparent)`,
        backdropFilter: 'blur(14px) saturate(160%)',
        WebkitBackdropFilter: 'blur(14px) saturate(160%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
          {/* esquerda: narrativa */}
          <div style={{ flex: '1 1 380px', minWidth: 0 }}>
            {/* mood tag */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              <ITrendingUp size={14} stroke={2} style={{ color: moodColor }} />
              <span style={{
                padding: '5px 14px', borderRadius: 99,
                background: `color-mix(in srgb, ${moodColor} 18%, transparent)`,
                color: moodColor,
                fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
              }}>
                {briefing.mood_tag || 'Semana'}
              </span>
            </div>

            {/* summary narrativo */}
            <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-secondary)' }}>
              <MarkdownText text={briefing.summary_md} />
            </div>

            {/* mood headline */}
            {briefing.mood_headline && (
              <div style={{
                marginTop: 14, padding: '10px 12px',
                borderLeft: `2px solid ${moodColor}`,
                background: `color-mix(in srgb, ${moodColor} 6%, transparent)`,
                fontSize: 12.5, color: 'var(--text-primary)', fontStyle: 'italic',
              }}>
                {briefing.mood_headline}
              </div>
            )}
          </div>

          {/* direita: stats cards */}
          {briefing.stats && briefing.stats.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 120 }}>
              {briefing.stats.map((s, i) => (
                <div key={i} style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  minWidth: 110,
                }}>
                  <div style={{
                    fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                    color: moodColor, letterSpacing: '-0.02em', lineHeight: 1,
                  }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, marginTop: 4 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PADRÕES (2 sections colapsáveis) */}
      {briefing.padrao_tecnico && (
        <BriefingSection
          icon={<ITrendingUp size={16} stroke={2} />}
          title={briefing.padrao_tecnico.title || 'Padrão Técnico Dominante'}
          body={briefing.padrao_tecnico.body_md}
          accent="var(--ink-green)"
        />
      )}
      {briefing.padrao_comportamental && (
        <BriefingSection
          icon={<IZap size={16} stroke={2} />}
          title={briefing.padrao_comportamental.title || 'Padrão Comportamental Dominante'}
          body={briefing.padrao_comportamental.body_md}
          accent="var(--amber)"
        />
      )}

      {/* GANHOU × PERDEU */}
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {briefing.onde_ganhou_md && (
          <BriefingSection
            icon={<ITrendingUp size={16} stroke={2} />}
            title="Onde Você Ganhou"
            body={briefing.onde_ganhou_md}
            accent="var(--up)"
          />
        )}
        {briefing.onde_perdeu_md && (
          <BriefingSection
            icon={<ITrendingDown size={16} stroke={2} />}
            title="Onde Você Perdeu"
            body={briefing.onde_perdeu_md}
            accent="var(--down)"
          />
        )}
      </div>

      {/* AJUSTE REAL */}
      {briefing.ajustes && briefing.ajustes.length > 0 && (
        <BriefingSection
          icon={<ITarget size={16} stroke={2} />}
          title="Ajuste Real"
          accent="var(--ink-cyan)"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {briefing.ajustes.map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 12px', borderRadius: 6,
                background: 'color-mix(in srgb, var(--ink-cyan) 6%, transparent)',
                border: '1px solid color-mix(in srgb, var(--ink-cyan) 18%, transparent)',
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  border: '2px solid var(--ink-cyan)',
                  flexShrink: 0, marginTop: 3,
                }} />
                <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)', flex: 1 }}>
                  <MarkdownText text={a} />
                </div>
              </div>
            ))}
          </div>
        </BriefingSection>
      )}

      {/* REGRA DE SOBREVIVÊNCIA */}
      {briefing.regra_sobrevivencia && (
        <div style={{
          padding: '18px 22px', borderRadius: 12,
          background: `linear-gradient(180deg, rgba(245,158,11,0.1), rgba(245,158,11,0.04))`,
          border: '1px solid color-mix(in srgb, var(--amber) 35%, transparent)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <IStar size={16} stroke={2} style={{ color: 'var(--amber)' }} />
            <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--amber)', fontWeight: 700 }}>
              Regra de Sobrevivência
            </div>
          </div>
          <div style={{
            padding: '12px 14px',
            borderLeft: '3px solid var(--amber)',
            background: 'rgba(245,158,11,0.08)',
            fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.5,
          }}>
            "{briefing.regra_sobrevivencia}"
          </div>
        </div>
      )}

      {/* Metadata footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 10, padding: '8px 4px',
        fontSize: 10, color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace',
        flexWrap: 'wrap',
      }}>
        <span>
          gerado em {new Date(briefing.generated_at).toLocaleString('pt-BR')}
          {sourceAccount && <> · conta <strong style={{ color: 'var(--text-muted)' }}>{sourceAccount.name}</strong></>}
          <> · {briefing.model}</>
        </span>
        <button
          onClick={onRegenerate}
          disabled={generating}
          className="btn btn-ghost"
          style={{ padding: '6px 12px', fontSize: 11, opacity: generating ? 0.5 : 1 }}
          title="Gerar novamente (substitui este briefing)"
        >
          {generating ? '⏳ gerando...' : '↻ regenerar'}
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// Collapsible section
// ═══════════════════════════════════════════════════════════
function BriefingSection({ icon, title, body, accent = 'var(--ink-green)', children }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{
      padding: '14px 16px', borderRadius: 10,
      background: `
        radial-gradient(ellipse 80% 60% at 0% 0%, color-mix(in srgb, ${accent} 10%, transparent), transparent 60%),
        linear-gradient(180deg, rgba(20, 24, 29, 0.45), rgba(14, 16, 19, 0.38))
      `,
      border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`,
      backdropFilter: 'blur(12px) saturate(160%)',
      WebkitBackdropFilter: 'blur(12px) saturate(160%)',
      boxShadow: `
        inset 0 1px 0 rgba(255, 255, 255, 0.05),
        0 2px 6px rgba(0, 0, 0, 0.3),
        0 10px 22px rgba(0, 0, 0, 0.4)
      `,
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          appearance: 'none', background: 'transparent', border: 'none', padding: 0,
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', cursor: 'pointer',
          color: 'inherit', font: 'inherit', textAlign: 'left',
          marginBottom: open ? 10 : 0,
          transition: 'margin-bottom .25s ease',
        }}
      >
        <span style={{ color: accent, flexShrink: 0 }}>{icon}</span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
          {title}
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 20, height: 20, borderRadius: 5,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          color: 'var(--text-muted)',
          transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: 'transform .3s cubic-bezier(0.22, 1, 0.36, 1)',
        }}>
          <IChevronDown size={10} stroke={2} />
        </span>
      </button>

      <div style={{
        display: 'grid',
        gridTemplateRows: open ? '1fr' : '0fr',
        transition: 'grid-template-rows .3s cubic-bezier(0.22, 1, 0.36, 1)',
      }}>
        <div style={{
          overflow: 'hidden',
          opacity: open ? 1 : 0,
          transition: 'opacity .2s ease',
        }}>
          {body ? (
            <div style={{ fontSize: 12.5, lineHeight: 1.65, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
              <MarkdownText text={body} multiParagraph />
            </div>
          ) : children}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// Markdown leve (**negrito** + quebras de linha)
// ═══════════════════════════════════════════════════════════
function MarkdownText({ text, multiParagraph = false }) {
  if (!text) return null
  if (multiParagraph) {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim())
    return (
      <>
        {paragraphs.map((p, i) => (
          <p key={i} style={{ margin: i === 0 ? 0 : '10px 0 0' }}>
            {parseLightMarkdown(p).map(part => (
              part.type === 'bold'
                ? <strong key={part.k} style={{ color: 'var(--text-primary)' }}>{part.value}</strong>
                : <span key={part.k}>{part.value}</span>
            ))}
          </p>
        ))}
      </>
    )
  }
  return (
    <>
      {parseLightMarkdown(text).map(part => (
        part.type === 'bold'
          ? <strong key={part.k} style={{ color: 'var(--text-primary)' }}>{part.value}</strong>
          : <span key={part.k}>{part.value}</span>
      ))}
    </>
  )
}

// ═══════════════════════════════════════════════════════════
// Empty state (sem briefing pra essa semana)
// ═══════════════════════════════════════════════════════════
function EmptyState({ weekStart, accountId, accounts, onGenerate, generating }) {
  const isCurrentWeek = weekStart === currentMonday()
  const selectedAccount = accounts?.find(a => a.id === accountId)
  const hasMultipleAccounts = (accounts?.length || 0) > 1
  return (
    <div style={{
      padding: '44px 24px', borderRadius: 12, textAlign: 'center',
      background: 'linear-gradient(180deg, rgba(20,24,29,0.55), rgba(14,16,19,0.45))',
      border: '1px dashed rgba(255,255,255,0.08)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    }}>
      <div style={{
        width: 56, height: 56, margin: '0 auto 16px',
        borderRadius: 14,
        background: 'linear-gradient(135deg, var(--ink-green), var(--ink-cyan))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#07080A',
        boxShadow: '0 0 32px rgba(24,209,138,0.45)',
      }}>
        <IZap size={24} stroke={2.5} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
        Sem briefing para {formatWeekLabel(weekStart)}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto 14px', lineHeight: 1.55 }}>
        {isCurrentWeek
          ? 'O briefing é gerado automaticamente quando você finaliza o último dia de operações da semana (normalmente sexta).'
          : 'Você não tem briefing arquivado para esta semana. Pode gerar agora se quiser.'}
      </div>

      {/* Aviso de 1 briefing/semana quando o aluno tem múltiplas contas */}
      {hasMultipleAccounts && selectedAccount && (
        <div style={{
          maxWidth: 460, margin: '0 auto 18px',
          padding: '10px 14px', borderRadius: 8,
          background: 'rgba(231,198,122,0.08)',
          border: '1px solid rgba(231,198,122,0.22)',
          fontSize: 11, color: 'var(--amber)', lineHeight: 1.55,
        }}>
          ⚠ Você tem múltiplas contas. O briefing é <strong>único por semana</strong> — será gerado
          a partir dos trades da conta <strong style={{ color: 'var(--text-primary)' }}>{selectedAccount.name}</strong>.
          Pra gerar sobre outra conta, troque o seletor <em>antes</em> de clicar.
        </div>
      )}

      <button
        onClick={onGenerate}
        disabled={generating}
        className="btn btn-primary"
        style={{ padding: '10px 20px', opacity: generating ? 0.5 : 1 }}
      >
        {generating ? '⏳ gerando...' : '⚡ gerar briefing agora'}
      </button>
      <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 14, fontStyle: 'italic' }}>
        Geração pode levar 15–40s e precisa de pelo menos 3 trades na semana.
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// Gate de mentorado
// ═══════════════════════════════════════════════════════════
function NotMentoradoGate() {
  return (
    <div className="ink-modal" style={{ maxWidth: 560, margin: '60px auto 0', textAlign: 'center' }}>
      <div style={{
        padding: '40px 28px', borderRadius: 14,
        background: 'linear-gradient(180deg, rgba(20,24,29,0.55), rgba(14,16,19,0.45))',
        border: '1px solid rgba(245,158,11,0.3)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🐺</div>
        <div style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--amber)', fontWeight: 700, marginBottom: 10 }}>
          Exclusivo Matilha Premium
        </div>
        <h1 style={{
          fontSize: 22, fontWeight: 700, color: 'var(--text-primary)',
          margin: '0 0 10px', letterSpacing: '0.02em',
        }}>
          W.O.L.F AI
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: 20 }}>
          O briefing semanal narrativo está disponível apenas para alunos mentorados.
          O W.O.L.F analisa seus trades, padrões técnicos e comportamentais toda semana
          e entrega ajustes objetivos pra você evoluir.
        </p>
        <a href="/app/upgrade" className="btn btn-primary" style={{ padding: '10px 20px', textDecoration: 'none', display: 'inline-flex' }}>
          conhecer a mentoria
        </a>
      </div>
    </div>
  )
}
