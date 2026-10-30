-- 관리자 계정 생성 허가 (docs/architecture.md 6.1)
-- Supabase Auth는 사용자를 먼저 만들고 app_metadata를 나중에 저장해서, 가입 트리거가 app_metadata를 볼 수 없습니다.
-- 그래서 admin-users와 첫 관리자 스크립트가 secret 키로 이 표에 한 번 쓸 허가를 넣고,
-- 가입 트리거는 허가가 있는 이메일만 관리자로 만들면서 허가를 지웁니다.

create table public.admin_invites (
  email text primary key,
  created_at timestamptz not null default now()
);

-- 정책이 없으므로 RLS를 우회하는 secret 키(service_role)만 읽고 씁니다.
alter table public.admin_invites enable row level security;
revoke all on public.admin_invites from anon, authenticated;

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

  insert into public.profiles (id, role, name, name_tag, login_group, login_name)
  values (new.id, v_role, v_name, v_tag, v_group, v_login_name);

  if v_role = 'mentee' then
    insert into public.mentee_profiles (id, department_id)
    values (new.id, v_department_id);
  elsif v_role = 'mentor' then
    insert into public.mentor_profiles (id, company, job_field_id)
    values (new.id, btrim(meta ->> 'company'), v_job_field_id);
  end if;

  return new;
end;
$$;
