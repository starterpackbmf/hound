# Trampo da madrugada (20/abr)

10 commits locais desde "mete bronca" até agora (sem push).

## Features / correções

### 1. Zoom embed consertado ([c812b50](c812b50))
- Problema: React 19 conflitava com `@zoom/meetingsdk/embedded` (erro `ReactCurrentOwner`)
- Solução: iframe isolado em `public/zoom-room.html` com React 18 próprio carregado via CDN
- `ZoomLive.jsx` virou um wrapper simples de iframe — sem conflito de versão
- **Pro lado:** volta a funcionar lado-a-lado com o chat custom

### 2. Jornada com dados reais ([aaeaf4c](aaeaf4c))
- Puxa `resultado_brl` de todos os trades
- Progress bar entre rank atual e próximo (gap real, não % do total)
- 7 conquistas desbloqueáveis (1/100/500 trades, R$ 1k/10k, Alpha)
- Stats inline: total R$, # trades

### 3. Plano de Execução com aderência ([61290bd](61290bd))
- Calcula score semanal: (setups_ok + followed_plan) / 2
- Card colorido por score (verde ≥80, amarelo ≥60, vermelho)
- Breakdown: trades, seguiu plano, violações, setups ok

### 4. Sessões 1:1 completa ([290411d](290411d))
- 3 abas: agendar / minhas reservas / histórico
- Usa `monitor_slots` existente (sem novas migrations)
- Lista slots abertos agrupados por dia, click pra solicitar
- Reservas com status visual (solicitado/confirmado/cancelada)

### 5. Attendance viewer ([fddbbe5](fddbbe5))
- Nova rota `/mentor/aulas/relatorio/:id`
- Mostra quem participou (chat_attendance) + timeline completo das mensagens
- Stats: # participantes, # que entraram no chat, # mensagens

### 6. Sidebar monitor ([636bf2e](636bf2e))
- Novo atalho "agendar aula" direto na sidebar

### 7. Início com Zoom ao vivo ([62b82bd](62b82bd))
- Banner pink piscante quando tem sala Zoom ativa (janela -10min até fim)
- Card cyan mostrando próxima aula se não tem live
- Coexiste com o sistema de events legacy

### 8. Chat reactions ([5b9054a](5b9054a))
- 6 emojis rápidos: 🔥🐺👏❤️💯😂
- Clicar na pill adiciona/remove sua reação
- Destaque cyan quando é sua

### 9. Estudo com progresso ([08b588c](08b588c))
- Card de cada curso mostra X/Y aulas + %
- Barra de progresso
- CTA dinâmico: começar/continuar/revisar

### Build fixes
- Removi duplicate `const progress` em Jornada (`6f1a9c4`)
- Troquei `currentRankFromResult` (não existe) por `computeRank` (`6f1a9c4`)
- **Production build passando** (`npm run build` verificado)

## Não foi pra produção

Tudo commit local. Nenhum push foi feito. Nenhuma migration rodada no Supabase remoto.

## Pra você acordar e fazer

### Rodar migrations novas (se ainda não rodou)
- `supabase/migrations/0020_zoom_live_sessions.sql`
- `supabase/migrations/0021_live_chat.sql`

### Testar
1. `/app/aulas` → agendar aula → entrar → chat embedded
2. `/app/jornada` → ver progresso alpha (você já tá lá)
3. `/app/plano-execucao` → ver aderência semanal (requer trades na semana)
4. `/app/sessoes` → 3 abas
5. `/app/estudo` → barras de progresso nos cards

### Push pra git (quando estiver feliz)
```
git push origin main
```

## Pendências reconhecidas

- **Migrar usuários do Lovable** — combinamos deixar pra depois
- **Cursos sem conteúdo** — falta popular aulas do Panda Video
- **Monitoria.jsx vs Sessoes.jsx** — tem duplicata; decidir se uniu ou diferencia
- **Deploy Vercel** — adicionar `VITE_ZOOM_SDK_KEY` e `ZOOM_SDK_SECRET` nos env vars antes do próximo deploy
