-- 관리자가 대신 만드는 멘토 계정 (docs/architecture.md 6.1, 11장 36번, 2026-11-24)
-- 학교가 받은 멘토 명단을 관리자가 등록합니다. 가입 때 동의를 받지 못하므로 처음 로그인할 때 동의를 받고,
-- 동의하기 전에는 공개하지 않습니다(status는 pending 그대로, 동의하면 자동 공개).

-- ---------------------------------------------------------------------------
-- 1. 멘토 계정 생성 허가 (admin_invites와 같은 방식, secret 키만)
-- ---------------------------------------------------------------------------
create table public.mentor_invites (
  email text primary key,
  created_at timestamptz not null default now()
);
alter table public.mentor_invites enable row level security;
revoke all on public.mentor_invites from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. 동의하면 자동 공개할지 (관리자·secret 키만 바꿈)
-- ---------------------------------------------------------------------------
alter table public.mentor_profiles
  add column publish_on_consent boolean not null default false;

create function public.protect_publish_on_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.publish_on_consent is distinct from old.publish_on_consent
     and not public.is_backend() and not public.is_admin() then
    raise exception '자동 공개 설정은 관리자만 바꿀 수 있습니다' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger mentor_profiles_protect_publish_on_consent
  before update on public.mentor_profiles
  for each row execute function public.protect_publish_on_consent();

-- ---------------------------------------------------------------------------
-- 3. 가입 트리거: 허가가 있으면 동의 기록 없이 멘토를 만듭니다 (첫 로그인 때 동의)
-- ---------------------------------------------------------------------------
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
  v_invited boolean := false;
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
    -- 관리자가 대신 만드는 멘토 계정 (11장 36번): 10분 안에 secret 키로 넣은 허가
    delete from public.mentor_invites
    where email = new.email and created_at > now() - interval '10 minutes';
    v_invited := found;
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

  if v_role <> 'admin' and not v_invited and (v_consent is null or v_consent !~ '^\d{4}-\d{2}-\d{2}$') then
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

  -- 대신 만든 계정은 동의 기록 없이 둡니다. 처음 로그인할 때 record_privacy_consent()로 남깁니다.
  if v_role <> 'admin' and v_consent ~ '^\d{4}-\d{2}-\d{2}$' then
    insert into public.privacy_consents (user_id, policy_version)
    values (new.id, v_consent);
  end if;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. 첫 로그인 동의 (본인만). 동의가 새로 기록되면 자동 공개 설정인 멘토를 공개합니다.
-- ---------------------------------------------------------------------------
create function public.record_privacy_consent(policy_version text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_role public.user_role;
begin
  select role into v_role from public.profiles where id = v_uid;
  if v_role is null then
    raise exception '로그인한 사용자만 동의할 수 있습니다' using errcode = '42501';
  end if;
  if record_privacy_consent.policy_version is null
     or record_privacy_consent.policy_version !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception '처리방침 판이 올바르지 않습니다' using errcode = '22023';
  end if;
  if v_role = 'admin' or exists (select 1 from public.privacy_consents where user_id = v_uid) then
    return;
  end if;

  insert into public.privacy_consents (user_id, policy_version)
  values (v_uid, record_privacy_consent.policy_version);

  if v_role = 'mentor' then
    update public.mentor_profiles
       set status = 'published', published_at = now(), publish_on_consent = false
     where id = v_uid and publish_on_consent and status = 'pending' and college_id is not null;
  end if;
end;
$$;

revoke execute on function public.record_privacy_consent(text) from public, anon;
grant execute on function public.record_privacy_consent(text) to authenticated;
