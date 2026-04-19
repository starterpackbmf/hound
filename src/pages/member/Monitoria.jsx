import React from 'react'
import { PageTitle, Section, Placeholder } from './ui'

export default function Monitoria() {
  return (
    <div style={{ maxWidth: 1040 }}>
      <PageTitle eyebrow="A MATILHA" sub="sessões individuais com monitores da matilha.">monitoria</PageTitle>

      <Section title="agendar sessão">
        <Placeholder
          title="em breve"
          subtitle="marcação de horário com monitores disponíveis. sala criada automaticamente no app quando o horário for aceito."
        />
      </Section>

      <Section title="suas sessões">
        <Placeholder
          title="em breve"
          subtitle="histórico + sessões agendadas, com gravação salva no diário."
        />
      </Section>
    </div>
  )
}
