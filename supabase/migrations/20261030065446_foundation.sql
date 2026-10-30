-- 구현 1단계 기반: 소속 목록, 사용자 프로필, 운영 설정, 가입 트리거, RLS 기본
-- 설계: docs/architecture.md 5장(데이터 모델), 6.1(로그인과 가입), 6.2(멘토 보호 열), 7장(RLS)

create type public.user_role as enum ('admin', 'mentor', 'mentee');
create type public.mentor_status as enum ('pending', 'published', 'hidden');

-- ---------------------------------------------------------------------------
-- 소속 목록 (가입·로그인 화면의 선택 목록)
-- ---------------------------------------------------------------------------

create table public.colleges (
  id bigint generated always as identity primary key,
  name text not null unique check (char_length(btrim(name)) between 1 and 50),
  description text,
  position int not null default 0,
  is_active boolean not null default true
);

-- 로그인 키가 학과 id를 쓰므로 지우지 않고 is_active = false로 숨깁니다.
create table public.departments (
  id bigint generated always as identity primary key,
  college_id bigint not null references public.colleges (id),
  name text not null check (char_length(btrim(name)) between 1 and 50),
  position int not null default 0,
  is_active boolean not null default true,
  unique (college_id, name)
);

create index departments_college_id_idx on public.departments (college_id);

create table public.job_fields (
  id bigint generated always as identity primary key,
  name text not null unique check (char_length(btrim(name)) between 1 and 50),
  position int not null default 0
);

-- ---------------------------------------------------------------------------
-- 운영 설정 (한 줄만 존재)
-- ---------------------------------------------------------------------------

create table public.app_settings (
  id boolean primary key default true check (id),
  answer_min_length int not null default 50 check (answer_min_length between 1 and 1000),
  answer_count_spaces boolean not null default false,
  public_browsing boolean not null default false
);

insert into public.app_settings default values;

-- ---------------------------------------------------------------------------
-- 로그인 키 (6.1). lib/auth/login-key.ts와 같은 결과를 내야 합니다.
-- ---------------------------------------------------------------------------

-- 이름 + 구분 문자를 NFC로 정규화하고, 공백을 모두 빼고, 영문 대문자만 소문자로 바꿉니다.
-- 공백 목록은 JavaScript의 \s와 같습니다. 앱과 결과가 같도록 \s 대신 글자를 직접 적었습니다.
create function public.normalize_login_name(raw text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select translate(
    regexp_replace(
      normalize(raw, NFC),
      '[\t\n\v\f\r    -     　﻿]',
      '',
      'g'
    ),
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    'abcdefghijklmnopqrstuvwxyz'
  )
$$;

-- login_name은 normalize_login_name()을 거친 값을 받습니다.
create function public.login_email(login_group text, login_name text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select 'u-'
    || left(encode(sha256(convert_to(login_group || '|' || login_name, 'UTF8')), 'hex'), 32)
    || '@login.hoseo-mentor.invalid'
$$;

-- ---------------------------------------------------------------------------
-- 사용자 프로필
-- ---------------------------------------------------------------------------

-- 이름은 한글·영문과 그 사이의 공백 한 칸만 받습니다. 보이지 않는 글자로 같은 이름처럼 보이는
-- 계정을 만드는 것을 막기 위해서입니다. 구분 문자는 영문·숫자 1~3자입니다 (11장 12번).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  name text not null check (
    char_length(name) between 1 and 30
    and name ~ '^[가-힣A-Za-z]+( [가-힣A-Za-z]+)*$'
  ),
  name_tag text check (name_tag ~ '^[A-Za-z0-9]{1,3}$'),
  login_group text not null check (login_group ~ '^(admin|mentor|dept:[1-9][0-9]*)$'),
  login_name text not null,
  must_change_pin boolean not null default false,
  created_at timestamptz not null default now(),
  unique (login_group, login_name),
  check (login_name = public.normalize_login_name(name || coalesce(name_tag, ''))),
  check (
    case role
      when 'admin' then login_group = 'admin'
      when 'mentor' then login_group = 'mentor'
      else login_group like 'dept:%'
    end
  )
);

create table public.mentee_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  department_id bigint not null references public.departments (id)
);

create index mentee_profiles_department_id_idx on public.mentee_profiles (department_id);

create table public.mentor_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  company text not null check (char_length(btrim(company)) between 1 and 100),
  job_field_id bigint not null references public.job_fields (id),
  college_id bigint references public.colleges (id),
  status public.mentor_status not null default 'pending',
  headline text check (char_length(headline) <= 100),
  intro text check (char_length(intro) <= 5000),
  career text check (char_length(career) <= 5000),
  photo_path text,
  accepting_questions boolean not null default true,
  published_at timestamptz,
  check (status <> 'published' or (college_id is not null and published_at is not null))
);

create index mentor_profiles_job_field_id_idx on public.mentor_profiles (job_field_id);
create index mentor_profiles_college_id_idx on public.mentor_profiles (college_id);

-- ---------------------------------------------------------------------------
-- 권한 함수
-- ---------------------------------------------------------------------------

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  )
$$;

-- Edge Function(admin-users)의 secret 키 요청과 마이그레이션·운영 SQL인지.
-- security definer가 아닌 함수 안에서만 써야 current_user가 호출한 역할입니다.
create function public.is_backend()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user in ('service_role', 'postgres', 'supabase_admin')
$$;

-- ---------------------------------------------------------------------------
-- 가입 트리거 (6.1 가입 3번)
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
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
    -- app_metadata는 secret 키(관리자 API)로만 넣을 수 있습니다. 가입 화면으로는 관리자가 될 수 없습니다.
    if coalesce(new.raw_app_meta_data ->> 'role', '') <> 'admin' then
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 사용자가 updateUser({ email })로 남의 로그인 키(가상 이메일)를 차지하는 것을 막습니다.
-- admin-users가 이름·소속을 바꿀 때는 profiles를 먼저 고친 뒤 이메일을 바꿉니다.
create function public.guard_login_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles;
begin
  select * into p from public.profiles where id = new.id;
  if found and new.email is distinct from public.login_email(p.login_group, p.login_name) then
    raise exception '이메일은 소속·이름과 맞아야 합니다' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  before update of email on auth.users
  for each row
  when (new.email is distinct from old.email)
  execute function public.guard_login_email();

-- ---------------------------------------------------------------------------
-- 보호 열 트리거
-- ---------------------------------------------------------------------------

-- 이름·소속·역할은 로그인 키와 묶여 있어 admin-users(secret 키)로만 바꿉니다 (6.1, 11장 15번).
-- 본인은 must_change_pin을 false로 돌리는 것만 할 수 있습니다.
create function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_backend() then
    return new;
  end if;

  if new.id <> old.id
    or new.role <> old.role
    or new.name <> old.name
    or new.name_tag is distinct from old.name_tag
    or new.login_group <> old.login_group
    or new.login_name <> old.login_name
    or new.created_at <> old.created_at then
    raise exception '이름·소속·역할은 관리자 계정 작업으로만 바꿀 수 있습니다' using errcode = '42501';
  end if;

  if new.must_change_pin and not old.must_change_pin and not public.is_admin() then
    raise exception '임시 PIN 표시는 관리자만 켤 수 있습니다' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- 관리자도 같은 authenticated 역할로 접속하므로 열 권한이 아니라 is_admin()으로 구분합니다 (6.2).
create function public.protect_mentor_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id then
    raise exception '멘토 id는 바꿀 수 없습니다' using errcode = '42501';
  end if;

  if not (public.is_backend() or public.is_admin())
    and (new.status is distinct from old.status
      or new.college_id is distinct from old.college_id
      or new.published_at is distinct from old.published_at) then
    raise exception '공개 상태와 구역은 관리자만 바꿀 수 있습니다' using errcode = '42501';
  end if;

  if new.status = 'published' and old.status <> 'published' and new.published_at is null then
    new.published_at := now();
  end if;

  return new;
end;
$$;

create trigger protect_mentor_columns
  before update on public.mentor_profiles
  for each row execute function public.protect_mentor_columns();

-- 트리거 함수는 직접 부를 일이 없습니다.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.guard_login_email() from public, anon, authenticated;
revoke execute on function public.protect_profile_columns() from public, anon, authenticated;
revoke execute on function public.protect_mentor_columns() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS (7장)
-- ---------------------------------------------------------------------------

alter table public.colleges enable row level security;
alter table public.departments enable row level security;
alter table public.job_fields enable row level security;
alter table public.app_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.mentee_profiles enable row level security;
alter table public.mentor_profiles enable row level security;

-- 비로그인 사용자는 소속 목록 말고는 아무것도 볼 수 없습니다 (11장 8번).
revoke all on public.app_settings, public.profiles, public.mentee_profiles, public.mentor_profiles from anon;

-- 소속 목록: 모두 조회, 관리자만 변경
create policy "colleges: 모두 조회" on public.colleges
  for select to anon, authenticated using (true);
create policy "colleges: 관리자 추가" on public.colleges
  for insert to authenticated with check ((select public.is_admin()));
create policy "colleges: 관리자 수정" on public.colleges
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "colleges: 관리자 삭제" on public.colleges
  for delete to authenticated using ((select public.is_admin()));

create policy "departments: 모두 조회" on public.departments
  for select to anon, authenticated using (true);
create policy "departments: 관리자 추가" on public.departments
  for insert to authenticated with check ((select public.is_admin()));
create policy "departments: 관리자 수정" on public.departments
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "departments: 관리자 삭제" on public.departments
  for delete to authenticated using ((select public.is_admin()));

create policy "job_fields: 모두 조회" on public.job_fields
  for select to anon, authenticated using (true);
create policy "job_fields: 관리자 추가" on public.job_fields
  for insert to authenticated with check ((select public.is_admin()));
create policy "job_fields: 관리자 수정" on public.job_fields
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "job_fields: 관리자 삭제" on public.job_fields
  for delete to authenticated using ((select public.is_admin()));

-- 운영 설정: 로그인 사용자 조회, 관리자 수정 (한 줄이라 추가·삭제 없음)
create policy "app_settings: 로그인 사용자 조회" on public.app_settings
  for select to authenticated using (true);
create policy "app_settings: 관리자 수정" on public.app_settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- 프로필: 생성은 가입 트리거, 삭제는 admin-users가 auth 계정을 지울 때 함께 지워집니다.
-- 같은 톡방 상대의 조회는 3단계(chat_rooms)에서 더합니다.
create policy "profiles: 본인·관리자·공개 멘토 조회" on public.profiles
  for select to authenticated using (
    id = (select auth.uid())
    or (select public.is_admin())
    or exists (
      select 1 from public.mentor_profiles m
      where m.id = profiles.id and m.status = 'published'
    )
  );
create policy "profiles: 본인·관리자 수정" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- 멘티 학과는 로그인 키와 묶여 있어 admin-users만 바꿉니다. 톡방 상대 멘토의 조회는 3단계에서 더합니다.
create policy "mentee_profiles: 본인·관리자 조회" on public.mentee_profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));

create policy "mentor_profiles: 공개·본인·관리자 조회" on public.mentor_profiles
  for select to authenticated using (
    status = 'published'
    or id = (select auth.uid())
    or (select public.is_admin())
  );
create policy "mentor_profiles: 본인·관리자 수정" on public.mentor_profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));
