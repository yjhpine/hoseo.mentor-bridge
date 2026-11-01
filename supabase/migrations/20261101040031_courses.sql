-- 구현 4단계: 강의, 차시, 수강 신청, 강의 자료 Storage 버킷
-- 설계: docs/architecture.md 2.2, 5장, 7장, 10장, 11장 2번

create type public.course_status as enum ('draft', 'published');
create type public.lesson_kind as enum ('video_link', 'file', 'live_link');

create table public.courses (
  id bigint generated always as identity primary key,
  mentor_id uuid not null references public.mentor_profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  summary text check (char_length(summary) <= 5000),
  status public.course_status not null default 'draft',
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create index courses_mentor_id_idx on public.courses (mentor_id);
create index courses_status_published_at_idx on public.courses (status, published_at desc);

-- 차시: 영상 링크·자료 파일·실시간 링크 중 하나. 영상은 외부 링크로 등록합니다 (11장 2번, 10장 저장 용량).
create table public.lessons (
  id bigint generated always as identity primary key,
  course_id bigint not null references public.courses (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  kind public.lesson_kind not null,
  url text check (url ~ '^https?://' and char_length(url) <= 2000),
  file_path text,
  file_name text check (char_length(file_name) <= 200),
  starts_at timestamptz,
  position int not null default 0,
  created_at timestamptz not null default now(),
  -- 자료 파일은 그 강의 폴더("{강의 id}/...") 안에만 둡니다.
  check (file_path is null or split_part(file_path, '/', 1) = course_id::text),
  check (
    case kind
      when 'video_link' then url is not null and file_path is null and starts_at is null
      when 'file' then file_path is not null and url is null and starts_at is null
      when 'live_link' then url is not null and file_path is null and starts_at is not null
    end
  )
);

create index lessons_course_id_idx on public.lessons (course_id, position);

create table public.enrollments (
  course_id bigint not null references public.courses (id) on delete cascade,
  mentee_id uuid not null references public.mentee_profiles (id) on delete cascade,
  semester_id bigint not null references public.semesters (id),
  created_at timestamptz not null default now(),
  primary key (course_id, mentee_id)
);

create index enrollments_mentee_id_idx on public.enrollments (mentee_id);
create index enrollments_semester_id_idx on public.enrollments (semester_id);

-- ---------------------------------------------------------------------------
-- 함수
-- ---------------------------------------------------------------------------

-- 강의를 볼 수 있는지: 공개 강의(멘토도 공개), 작성 멘토, 관리자
create function public.can_view_course(course_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.courses c
    join public.mentor_profiles m on m.id = c.mentor_id
    where c.id = course_id
      and ((c.status = 'published' and m.status = 'published')
        or c.mentor_id = (select auth.uid())
        or public.is_admin())
  )
$$;

-- 강의 자료(차시의 링크·파일)를 볼 수 있는지: 수강 멘티, 작성 멘토, 관리자 (2.2)
create function public.can_access_course_materials(course_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.courses c
    where c.id = course_id
      and (c.mentor_id = (select auth.uid())
        or public.is_admin()
        or exists (
          select 1 from public.enrollments e
          where e.course_id = c.id and e.mentee_id = (select auth.uid())
        ))
  )
$$;

-- 강의 소개 화면의 차시 목록: 제목·종류·실시간 시각만 돌려주고 링크와 파일은 감춥니다.
create function public.course_outline(course_id bigint)
returns table (id bigint, title text, kind public.lesson_kind, starts_at timestamptz, "position" int)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, l.title, l.kind, l.starts_at, l.position
  from public.lessons l
  where l.course_id = course_outline.course_id and public.can_view_course(course_outline.course_id)
  order by l.position, l.id
$$;

-- 수강생 수 (강의 상세, 멘토 상세 4.2). 누가 듣는지는 감추고 숫자만 돌려줍니다.
create function public.course_enrollment_count(course_id bigint)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.enrollments e
  where e.course_id = course_enrollment_count.course_id
    and public.can_view_course(course_enrollment_count.course_id)
$$;

create function public.mentor_student_count(mentor_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(distinct e.mentee_id)::int
  from public.enrollments e
  join public.courses c on c.id = e.course_id
  where c.mentor_id = mentor_student_count.mentor_id
    and exists (
      select 1 from public.mentor_profiles mp
      where mp.id = mentor_student_count.mentor_id
        and (mp.status = 'published' or mp.id = (select auth.uid()) or public.is_admin())
    )
$$;

-- 강의 작성자와 공개 시각은 트리거가 정합니다.
create function public.before_course_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if not public.is_backend() then
      new.mentor_id := (select auth.uid());
    end if;
    new.created_at := now();
  elsif new.mentor_id <> old.mentor_id or new.created_at <> old.created_at then
    raise exception '강의 작성자는 바꿀 수 없습니다' using errcode = '42501';
  end if;

  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger before_course_write
  before insert or update on public.courses
  for each row execute function public.before_course_write();

-- 수강 신청: 공개 강의에만, 신청 시점의 현재 학기로 기록합니다 (5.2).
create function public.before_enrollment_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_semester_id bigint;
begin
  new.mentee_id := (select auth.uid());
  new.created_at := now();

  if not exists (
    select 1 from public.courses c join public.mentor_profiles m on m.id = c.mentor_id
    where c.id = new.course_id and c.status = 'published' and m.status = 'published'
  ) then
    raise exception '수강 신청할 수 없는 강의입니다' using errcode = '22023';
  end if;

  select id into v_semester_id from public.semesters where is_current and closed_at is null;
  if v_semester_id is null then
    raise exception '지금은 수강 신청을 받는 학기가 아닙니다' using errcode = '22023';
  end if;
  new.semester_id := v_semester_id;
  return new;
end;
$$;

create trigger before_enrollment_insert
  before insert on public.enrollments
  for each row execute function public.before_enrollment_insert();

revoke execute on function public.before_course_write() from public, anon, authenticated;
revoke execute on function public.before_enrollment_insert() from public, anon, authenticated;
revoke execute on function
  public.can_view_course(bigint),
  public.can_access_course_materials(bigint),
  public.course_outline(bigint),
  public.course_enrollment_count(bigint),
  public.mentor_student_count(uuid)
from public, anon;

-- ---------------------------------------------------------------------------
-- RLS (7장)
-- ---------------------------------------------------------------------------

alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;

revoke all on public.courses, public.lessons, public.enrollments from anon;

create policy "courses: 공개·작성 멘토·관리자 조회" on public.courses
  for select to authenticated using ((select public.can_view_course(id)));
create policy "courses: 멘토 작성" on public.courses
  for insert to authenticated with check (
    mentor_id = (select auth.uid())
    and exists (select 1 from public.mentor_profiles m where m.id = (select auth.uid()))
  );
create policy "courses: 작성 멘토·관리자 수정" on public.courses
  for update to authenticated
  using (mentor_id = (select auth.uid()) or (select public.is_admin()))
  with check (mentor_id = (select auth.uid()) or (select public.is_admin()));
create policy "courses: 작성 멘토·관리자 삭제" on public.courses
  for delete to authenticated using (mentor_id = (select auth.uid()) or (select public.is_admin()));

-- 차시 행(링크·파일 경로 포함)은 자료를 볼 수 있는 사람만. 소개 화면의 목록은 course_outline()으로 봅니다.
create policy "lessons: 수강 멘티·작성 멘토·관리자 조회" on public.lessons
  for select to authenticated using ((select public.can_access_course_materials(course_id)));
create policy "lessons: 작성 멘토 추가" on public.lessons
  for insert to authenticated with check (
    exists (select 1 from public.courses c where c.id = course_id and c.mentor_id = (select auth.uid()))
  );
create policy "lessons: 작성 멘토·관리자 수정" on public.lessons
  for update to authenticated
  using (exists (select 1 from public.courses c where c.id = course_id and (c.mentor_id = (select auth.uid()) or (select public.is_admin()))))
  with check (exists (select 1 from public.courses c where c.id = course_id and (c.mentor_id = (select auth.uid()) or (select public.is_admin()))));
create policy "lessons: 작성 멘토·관리자 삭제" on public.lessons
  for delete to authenticated
  using (exists (select 1 from public.courses c where c.id = course_id and (c.mentor_id = (select auth.uid()) or (select public.is_admin()))));

create policy "enrollments: 본인·강의 멘토·관리자 조회" on public.enrollments
  for select to authenticated using (
    mentee_id = (select auth.uid())
    or exists (select 1 from public.courses c where c.id = course_id and c.mentor_id = (select auth.uid()))
    or (select public.is_admin())
  );
create policy "enrollments: 멘티 본인 신청" on public.enrollments
  for insert to authenticated with check (
    mentee_id = (select auth.uid())
    and exists (select 1 from public.mentee_profiles m where m.id = (select auth.uid()))
  );
create policy "enrollments: 멘티 본인·관리자 취소" on public.enrollments
  for delete to authenticated using (mentee_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Storage: 강의 자료 파일 (7장). 경로는 "{강의 id}/{파일}"이고 비공개 버킷입니다.
-- 무료 플랜 저장 용량이 1GB(조직 합산)라 파일 하나는 20MB까지 받습니다 (10장).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('course-files', 'course-files', false, 20 * 1024 * 1024)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create function public.course_id_from_path(path text)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select case when split_part(path, '/', 1) ~ '^[1-9][0-9]*$' then split_part(path, '/', 1)::bigint end
$$;

create policy "course-files: 작성 멘토 올리기" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'course-files'
    and exists (
      select 1 from public.courses c
      where c.id = public.course_id_from_path(name) and c.mentor_id = (select auth.uid())
    )
  );
create policy "course-files: 수강 멘티·작성 멘토·관리자 읽기" on storage.objects
  for select to authenticated using (
    bucket_id = 'course-files'
    and public.can_access_course_materials(public.course_id_from_path(name))
  );
create policy "course-files: 작성 멘토·관리자 지우기" on storage.objects
  for delete to authenticated using (
    bucket_id = 'course-files'
    and exists (
      select 1 from public.courses c
      where c.id = public.course_id_from_path(name)
        and (c.mentor_id = (select auth.uid()) or public.is_admin())
    )
  );
