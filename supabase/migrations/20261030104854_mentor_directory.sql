-- 구현 2단계: 멘토 탐색용 뷰와 멘토 보호 열 보강 (docs/architecture.md 3.2, 4.1, 4.2)

-- 멘토 카드·목록·검색에 필요한 값을 한 번에 읽습니다.
-- security_invoker라 부른 사람의 RLS를 그대로 따릅니다: 로그인 사용자는 공개 멘토만, 멘토 본인과 관리자는 더 봅니다.
create view public.mentor_directory
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
  m.published_at
from public.mentor_profiles m
join public.profiles p on p.id = m.id
join public.job_fields j on j.id = m.job_field_id
left join public.colleges c on c.id = m.college_id;

revoke all on public.mentor_directory from anon;

create index mentor_profiles_status_published_at_idx
  on public.mentor_profiles (status, published_at desc);

-- 멘토 본인은 소개·경력·사진·질문 받기만 바꿉니다 (3.2).
-- 공개 상태·구역·개설 시각에 더해 기업명과 직무 분야도 관리자만 바꿉니다.
create or replace function public.protect_mentor_columns()
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
      or new.published_at is distinct from old.published_at
      or new.company is distinct from old.company
      or new.job_field_id is distinct from old.job_field_id) then
    raise exception '공개 상태·구역·기업명·직무 분야는 관리자만 바꿀 수 있습니다' using errcode = '42501';
  end if;

  if new.status = 'published' and old.status <> 'published' and new.published_at is null then
    new.published_at := now();
  end if;

  return new;
end;
$$;
