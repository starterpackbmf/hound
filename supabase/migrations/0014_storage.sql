-- ============================================================
-- MATILHA — Storage bucket pra prints de trades
-- ============================================================

-- Cria o bucket (ignora se já existe)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trade-prints',
  'trade-prints',
  true,  -- público pra poder linkar direto
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- RLS: user só pode fazer upload na própria pasta (user_id/*)
drop policy if exists "trade_prints_upload_own" on storage.objects;
create policy "trade_prints_upload_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'trade-prints'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "trade_prints_update_own" on storage.objects;
create policy "trade_prints_update_own"
  on storage.objects for update to authenticated
  using (bucket_id = 'trade-prints' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "trade_prints_delete_own" on storage.objects;
create policy "trade_prints_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'trade-prints' and (storage.foldername(name))[1] = auth.uid()::text);

-- Leitura pública (bucket é public, mas boa explicitar)
drop policy if exists "trade_prints_select_all" on storage.objects;
create policy "trade_prints_select_all"
  on storage.objects for select
  using (bucket_id = 'trade-prints');

-- Bucket pra avatares de perfil (já usado pelo Lovable, compatível) --------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_upload_own" on storage.objects;
create policy "avatars_upload_own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_select_all" on storage.objects;
create policy "avatars_select_all"
  on storage.objects for select using (bucket_id = 'avatars');
