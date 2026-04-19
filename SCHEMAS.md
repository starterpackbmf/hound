# Schemas do Lovable vs nosso Supabase

Referência rápida. Útil pra quando migrar dados, diagnosticar divergências.

---

## Tabelas disponíveis no Lovable (37)

```
community_comments        community_likes        community_posts
community_stickers        courses                courses_carousels
day_summaries             difficulty_trees       dream_goals
execution_plans           lesson_comments        lesson_likes
lessons                   mentor_feedback        mentorship_sessions
monitor_availability      profiles               sc_achievements
sc_challenge_completions  sc_transactions        sc_user_achievements
sc_weekly_challenges      schedule_slots         store_item_images
store_item_variants       store_items            store_redemptions
student_intake            trade_feedback         trader_diagnostics
trades                    trading_accounts       user_efficiency_config
user_roles                user_starter_coins     user_trade_config
weekly_ai_reports
```

---

## Mapa de equivalência

| Lovable | Nosso Supabase | Status |
|---|---|---|
| `profiles` | `profiles` | ✅ mesma função, colunas compatíveis (falta avatar_url real) |
| `user_roles` | `profiles.roles[]` | ⚠️ Lovable tem tabela separada. Nosso tem array. Traduzir |
| `trading_accounts` | `trade_accounts` | ✅ mesma função, nomes levemente diferentes |
| `trades` | `trades` | ⚠️ Lovable tem MUITO mais campos (ver abaixo) |
| `day_summaries` | `day_summaries` | ✅ batem |
| `student_intake` | `ficha_acompanhamento` | ✅ batem, nomes diferentes |
| `execution_plans` | `execution_plans` | ⚠️ Lovable usa pontos (não R$), tem campos extras |
| `schedule_slots` | `monitor_slots` | ✅ batem |
| `monitor_availability` | — | ❌ **Lovable tem recorrência por dia da semana, não criamos ainda** |
| `mentorship_sessions` | — | ❌ **Resumo de sessão concluída, falta no nosso** |
| `mentor_feedback` | — | ❌ **Feedback diário do monitor pro aluno, falta** |
| `trade_feedback` | — | ❌ **Feedback do monitor por trade, falta** |
| `trader_diagnostics` | `diagnostics` | ⚠️ Schema diferente — Lovable tem chips+text, problem/cause/behavior/solution+mentor_insight |
| `difficulty_trees` | `difficulties` | ⚠️ Lovable tem `causes` como jsonb, não self-referencing |
| `dream_goals` | `goals` | ⚠️ Lovable tem `steps`/`horizon`/reflection_30d/initial_emotion, mais rico |
| `user_starter_coins` | `user_coins` | ✅ batem |
| `sc_transactions` | `coin_transactions` | ✅ batem (nomes diferentes) |
| `sc_achievements` | — | ❌ **Catálogo de conquistas, falta no nosso** |
| `sc_user_achievements` | — | ❌ **Conquistas desbloqueadas por user, falta** |
| `sc_weekly_challenges` | — | ❌ **Desafios semanais definidos pelo monitor, falta** |
| `sc_challenge_completions` | — | ❌ **Conclusão de desafios por user, falta** |
| `weekly_ai_reports` | — | ❌ **W.O.L.F AI report completo, falta (hoje só stub)** |
| `courses_carousels` | `courses` | ⚠️ nomeado diferente — carrossel = curso principal |
| `courses` | `modules` | ⚠️ nomeado diferente — curso Lovable = módulo nosso |
| `lessons` | — (via Panda API) | ❌ **Lovable armazena aula em DB; nosso pega do Panda. Deles tem mais metadata (thumbnail, duration, is_free, release_at, tags)** |
| `lesson_comments` | `community_comments` | ✅ batem (via lesson_panda_id) |
| `lesson_likes` | — | ❌ **Likes em aulas, falta no nosso** |
| `community_posts` | `community_posts` | ✅ |
| `community_comments` | `community_comments` | ✅ |
| `community_likes` | `community_likes` | ✅ |
| `community_stickers` | — | ❌ **Figurinhas custom pra posts, falta** |
| `store_items` | `packstore_items` | ✅ (nomes diferentes) |
| `store_item_variants` | — | ❌ **Variantes de produto (cor, tamanho), falta** |
| `store_redemptions` | `redemption_requests` | ⚠️ Lovable tem shipping_* completo (CPF, endereço, etc), nosso só jsonb |
| `user_trade_config` | — | ❌ **stops máx em pontos por ativo, falta** |
| `user_efficiency_config` | — | ⚠️ Vazia no Lovable no momento |

---

## Campos faltando em `trades` (PRIORITÁRIO)

Meu schema atual (0008): 23 campos.
Lovable: 24 campos — parecidos mas **vários nomes diferentes** e alguns faltando:

| Lovable | Nosso | Nota |
|---|---|---|
| `asset` | `ativo` | ✅ mesmo |
| `operational` | `setup` | ⚠️ nome diferente |
| `direction` | `direction` | ✅ |
| `initial_contracts` | `contratos_iniciais` | ✅ |
| `planned_men` | `men_pts` | ⚠️ Lovable separa **planejado** vs real |
| `planned_mep` | `mep_pts` | ⚠️ idem |
| `reading` | `leitura_tecnica` | ✅ |
| `feelings` | `emotions` | ✅ (array) |
| `selected_rules` | — | ❌ **Array das regras do plano que foram seguidas** |
| `selected_filters` | — | ❌ **Array dos filtros do setup aplicados** |
| `entry_quality` | — | ❌ **Nota de 1-5 da qualidade da entrada** |
| `partials` | `partials` | ✅ jsonb |
| `final_points` | `encerramento_pts` | ✅ |
| `total_points` | (calculado) | ⚠️ Lovable armazena, nosso calcula |
| `financial_result` | `resultado_brl` | ✅ |
| `followed_plan` | `followed_plan` | ✅ |
| `screenshot_url` | `print_url` | ✅ |
| `trade_date` | `date` | ✅ |
| `escora_tag` | — | ❌ **Tag de "escora" / gerenciamento especial** |
| `entry_time` | `horario_entrada` | ✅ |
| `exit_time` | `horario_saida` | ✅ |
| `account_id` | `account_id` | ✅ |

**Ação:** Migration 0011 adiciona `planned_men`, `planned_mep` (separados dos reais), `selected_rules`, `selected_filters`, `entry_quality`, `escora_tag`.

---

## Novas features críticas a implementar

### 1. Monitor Availability (recorrência semanal)
Lovable permite monitor definir "toda segunda 17-18h fico disponível" em vez de
criar slots 1-a-1. Depois o sistema gera slots automaticamente. **Valor alto.**

### 2. Mentorship Sessions (registro pós-sessão)
Quando a sessão de monitoria rola, o monitor registra:
- Resumo
- Ajustes técnicos
- Observações emocionais
- Estratégias sugeridas
- Próximo foco

### 3. Trade Feedback
Monitor comenta em trades específicos do aluno: "status" (AJUSTAR / OK / DESTAQUE)
+ feedback textual.

### 4. Mentor Feedback (diário)
Monitor registra feedback do dia todo com tags (AJUSTAR/ELOGIAR/ALERTAR).

### 5. SC Achievements (catálogo)
Conquistas com key único, threshold, ícone. Conquista desbloqueia → dispara
recompensa SC.

### 6. Weekly AI Reports (W.O.L.F AI de verdade)
Hoje é stub. Tabela `weekly_ai_reports` guarda input_snapshot + output (summary,
tips, actions) por semana.

### 7. Lessons em tabela própria
Hoje puxo do Panda on-the-fly. Lovable armazena `thumbnail_url`, `duration`,
`tags`, `release_at` (pra drip-feed). **Vantagem:** caching + metadata rica.

### 8. User Trade Config (stops em pontos)
Lovable armazena `stop_max_win_points` e `stop_max_wdo_points` separado do
plano — é configuração default do aluno. Diferente do plano operacional.

---

## Próximos passos recomendados

1. **Migration 0011** alinha `trades` com os campos do Lovable
2. **Sync script** `scripts/sync-from-lovable.js` que para cada profile
   com `lovable_student_id` preenchido, puxa:
   - `trading_accounts` → `trade_accounts`
   - `trades` → `trades` (com mapeamento de colunas)
   - `day_summaries` → `day_summaries`
   - `student_intake` → `ficha_acompanhamento`
   - `execution_plans` → `execution_plans`
3. Implementar features faltantes (#1–#8 acima) em migrations sucessivas.
