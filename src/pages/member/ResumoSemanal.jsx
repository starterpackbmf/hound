import React from 'react'
import { PageTitle, Placeholder } from './ui'

export default function ResumoSemanal() {
  return (
    <div style={{ maxWidth: 1040 }}>
      <PageTitle eyebrow="APRENDIZADO" sub="seu mentor de trading com IA — resumos semanais da performance.">w.o.l.f ai</PageTitle>
      <Placeholder
        title="resumo semanal chega sextas às 17h"
        subtitle="registre ao menos 1 trade na semana. o w.o.l.f lê seu diário, identifica padrões e gera uma análise. (em construção — aguardando pipeline RAG do oráculo)"
      />
    </div>
  )
}
