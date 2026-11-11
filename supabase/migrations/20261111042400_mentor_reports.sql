-- 멘토 학기 보고서 (docs/architecture.md 11장 35번, 2026-11-11)
-- 멘토가 학기마다 보고서 파일 1건(PDF·한글·워드)을 내고, 관리자는 읽기만 합니다.
-- 학기 중에도 언제든 시작된 학기를 골라 내고, 언제든 다시 올려 바꾸거나 지울 수 있습니다. 강사료와는 연결하지 않습니다.

-- ---------------------------------------------------------------------------
-- 1. 표
-- ---------------------------------------------------------------------------
create table public.mentor_reports (
  id bigint generated always as identity primary key,
  semester_id bigint not null references public.semesters (id),
  mentor_id uuid not null references public.mentor_profiles (id) on delete cascade,
  file_path text not null,
  file_name text not null check (char_length(file_name) between 1 and 200),
  file_size bigint not null check (file_size between 1 and 20 * 1024 * 1024),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (semester_id, mentor_id),
  -- 경로는 "{멘토 id}/{학기 id}/{무작위}.{확장자}"만. 이 행의 멘토·학기와 맞아야 합니다.
  constraint mentor_reports_path check (
    file_path ~ ('^' || mentor_id::text || '/' || semester_id::text || '/[0-9a-f-]{36}\.(pdf|hwp|hwpx|doc|docx)$')
  ),
  constraint mentor_reports_name check (lower(file_name) ~ '\.(pdf|hwp|hwpx|doc|docx)$')
);

create index mentor_reports_mentor_id on public.mentor_reports (mentor_id);

alter table public.mentor_reports enable row level security;

-- 시작된 학기인지 (한국 날짜 기준)
create function public.semester_started(semester_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.semesters s
     where s.id = semester_started.semester_id
       and s.starts_on <= (now() at time zone 'Asia/Seoul')::date
  )
$$;

-- 지금 사용자가 멘토인지
create function public.is_mentor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.mentor_profiles m where m.id = (select auth.uid()))
$$;

create policy "mentor_reports: 멘토 본인·관리자 조회" on public.mentor_reports
  for select to authenticated
  using (mentor_id = (select auth.uid()) or (select public.is_admin()));
create policy "mentor_reports: 멘토 본인 제출" on public.mentor_reports
  for insert to authenticated
  with check (
    mentor_id = (select auth.uid())
    and (select public.is_mentor())
    and public.semester_started(semester_id)
  );
create policy "mentor_reports: 멘토 본인 교체" on public.mentor_reports
  for update to authenticated
  using (mentor_id = (select auth.uid()))
  with check (
    mentor_id = (select auth.uid())
    and (select public.is_mentor())
    and public.semester_started(semester_id)
  );
create policy "mentor_reports: 멘토 본인 지우기" on public.mentor_reports
  for delete to authenticated
  using (mentor_id = (select auth.uid()));

revoke all on public.mentor_reports from anon;
revoke update on public.mentor_reports from authenticated;
grant update (file_path, file_name, file_size) on public.mentor_reports to authenticated;

-- 낸 때는 그대로 두고 바꾼 때만 고칩니다. 멘토·학기는 바꿀 수 없습니다.
create function public.mentor_reports_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.mentor_id is distinct from old.mentor_id or new.semester_id is distinct from old.semester_id then
    raise exception '보고서의 멘토·학기는 바꿀 수 없습니다' using errcode = '42501';
  end if;
  new.submitted_at := old.submitted_at;
  new.updated_at := now();
  return new;
end;
$$;

create trigger mentor_reports_touch
  before update on public.mentor_reports
  for each row execute function public.mentor_reports_touch();

revoke execute on function public.semester_started(bigint) from public, anon;
grant execute on function public.semester_started(bigint) to authenticated;
revoke execute on function public.is_mentor() from public, anon;
grant execute on function public.is_mentor() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Storage 버킷: 비공개, 20MB, PDF·한글·워드만
-- 앱의 목록(lib/files/report-file-types.ts)과 같아야 합니다 (tests/unit/security.test.ts).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mentor-reports', 'mentor-reports', false, 20 * 1024 * 1024,
  array[
    'application/pdf',
    'application/x-hwp',
    'application/hwp+zip',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
);

create policy "mentor-reports: 멘토 본인 올리기" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'mentor-reports'
    and name ~ '^[0-9a-f-]{36}/[1-9][0-9]*/[0-9a-f-]{36}\.(pdf|hwp|hwpx|doc|docx)$'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and (select public.is_mentor())
  );
create policy "mentor-reports: 멘토 본인·관리자 읽기" on storage.objects
  for select to authenticated using (
    bucket_id = 'mentor-reports'
    and (split_part(name, '/', 1) = (select auth.uid())::text or (select public.is_admin()))
  );
create policy "mentor-reports: 멘토 본인 지우기" on storage.objects
  for delete to authenticated using (
    bucket_id = 'mentor-reports'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- 3. 전체 백업에 보고서 목록 추가 (파일은 들어가지 않음)
-- ---------------------------------------------------------------------------
create or replace function public.admin_backup()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb := '{}'::jsonb;
  t text;
  v_rows jsonb;
begin
  if not public.is_admin() then
    raise exception '관리자만 백업할 수 있습니다' using errcode = '42501';
  end if;

  foreach t in array array[
    'app_settings', 'colleges', 'departments', 'job_fields',
    'profiles', 'mentee_profiles', 'mentor_profiles', 'privacy_consents',
    'semesters', 'chat_rooms', 'messages', 'room_reads',
    'courses', 'lessons', 'enrollments',
    'fee_rates', 'fee_records', 'survey_responses', 'mentor_reports'
  ] loop
    execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x', t)
      into v_rows;
    result := result || jsonb_build_object(t, v_rows);
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', u.id,
      'email', u.email,
      'created_at', u.created_at,
      'last_sign_in_at', u.last_sign_in_at
    )), '[]'::jsonb)
    into v_rows
    from auth.users u;
  result := result || jsonb_build_object('auth_users', v_rows);

  return jsonb_build_object(
    'service', 'hoseo-mentor-bridge',
    'exported_at', now(),
    'tables', result
  );
end;
$$;
