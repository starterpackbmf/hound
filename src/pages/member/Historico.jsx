import React from 'react'
import { PageTitle, Placeholder } from './ui'

export default function Historico() {
  return (
    <div style={{ maxWidth: 1040 }}>
      <PageTitle eyebrow="OPERACIONAL" sub="calendário mensal dos seus trades — visão rápida do mês.">histórico</PageTitle>
      <Placeholder
        title="em breve"
        subtitle="calendário mensal com trades por dia. dados virão do /diario local (quando migrarmos) ou do Lovable via lovable_student_id."
      />
    </div>
  )
}
