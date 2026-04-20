-- Bucket pra capas de curso (público — qualquer um vê)
insert into storage.buckets (id, name, public)
values ('course-covers', 'course-covers', true)
on conflict (id) do nothing;

-- Policies: qualquer autenticado com role admin/monitor/imortal pode subir; todos podem ver
drop policy if exists "course_covers_read" on storage.objects;
create policy "course_covers_read"
  on storage.objects for select to public
  using (bucket_id = 'course-covers');

drop policy if exists "course_covers_write_monitor" on storage.objects;
create policy "course_covers_write_monitor"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'course-covers' AND
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['admin','monitor','imortal']::public.user_role[])
  );

drop policy if exists "course_covers_update_monitor" on storage.objects;
create policy "course_covers_update_monitor"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'course-covers' AND
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['admin','monitor','imortal']::public.user_role[])
  );

drop policy if exists "course_covers_delete_monitor" on storage.objects;
create policy "course_covers_delete_monitor"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'course-covers' AND
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['admin','monitor','imortal']::public.user_role[])
  );
