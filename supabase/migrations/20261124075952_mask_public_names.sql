-- 비로그인 방문자에게 멘토 이름 가리기 (docs/architecture.md 11장 37번, 2026-11-24)
-- 첫 글자와 마지막 글자만 두고 가운데 글자를 O로 바꿉니다: 이동훈 → 이O훈, 남궁민수 → 남OO수, 김민 → 김O.
-- 공백은 그대로 둡니다. 로그인한 사용자(멘티·멘토·관리자)는 실명을 봅니다.
-- 공개 함수에서 가리므로 API를 직접 불러도 비로그인에게는 실명이 나가지 않습니다.
-- 비로그인으로는 이름으로 검색할 수 없게 합니다(검색 결과로 실명을 알아낼 수 있으므로).

create function public.mask_name(raw text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  n int := char_length(coalesce(raw, ''));
  i int;
  ch text;
  result text := '';
begin
  if n <= 1 then
    return raw;
  end if;
  for i in 1..n loop
    ch := substr(raw, i, 1);
    if i = 1 or (i = n and n > 2) or ch = ' ' then
      result := result || ch;
    else
      result := result || 'O';
    end if;
  end loop;
  return result;
end;
$$;

grant execute on function public.mask_name(text) to anon, authenticated;

-- 멘토 카드: 비로그인이면 이름을 가리고 이름 검색을 뺍니다.
create or replace function public.public_mentors(
  college_id bigint default null,
  job_field_id bigint default null,
  q text default null,
  lim int default 12,
  off int default 0
)
returns table (
  id uuid,
  name text,
  name_tag text,
  company text,
  job_field_name text,
  college_id bigint,
  college_name text,
  headline text,
  photo_path text,
  accepting_questions boolean,
  published_at timestamptz,
  total bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id,
         case when (select auth.uid()) is null then public.mask_name(p.name) else p.name end,
         p.name_tag, m.company, j.name, m.college_id, c.name, m.headline, m.photo_path,
         m.accepting_questions, m.published_at, count(*) over ()
  from public.mentor_profiles m
  join public.profiles p on p.id = m.id
  join public.job_fields j on j.id = m.job_field_id
  left join public.colleges c on c.id = m.college_id
  where public.public_browsing_on()
    and m.status = 'published'
    and (public_mentors.college_id is null or m.college_id = public_mentors.college_id)
    and (public_mentors.job_field_id is null or m.job_field_id = public_mentors.job_field_id)
    and (
      coalesce(btrim(public_mentors.q), '') = ''
      or ((select auth.uid()) is not null and p.name ilike '%' || btrim(public_mentors.q) || '%')
      or m.company ilike '%' || btrim(public_mentors.q) || '%'
      or m.headline ilike '%' || btrim(public_mentors.q) || '%'
      or j.name ilike '%' || btrim(public_mentors.q) || '%'
    )
  order by m.published_at desc nulls last, m.id
  limit least(greatest(public_mentors.lim, 1), 50)
  offset greatest(public_mentors.off, 0)
$$;

-- 모집 중인 강의 목록: 비로그인이면 멘토 이름을 가립니다.
create or replace function public.public_open_courses(lim int default 12)
returns table (
  id bigint,
  title text,
  summary text,
  published_at timestamptz,
  mentor_id uuid,
  mentor_name text,
  mentor_company text
)
language sql
stable
security definer
set search_path = ''
as $$
  select co.id, co.title, co.summary, co.published_at, m.id,
         case when (select auth.uid()) is null then public.mask_name(p.name) else p.name end || coalesce(p.name_tag, ''),
         m.company
  from public.courses co
  join public.mentor_profiles m on m.id = co.mentor_id
  join public.profiles p on p.id = m.id
  where public.public_browsing_on() and co.status = 'published' and m.status = 'published'
  order by co.published_at desc nulls last, co.id desc
  limit least(greatest(public_open_courses.lim, 1), 50)
$$;
