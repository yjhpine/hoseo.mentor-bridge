-- 소속 2단계·소속 전용 단과대학 (docs/architecture.md 11장 39번, 2026-11-26)
-- 호서대 "대학 (2026 기준)" 페이지에 맞춰 학과를 더하고, 멘토 구역이 아닌 단과대학(가입 소속 전용)을 구분합니다.

alter table public.colleges
  add column is_mentor_zone boolean not null default true;

comment on column public.colleges.is_mentor_zone is
  '멘토 구역으로 쓰는지. false면 가입 소속 전용(메인 구역·멘토 찾기·멘토 배치에 안 나옴, 11장 39번)';

-- 교양대학·융합학부: 가입 소속 전용
insert into public.colleges (name, position, is_mentor_zone)
values ('교양대학', 50, false), ('융합학부', 60, false);

insert into public.departments (college_id, name, position)
select c.id, d.name, d.position
from public.colleges c
join (values
  ('교양대학', '자유전공학부', 10),
  ('교양대학', '창의교양학부', 20),
  ('교양대학', '혁신융합학부', 30),
  ('융합학부', '융합학부', 10)
) as d(college, name, position) on d.college = c.name;

-- AI공과대학: 기계자동차공학부 (기계공학트랙·자동차공학트랙)
insert into public.departments (college_id, name, position)
select id, '기계자동차공학부', 15 from public.colleges where name = 'AI공과대학';

-- 멘토는 멘토 구역 단과대학에만 배치합니다.
create function public.check_mentor_zone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.college_id is not null
     and not exists (select 1 from public.colleges c where c.id = new.college_id and c.is_mentor_zone) then
    raise exception '멘토는 멘토 구역 단과대학에만 배치할 수 있습니다' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger mentor_profiles_check_mentor_zone
  before insert or update of college_id on public.mentor_profiles
  for each row execute function public.check_mentor_zone();

-- 멘토가 배치된 단과대학은 소속 전용으로 바꿀 수 없습니다(먼저 다른 구역으로 옮김).
create function public.protect_mentor_zone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_mentor_zone and not new.is_mentor_zone
     and exists (select 1 from public.mentor_profiles m where m.college_id = new.id) then
    raise exception '멘토가 배치된 단과대학은 소속 전용으로 바꿀 수 없습니다' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger colleges_protect_mentor_zone
  before update of is_mentor_zone on public.colleges
  for each row execute function public.protect_mentor_zone();
