-- Seed das roles de admin/suporte
-- Mateus (admin): 31244f3c-df03-48ad-9251-f923b5a50c02 (starterpack.bmf@gmail.com)
--   → já foi setado via scripts/ensure-admin.mjs, este UPDATE é idempotente.
-- Carla (CS): 1c5b7fb0-3585-49de-a464-05e6a1e5456d
--   → recebe ['admin','suporte']: admin destrava todas as RLS existentes
--     (aulas, cursos, chat, monitoria), suporte serve de marcador semântico
--     p/ telas/filtros de CS (ex: dashboard de feedbacks com humor baixo).
--   → se o id abaixo não existir (ambiente diferente), o UPDATE é no-op.
--     Quando confirmar o user real da Carla, rode outro UPDATE manualmente.

update public.profiles
   set roles = array['admin']::public.user_role[]
 where id = '31244f3c-df03-48ad-9251-f923b5a50c02';

update public.profiles
   set roles = array['admin','suporte']::public.user_role[]
 where id = '1c5b7fb0-3585-49de-a464-05e6a1e5456d';
