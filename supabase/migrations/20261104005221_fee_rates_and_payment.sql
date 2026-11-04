-- 강사료 단가 자동 계산과 지급 여부 (docs/architecture.md 6.6, 11장 29~31번)

-- ---------------------------------------------------------------------------
-- 1. 학기별 단가와 상한 (29·30번). 멘토에게 보이지 않게 학기 표와 따로 둡니다 (11장 9번).
-- ---------------------------------------------------------------------------
create table public.fee_rates (
  semester_id bigint primary key references public.semesters (id) on delete cascade,
  per_answer int not null check (per_answer between 0 and 10000000),
  cap int check (cap between 0 and 100000000),
  updated_at timestamptz not null default now()
);

alter table public.fee_rates enable row level security;
revoke all on public.fee_rates from anon;

create policy "fee_rates: 관리자 조회" on public.fee_rates
  for select to authenticated using ((select public.is_admin()));
create policy "fee_rates: 관리자 추가" on public.fee_rates
  for insert to authenticated with check ((select public.is_admin()));
create policy "fee_rates: 관리자 수정" on public.fee_rates
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "fee_rates: 관리자 삭제" on public.fee_rates
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- 2. 책정 기록에 단가 스냅숏과 지급 여부 (29·31번)
-- ---------------------------------------------------------------------------
alter table public.fee_records
  add column unit_price int check (unit_price between 0 and 10000000),
  add column paid_at timestamptz,
  add column paid_by uuid references public.profiles (id) on delete set null;

create index fee_records_paid_by_idx on public.fee_records (paid_by);

-- 책정자·책정 시각은 책정 내용(금액·건수·메모·단가)이 바뀔 때만 새로 씁니다. 지급 표시만 바꿀 때는 그대로 둡니다.
-- 지급 시각과 처리한 관리자는 트리거가 채웁니다. 지급 완료된 기록은 지급 취소 전까지 책정 내용을 못 고칩니다.
create or replace function public.before_fee_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_content_changed boolean;
begin
  if tg_op = 'INSERT' then
    v_content_changed := true;
  else
    v_content_changed := new.amount <> old.amount
      or new.question_count <> old.question_count
      or new.answer_count <> old.answer_count
      or new.memo is distinct from old.memo
      or new.unit_price is distinct from old.unit_price
      or new.semester_id <> old.semester_id
      or new.mentor_id <> old.mentor_id;
  end if;

  if tg_op = 'UPDATE' and old.paid_at is not null and new.paid_at is not null and v_content_changed then
    raise exception '지급 완료된 강사료는 고칠 수 없습니다. 지급 취소 뒤 고쳐 주세요' using errcode = '42501';
  end if;

  if v_content_changed then
    new.decided_by := (select auth.uid());
    new.decided_at := now();
  else
    new.decided_by := old.decided_by;
    new.decided_at := old.decided_at;
  end if;

  if new.paid_at is null then
    new.paid_by := null;
  elsif tg_op = 'INSERT' then
    new.paid_at := now();
    new.paid_by := (select auth.uid());
  elsif old.paid_at is null then
    new.paid_at := now();
    new.paid_by := (select auth.uid());
  else
    new.paid_at := old.paid_at;
    new.paid_by := old.paid_by;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. 전체 백업에 단가 표 추가
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
    'fee_rates', 'fee_records', 'survey_responses'
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
