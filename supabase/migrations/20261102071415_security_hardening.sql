-- 보안 검수(2026-11-02, docs/security-review.md) 후속 조치
-- 1. 강의 자료 파일 형식 제한 (11장 25번). lib/files/course-file-types.ts의 목록과 같아야 합니다.
-- 2. 쓰지 않는 표 권한 회수. 지금도 RLS가 막고 있지만 한 겹 더 막습니다.

update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'application/x-hwp',
  'application/hwp+zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
  'application/zip',
  'text/plain'
]
where id = 'course-files';

-- 비로그인(anon)은 가입 화면용 목록(구역·학과·직무)을 읽기만 합니다.
revoke insert, update, delete, truncate, references, trigger
  on public.colleges, public.departments, public.job_fields from anon;

-- TRUNCATE는 RLS를 거치지 않는 권한이고, REFERENCES·TRIGGER는 앱이 쓰지 않습니다. 공개 API로는 쓸 수 없지만 회수합니다.
do $$
declare t text;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute format('revoke truncate, references, trigger on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- 멘토 목록 뷰는 읽기 전용입니다.
revoke insert, update, delete, truncate, references, trigger on public.mentor_directory from anon, authenticated;

-- 앞으로 만드는 표도 같은 권한으로 시작합니다.
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from anon, authenticated;
