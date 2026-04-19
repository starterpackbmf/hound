# GAPS — Lovable vs o que já implementei

Auditoria profunda após segunda volta no Lovable. Tudo que tá lá mas ainda
não está no nosso app (em ordem de impacto).

---

## 🔴 Gaps críticos (resolvidos nesta sessão)

### 1. Plano de Execução
**Lovable:** `/plano-execucao` — aluno vê plano operacional definido pelo mentor
(stops diários/mensais, tamanhos, regras específicas).
**Ação:** Schema `execution_plans`. Monitor define via novo endpoint, aluno vê
em `/app/plano-execucao`.

### 2. Detalhe do aluno na área do monitor
**Lovable:** clica no aluno → abre perfil com métricas, ficha, histórico, trades,
plano definido pelo mentor, botões WhatsApp/Relatório.
**Ação:** `/mentor/alunos/:id` com ficha + summary + ações.

### 3. WhatsApp direto do monitor
**Lovable:** botão "WhatsApp" em cada aluno crítico abre conversa pronta.
**Ação:** Link `wa.me/NUMERO?text=MSG` com mensagem pré-formatada baseada no
contexto (ex: "Oi Fulano, vi no painel que tu estourou o MEN 3x esta semana...").

### 4. Histórico de trades com calendário
**Lovable:** `/historico` — calendário mensal mostrando W/L/resultado por dia,
filtro WIN/WDO.
**Ação:** refazer `/app/historico` com calendar view real (usa trades do 0008).

### 5. Agenda de monitoria — fluxo completo
**Lovable:** aluno em `/agendar` vê slots disponíveis, clica e solicita.
Monitor aprova/bloqueia. Slot vira reservado → quando aceito, cria sessão.
**Ação:** Schemas `monitor_slots` + `monitor_sessions`. UI /app/monitoria
(aluno — solicita) + /mentor/agenda (monitor — define slots + aprova).

---

## 🟡 Gaps médios (pra próxima sessão)

### 6. Conteúdos CMS completo
**Lovable:** `/mentor/conteudos` com drag-and-drop pra reordenar carrosséis,
cursos, aulas. Editor completo (criar aula, apontar pra Panda, anexar PDF/mapa).
**Ação:** admin UI só pra role=admin pra criar/editar. Hoje é só SQL direto.

### 7. Comentários em aulas
**Lovable:** aula tem seção "Comentários" (discussão).
**Status:** schema `community_comments` já suporta lesson_panda_id.
**Ação:** só precisa do UI no Course.jsx.

### 8. Resgates / Pack Store flow admin
**Lovable:** `/mentor/resgates` — monitor aprova entregas físicas.
**Ação:** schema `redemption_requests` + UI.

### 9. Solicitações de acesso
**Lovable:** `/mentor/solicitacoes` — aprovar/recusar novos alunos.
**Ação:** schema `access_requests` + hook no signup pra bloquear status.

### 10. Stops "melhor de 3" e "melhor de 5"
**Lovable:** regras anti-revenge trading no gerenciamento (MEN estourado).
**Ação:** feature flag + alert no diário se detectar violação.

### 11. "Violações de MEN" tracker
**Lovable:** conta quantas vezes o aluno estourou o MEN no mês.
**Ação:** view/materialized view em Supabase cruzando trades.

### 12. Streak de dias no plano
**Lovable:** conta dias consecutivos seguindo o plano (pra SC +20).
**Ação:** lógica de cálculo + badge.

---

## 🟢 Gaps menores (backlog)

- Upload real de print (hoje só URL)
- Notificações push/email em eventos importantes
- Settings (editar perfil, senha, whatsapp)
- Dark mode toggle (hoje é fixo dark)
- Export de diário (PDF/CSV)
- Integração Panda Video com autenticação signed (pra evitar compartilhar URL)
- Diagnóstico — "tooltip" mostrando o que cada tag significa
- Matilha: "próximo evento" calculado dinamicamente (hoje é só lista de eventos)
- Dashboard: "continuar de onde parou" real (hoje é link genérico)

---

## ⚪ Não vou implementar (fora de escopo / discussão)

- Stop Claude button (feature específica do Lovable)
- Configuração de Open Class via YouTube embeds (já tem via events table)
- Integração WhatsApp Business API real (hoje wa.me é suficiente)
- Mobile app nativo
