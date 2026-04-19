import React, { useEffect, useState } from 'react'
import { PageTitle, Section, ErrorBox, Loading } from './ui'
import {
  getMyFicha, saveFicha, countSectionsFilled,
  TEMPO_MERCADO_OPTIONS, ATIVO_OPTIONS, OPS_DAY_OPTIONS,
  BEHAVIOR_OPTIONS, DIFICULDADES_OPTIONS,
} from '../../lib/ficha'
import { earnByRule } from '../../lib/free'
import { ICheck } from '../../components/icons'

const TOTAL_SECTIONS = 5

export default function MinhaFicha() {
  const [ficha, setFicha] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    getMyFicha()
      .then(f => setFicha(f || {}))
      .catch(e => {
        if (/ficha_acompanhamento|does not exist/i.test(e.message)) {
          setErr('rode supabase/migrations/0007_onboarding.sql no Supabase antes.')
        } else setErr(e.message)
      })
      .finally(() => setLoading(false))
  }, [])

  function field(key) {
    return {
      value: ficha[key] ?? '',
      onChange: e => setFicha(f => ({ ...f, [key]: e.target.value || null })),
    }
  }

  function toggleArr(key, value) {
    setFicha(f => {
      const arr = f[key] || []
      const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]
      return { ...f, [key]: next }
    })
  }

  async function save() {
    setSaving(true); setErr(null); setMsg(null)
    try {
      const secoes = countSectionsFilled(ficha)
      const concluida = secoes === TOTAL_SECTIONS
      const saved = await saveFicha({ ...ficha, secoes_preenchidas: secoes, concluida })
      setFicha(saved)
      if (concluida && !ficha.concluida) {
        try {
          await earnByRule('ficha_complete', 'ficha 100% preenchida')
          setMsg('🎉 ficha completa! +20 SC')
        } catch { /* ignore se já ganhou */ }
      } else {
        setMsg(`✓ salvo (${secoes}/${TOTAL_SECTIONS} seções)`)
      }
      setTimeout(() => setMsg(null), 3000)
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  if (loading) return <Loading />

  const secoes = countSectionsFilled(ficha)
  const progress = Math.round((secoes / TOTAL_SECTIONS) * 100)

  return (
    <div style={{ maxWidth: 720 }}>
      <PageTitle eyebrow="CONTA" sub="preencha pra que os monitores te acompanhem melhor. +20 SC ao completar.">
        minha ficha
      </PageTitle>

      {err && <div style={{ marginBottom: 16 }}><ErrorBox>{err}</ErrorBox></div>}

      {/* Progresso */}
      <div className="card" style={{ padding: 16, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
            Progresso da ficha
          </div>
          <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--amber)', transition: 'width 300ms' }} />
          </div>
        </div>
        <div style={{
          fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 500,
          color: progress === 100 ? 'var(--up)' : 'var(--amber)',
        }}>
          {secoes}/{TOTAL_SECTIONS}
        </div>
      </div>

      {/* 1. Dados Pessoais */}
      <Section title="1. dados pessoais — informações básicas de contato">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <Field label="nome completo *" input={<input className="input" placeholder="Fulano de Tal" {...field('nome_completo')} />} />
          <Field label="como prefere ser chamado *" input={<input className="input" placeholder="Fulano" {...field('prefere_ser_chamado')} />} />
          <Field label="whatsapp" input={<input className="input" placeholder="(11) 99999-9999" {...field('whatsapp')} />} />
          <Field label="cidade" input={<input className="input" placeholder="São Paulo" {...field('cidade')} />} />
          <Field label="estado" input={<input className="input" placeholder="SP" {...field('estado')} />} />
          <Field label="idade" input={<input className="input" type="number" placeholder="30" {...field('idade')} />} />
        </div>
      </Section>

      {/* 2. Experiência */}
      <Section title="2. experiência no mercado — sua trajetória e rotina operacional">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          <RadioGroup
            label="tempo de mercado"
            value={ficha.tempo_mercado}
            onChange={v => setFicha(f => ({ ...f, tempo_mercado: v }))}
            options={TEMPO_MERCADO_OPTIONS}
          />
          <RadioGroup
            label="ativo principal"
            value={ficha.ativo_principal}
            onChange={v => setFicha(f => ({ ...f, ativo_principal: v }))}
            options={ATIVO_OPTIONS}
          />
          <RadioGroup
            label="média de operações por dia"
            value={ficha.media_ops_dia}
            onChange={v => setFicha(f => ({ ...f, media_ops_dia: v }))}
            options={OPS_DAY_OPTIONS}
          />
          <RadioGroup
            label="já participou de mentoria ou sala antes?"
            value={ficha.mentoria_previa === true ? 'sim' : ficha.mentoria_previa === false ? 'nao' : null}
            onChange={v => setFicha(f => ({ ...f, mentoria_previa: v === 'sim' }))}
            options={[{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }]}
          />
        </div>
      </Section>

      {/* 3. Raio-X Comportamental */}
      <Section title={`3. raio-x comportamental — "não é sobre resultado. é sobre caráter operacional."`}>
        <SubSection title="🎯 disciplina técnica">
          <BehaviorQuestion
            q="Quando o preço bate no seu stop técnico, você aceita o loss sem alterar a ordem?"
            value={ficha.aceita_stop_tecnico}
            onChange={v => setFicha(f => ({ ...f, aceita_stop_tecnico: v }))}
          />
          <BehaviorQuestion
            q="Você já entrou na operação antes da confirmação completa do seu gatilho?"
            value={ficha.entra_antes_gatilho}
            onChange={v => setFicha(f => ({ ...f, entra_antes_gatilho: v }))}
          />
          <BehaviorQuestion
            q="Você já entrou em uma operação influenciado pelo comentário de outra pessoa?"
            value={ficha.entra_por_comentario}
            onChange={v => setFicha(f => ({ ...f, entra_por_comentario: v }))}
          />
        </SubSection>

        <SubSection title="💭 controle emocional">
          <BehaviorQuestion
            q="Você já afastou o stop para evitar realizar o prejuízo?"
            value={ficha.afasta_stop}
            onChange={v => setFicha(f => ({ ...f, afasta_stop: v }))}
          />
          <BehaviorQuestion
            q="Após um loss, você já aumentou o tamanho da posição para tentar recuperar mais rápido?"
            value={ficha.aumenta_posicao_apos_loss}
            onChange={v => setFicha(f => ({ ...f, aumenta_posicao_apos_loss: v }))}
          />
        </SubSection>

        <SubSection title="📈 evolução">
          <BehaviorQuestion
            q="Quando comete um erro operacional, você registra e analisa no seu diário?"
            value={ficha.registra_erros_no_diario}
            onChange={v => setFicha(f => ({ ...f, registra_erros_no_diario: v }))}
          />
        </SubSection>
      </Section>

      {/* 4. Dificuldades */}
      <Section title="4. dificuldades percebidas — selecione as que mais te afetam">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6 }}>
          {DIFICULDADES_OPTIONS.map(d => {
            const selected = ficha.dificuldades?.includes(d)
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleArr('dificuldades', d)}
                className={selected ? 'btn btn-outline-amber' : 'btn'}
                style={{ justifyContent: 'flex-start', fontSize: 12 }}
              >
                {selected && <ICheck size={12} stroke={2.2} />}
                {d}
              </button>
            )
          })}
        </div>
      </Section>

      {/* 5. Objetivos */}
      <Section title="5. objetivos — o que você busca alcançar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field
            label="qual seu objetivo com o trading?"
            input={<textarea className="input" rows={3} style={{ resize: 'vertical' }} placeholder="substituir meu salário... viver de trade... renda extra consistente..." {...field('objetivo')} />}
          />
          <Field
            label="algo que o monitor precisa saber sobre você?"
            input={<textarea className="input" rows={3} style={{ resize: 'vertical' }} placeholder="tempo disponível, rotina, contexto pessoal..." {...field('mensagem_monitor')} />}
          />
        </div>
      </Section>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
        <button onClick={save} disabled={saving} className="btn btn-primary">
          {saving ? 'salvando...' : 'salvar ficha'}
        </button>
        {msg && <span style={{ fontSize: 12, color: progress === 100 ? 'var(--up)' : 'var(--amber)' }}>{msg}</span>}
      </div>
    </div>
  )
}

function Field({ label, input }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="label-muted">{label}</span>
      {input}
    </label>
  )
}

function RadioGroup({ label, value, onChange, options }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="label-muted">{label}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(opt => {
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={selected ? 'pill pill-active' : 'pill'}
              style={{ cursor: 'pointer' }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SubSection({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </div>
  )
}

function BehaviorQuestion({ q, value, onChange }) {
  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>{q}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {BEHAVIOR_OPTIONS.map(opt => {
          const selected = value === opt.value
          const toneClass = selected ? (opt.tone === 'up' ? 'pill-up' : opt.tone === 'down' ? 'pill-down' : 'pill-amber') : ''
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`pill ${toneClass}`}
              style={{ cursor: 'pointer' }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
