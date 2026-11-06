-- 비로그인 공개 범위 (docs/architecture.md 2.2, 11장 8·18·32번, 2026-11-06)
-- 멘토 표와 mentor_directory는 그대로 잠가 두고, 공개할 필드만 함수로 내보냅니다.
-- app_settings.public_browsing을 끄면 아래 함수가 모두 빈 결과를 돌려줍니다.

update public.app_settings set public_browsing = true;

create function public.public_browsing_on()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select public_browsing from public.app_settings limit 1), false)
$$;

-- 멘토 카드: 공개(published) 멘토의 사진·이름·기업·직무·대표 분야·구역·질문 가능만
create function public.public_mentors(
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
  select m.id, p.name, p.name_tag, m.company, j.name, m.college_id, c.name, m.headline, m.photo_path,
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
      or p.name ilike '%' || btrim(public_mentors.q) || '%'
      or m.company ilike '%' || btrim(public_mentors.q) || '%'
      or m.headline ilike '%' || btrim(public_mentors.q) || '%'
      or j.name ilike '%' || btrim(public_mentors.q) || '%'
    )
  order by m.published_at desc nulls last, m.id
  limit least(greatest(public_mentors.lim, 1), 50)
  offset greatest(public_mentors.off, 0)
$$;

-- 단과대학 구역별 공개 멘토 수
create function public.public_college_mentor_counts()
returns table (college_id bigint, mentor_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select m.college_id, count(*)
  from public.mentor_profiles m
  where public.public_browsing_on() and m.status = 'published' and m.college_id is not null
  group by m.college_id
$$;

-- 모집 중인 강의 목록: 제목·소개·멘토 이름·기업만 (차시·링크·파일은 로그인 후 강의 상세에서)
create function public.public_open_courses(lim int default 12)
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
  select co.id, co.title, co.summary, co.published_at, m.id, p.name || coalesce(p.name_tag, ''), m.company
  from public.courses co
  join public.mentor_profiles m on m.id = co.mentor_id
  join public.profiles p on p.id = m.id
  where public.public_browsing_on() and co.status = 'published' and m.status = 'published'
  order by co.published_at desc nulls last, co.id desc
  limit least(greatest(public_open_courses.lim, 1), 50)
$$;

revoke execute on function public.public_browsing_on() from public;
revoke execute on function public.public_mentors(bigint, bigint, text, int, int) from public;
revoke execute on function public.public_college_mentor_counts() from public;
revoke execute on function public.public_open_courses(int) from public;
grant execute on function public.public_browsing_on() to anon, authenticated;
grant execute on function public.public_mentors(bigint, bigint, text, int, int) to anon, authenticated;
grant execute on function public.public_college_mentor_counts() to anon, authenticated;
grant execute on function public.public_open_courses(int) to anon, authenticated;

-- 공개 멘토 사진은 비로그인 방문자도 봅니다 (11장 18번 변경). 개설 전·비공개 멘토 사진은 그대로 본인·관리자만.
-- 비로그인(anon)은 mentor_profiles를 읽을 권한이 없어서, 공개 여부는 SECURITY DEFINER 함수로 확인합니다.
create function public.is_published_mentor(mentor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.mentor_profiles m where m.id = mentor_id and m.status = 'published')
$$;
revoke execute on function public.is_published_mentor(uuid) from public;
grant execute on function public.is_published_mentor(uuid) to anon, authenticated;

create policy "avatars: 비로그인은 공개 멘토 사진만" on storage.objects
  for select to anon using (
    bucket_id = 'avatars'
    and public.public_browsing_on()
    and public.is_published_mentor(public.avatar_owner(name))
  );
