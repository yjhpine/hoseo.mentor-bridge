-- 기본 프로필 캐릭터 (docs/architecture.md 11장 38번, 2026-11-25)
-- 사진이 없는 멘토는 정장 입은 동물 10종 중 하나로 보입니다. 멘토가 고른 번호를 저장하고, null이면 화면이 멘토 id로 정합니다.
-- 멘토 본인 수정은 기존 RLS("본인·관리자 수정")로 되고, protect_mentor_columns는 이 열을 막지 않습니다.

alter table public.mentor_profiles
  add column avatar_character smallint
  constraint mentor_profiles_avatar_character_range check (avatar_character between 1 and 10);

comment on column public.mentor_profiles.avatar_character is
  '사진이 없을 때 보일 기본 캐릭터 번호 1~10. null이면 멘토 id로 자동 (11장 38번)';

-- 멘토 탐색 뷰: 맨 끝에 캐릭터 번호를 더합니다 (기존 열 순서는 그대로).
create or replace view public.mentor_directory
with (security_invoker = true)
as
select
  m.id,
  p.name,
  p.name_tag,
  m.company,
  m.job_field_id,
  j.name as job_field_name,
  m.college_id,
  c.name as college_name,
  m.status,
  m.headline,
  m.intro,
  m.career,
  m.photo_path,
  m.accepting_questions,
  m.published_at,
  m.avatar_character
from public.mentor_profiles m
join public.profiles p on p.id = m.id
join public.job_fields j on j.id = m.job_field_id
left join public.colleges c on c.id = m.college_id;

-- 공개 멘토 카드: 반환 열이 늘어 다시 만듭니다. 이름 가리기·검색 규칙은 20261124075952_mask_public_names와 같습니다.
drop function public.public_mentors(bigint, bigint, text, int, int);

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
  avatar_character smallint,
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
         p.name_tag, m.company, j.name, m.college_id, c.name, m.headline, m.photo_path, m.avatar_character,
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

revoke execute on function public.public_mentors(bigint, bigint, text, int, int) from public;
grant execute on function public.public_mentors(bigint, bigint, text, int, int) to anon, authenticated;
