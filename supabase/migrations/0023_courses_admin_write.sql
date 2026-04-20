-- Permite admin/monitor/imortal escrever em courses, modules, lesson_meta, materials.

-- courses
drop policy if exists "courses_write_monitor" on public.courses;
create policy "courses_write_monitor"
  on public.courses for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['admin','monitor','imortal']::public.user_role[])
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['admin','monitor','imortal']::public.user_role[])
  );

-- Também garante que monitor/admin consegue SELECIONAR cursos mesmo sem o published AND allowed_roles
drop policy if exists "courses_select_monitor" on public.courses;
create policy "courses_select_monitor"
  on public.courses for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['admin','monitor','imortal']::public.user_role[])
  );

-- modules
drop policy if exists "modules_write_monitor" on public.modules;
create policy "modules_write_monitor"
  on public.modules for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['admin','monitor','imortal']::public.user_role[])
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['admin','monitor','imortal']::public.user_role[])
  );

drop policy if exists "modules_select_monitor" on public.modules;
create policy "modules_select_monitor"
  on public.modules for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['admin','monitor','imortal']::public.user_role[])
  );

-- lesson_meta
drop policy if exists "lesson_meta_write_monitor" on public.lesson_meta;
create policy "lesson_meta_write_monitor"
  on public.lesson_meta for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['admin','monitor','imortal']::public.user_role[])
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['admin','monitor','imortal']::public.user_role[])
  );

-- materials
drop policy if exists "materials_write_monitor" on public.materials;
create policy "materials_write_monitor"
  on public.materials for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['admin','monitor','imortal']::public.user_role[])
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.roles && array['admin','monitor','imortal']::public.user_role[])
  );
