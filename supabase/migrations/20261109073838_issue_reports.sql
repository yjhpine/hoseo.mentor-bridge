-- 오류 자동 수집과 "문제 알리기" (docs/architecture.md 11장 34번, 2026-11-09)
-- 화면·서버 오류와 사용자 신고를 한 표에 모으고, 관리자만 읽고 처리 상태를 바꿉니다.
-- 새 기록은 아래 SECURITY DEFINER 함수로만 들어옵니다(표에 insert 정책 없음). 90일이 지나면 지웁니다.

create table public.issue_reports (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('error', 'report')),
  source text not null check (source in ('client', 'server', 'user')),
  message text not null check (char_length(message) <= 1000),
  detail text check (char_length(detail) <= 4000),
  path text check (char_length(path) <= 300),
  user_agent text check (char_length(user_agent) <= 300),
  user_id uuid references public.profiles (id) on delete set null,
  fingerprint text not null,
  occurrences integer not null default 1,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  status text not null default 'new' check (status in ('new', 'done')),
  resolved_at timestamptz
);

create index issue_reports_fingerprint_status on public.issue_reports (fingerprint, status);
create index issue_reports_last_seen on public.issue_reports (last_seen);
create index issue_reports_user_id on public.issue_reports (user_id);

alter table public.issue_reports enable row level security;

create policy "issue_reports: 관리자 조회" on public.issue_reports
  for select to authenticated using ((select public.is_admin()));
create policy "issue_reports: 관리자 처리 표시" on public.issue_reports
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- 관리자도 처리 상태만 바꿀 수 있습니다(내용·횟수는 그대로).
revoke update on public.issue_reports from authenticated;
grant update (status, resolved_at) on public.issue_reports to authenticated;
revoke insert, delete on public.issue_reports from anon, authenticated;

-- 주소에서 쿼리·해시를 버리고 길이를 자릅니다. 검색어 같은 개인정보가 남지 않게 합니다.
create function public.issue_clean_path(raw text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(left(split_part(split_part(coalesce(raw, ''), '?', 1), '#', 1), 300), '')
$$;

-- 화면·서버 오류 기록 (비로그인도 실행)
create function public.report_error(
  source text,
  message text,
  detail text default null,
  path text default null,
  user_agent text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_source text := case when report_error.source = 'server' then 'server' else 'client' end;
  v_message text := left(btrim(coalesce(report_error.message, '')), 1000);
  v_path text := public.issue_clean_path(report_error.path);
  v_fp text;
  v_id bigint;
begin
  if v_message = '' then
    return;
  end if;

  -- 90일 지난 기록은 지웁니다 (별도 정기 실행 없이 기록할 때마다).
  delete from public.issue_reports where last_seen < now() - interval '90 days';

  v_fp := md5('error|' || v_source || '|' || coalesce(v_path, '') || '|' || left(v_message, 200));

  -- 아직 처리하지 않은 같은 오류는 한 줄로 묶어 횟수만 올립니다.
  update public.issue_reports
     set occurrences = occurrences + 1,
         last_seen = now()
   where id = (
     select id from public.issue_reports
      where fingerprint = v_fp and status = 'new'
      order by id desc limit 1
   )
  returning id into v_id;
  if v_id is not null then
    return;
  end if;

  -- 남용 방지: 최근 1시간 새 오류가 200건을 넘으면 더 받지 않습니다.
  if (select count(*) from public.issue_reports
       where kind = 'error' and first_seen > now() - interval '1 hour') >= 200 then
    return;
  end if;

  insert into public.issue_reports (kind, source, message, detail, path, user_agent, user_id, fingerprint)
  values (
    'error',
    v_source,
    v_message,
    nullif(left(coalesce(report_error.detail, ''), 4000), ''),
    v_path,
    nullif(left(coalesce(report_error.user_agent, ''), 300), ''),
    (select p.id from public.profiles p where p.id = auth.uid()),
    v_fp
  );
end;
$$;

-- 로그인한 사용자의 "문제 알리기"
create function public.submit_issue_report(
  message text,
  path text default null,
  user_agent text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_message text := btrim(coalesce(submit_issue_report.message, ''));
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid) then
    raise exception '로그인한 사용자만 보낼 수 있습니다' using errcode = '42501';
  end if;
  if char_length(regexp_replace(v_message, '\s', '', 'g')) < 5 then
    raise exception '내용을 5자 이상 적어 주세요' using errcode = '22023';
  end if;
  if char_length(v_message) > 1000 then
    raise exception '내용은 1000자까지 적을 수 있습니다' using errcode = '22023';
  end if;
  if (select count(*) from public.issue_reports
       where kind = 'report' and user_id = v_uid and first_seen > now() - interval '1 day') >= 10 then
    raise exception '오늘은 더 보낼 수 없습니다. 내일 다시 보내 주세요' using errcode = '22023';
  end if;

  delete from public.issue_reports where last_seen < now() - interval '90 days';

  insert into public.issue_reports (kind, source, message, path, user_agent, user_id, fingerprint)
  values (
    'report',
    'user',
    v_message,
    public.issue_clean_path(submit_issue_report.path),
    nullif(left(coalesce(submit_issue_report.user_agent, ''), 300), ''),
    v_uid,
    md5('report|' || gen_random_uuid()::text)
  );
end;
$$;

-- 처리 전 오류·신고 수 (관리자 메뉴 배지)
create function public.issue_counts()
returns table (new_errors bigint, new_reports bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) filter (where kind = 'error'), count(*) filter (where kind = 'report')
    from public.issue_reports
   where status = 'new' and public.is_admin()
$$;

revoke execute on function public.issue_clean_path(text) from public, anon, authenticated;
revoke execute on function public.report_error(text, text, text, text, text) from public;
grant execute on function public.report_error(text, text, text, text, text) to anon, authenticated;
revoke execute on function public.submit_issue_report(text, text, text) from public, anon;
grant execute on function public.submit_issue_report(text, text, text) to authenticated;
revoke execute on function public.issue_counts() from public, anon;
grant execute on function public.issue_counts() to authenticated;
