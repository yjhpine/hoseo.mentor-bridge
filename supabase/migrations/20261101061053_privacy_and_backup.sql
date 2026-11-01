-- 개인정보 수집·이용 동의, 관리자 백업, 보관 기간 관리 (docs/architecture.md 6.7, 11장 19~21번)

-- 1. 동의 기록. 가입 트리거만 넣고, 사용자는 자기 기록만 읽습니다. 회원을 지우면 함께 지워집니다.
create table public.privacy_consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  policy_version text not null check (policy_version ~ '^\d{4}-\d{2}-\d{2}$'),
  agreed_at timestamptz not null default now()
);
create index privacy_consents_user_id_idx on public.privacy_consents (user_id);

alter table public.privacy_consents enable row level security;
revoke all on public.privacy_consents from anon, authenticated;
grant select on public.privacy_consents to authenticated;

create policy "privacy_consents: 본인·관리자 조회" on public.privacy_consents
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- 2. 가입 트리거: 멘티·멘토는 동의한 처리방침 판(시행일)이 있어야 가입됩니다.
--    API를 직접 불러 동의 없이 가입하는 것도 여기서 막습니다. 관리자 계정은 운영진이라 동의를 받지 않습니다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_group text := meta ->> 'login_group';
  v_name text := normalize(btrim(meta ->> 'name'), NFC);
  v_tag text := nullif(btrim(meta ->> 'name_tag'), '');
  v_consent text := meta ->> 'privacy_policy_version';
  v_login_name text;
  v_role public.user_role;
  v_department_id bigint;
  v_job_field_id bigint;
begin
  if v_group is null or v_name is null then
    raise exception '가입 정보에 소속과 이름이 없습니다' using errcode = '22023';
  end if;

  v_login_name := public.normalize_login_name(v_name || coalesce(v_tag, ''));

  -- API를 직접 불러 임의의 이메일로 가입하는 것을 막습니다.
  if new.email is distinct from public.login_email(v_group, v_login_name) then
    raise exception '이메일이 소속·이름과 맞지 않습니다' using errcode = '22023';
  end if;

  if v_group = 'admin' then
    -- 10분 안에 secret 키로 넣은 허가가 있어야 합니다. 가입 화면으로는 관리자가 될 수 없습니다.
    delete from public.admin_invites
    where email = new.email and created_at > now() - interval '10 minutes';
    if not found then
      raise exception '관리자 계정은 가입으로 만들 수 없습니다' using errcode = '42501';
    end if;
    v_role := 'admin';
  elsif v_group = 'mentor' then
    v_role := 'mentor';
    if (meta ->> 'job_field_id') !~ '^[1-9][0-9]*$' then
      raise exception '직무 분야를 골라야 합니다' using errcode = '22023';
    end if;
    v_job_field_id := (meta ->> 'job_field_id')::bigint;
    if not exists (select 1 from public.job_fields where id = v_job_field_id) then
      raise exception '없는 직무 분야입니다' using errcode = '22023';
    end if;
  elsif v_group ~ '^dept:[1-9][0-9]*$' then
    v_role := 'mentee';
    v_department_id := substr(v_group, 6)::bigint;
    if not exists (
      select 1
      from public.departments d
      join public.colleges c on c.id = d.college_id
      where d.id = v_department_id and d.is_active and c.is_active
    ) then
      raise exception '가입할 수 없는 학과입니다' using errcode = '22023';
    end if;
  else
    raise exception '알 수 없는 소속입니다' using errcode = '22023';
  end if;

  if v_role <> 'admin' and (v_consent is null or v_consent !~ '^\d{4}-\d{2}-\d{2}$') then
    raise exception '개인정보 수집·이용에 동의해야 가입할 수 있습니다' using errcode = '22023';
  end if;

  insert into public.profiles (id, role, name, name_tag, login_group, login_name)
  values (new.id, v_role, v_name, v_tag, v_group, v_login_name);

  if v_role = 'mentee' then
    insert into public.mentee_profiles (id, department_id)
    values (new.id, v_department_id);
  elsif v_role = 'mentor' then
    insert into public.mentor_profiles (id, company, job_field_id)
    values (new.id, btrim(meta ->> 'company'), v_job_field_id);
  end if;

  if v_role <> 'admin' then
    insert into public.privacy_consents (user_id, policy_version)
    values (new.id, v_consent);
  end if;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 3. 관리자 백업: 서비스 데이터 전체를 JSON 하나로 돌려줍니다.
--    로그인 계정(auth.users)은 PIN 해시 같은 비밀 값을 빼고 가입·마지막 로그인 시각만 넣습니다.
--    admin_invites는 몇 분만 쓰는 임시 허가라 넣지 않습니다.
create function public.admin_backup()
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
    'fee_records', 'survey_responses'
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

revoke execute on function public.admin_backup() from public, anon;
grant execute on function public.admin_backup() to authenticated;

-- 4. 보관 기간(마지막 이용 후 1년)이 지난 회원. 관리자는 백업 화면에서 보고 탈퇴 처리합니다.
--    로그인 상태를 기억해 두면 다시 로그인하지 않고 세션만 갱신하므로, 마지막 로그인과 마지막 세션 갱신 중
--    늦은 쪽을 마지막 이용으로 봅니다. 둘 다 없으면 가입 시각입니다. 관리자 계정은 빼고 보여 줍니다.
create function public.inactive_members(older_than interval default interval '1 year')
returns table (
  id uuid,
  role public.user_role,
  name text,
  name_tag text,
  created_at timestamptz,
  last_used_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 볼 수 있습니다' using errcode = '42501';
  end if;
  return query
    select a.id, a.role, a.name, a.name_tag, a.created_at, a.last_used_at
    from (
      select p.id, p.role, p.name, p.name_tag, p.created_at,
             greatest(
               u.created_at,
               u.last_sign_in_at,
               (select max(s.updated_at) from auth.sessions s where s.user_id = u.id)
             ) as last_used_at
      from public.profiles p
      join auth.users u on u.id = p.id
      where p.role <> 'admin'
    ) a
    where a.last_used_at < now() - older_than
    order by a.last_used_at;
end;
$$;

revoke execute on function public.inactive_members(interval) from public, anon;
grant execute on function public.inactive_members(interval) to authenticated;
