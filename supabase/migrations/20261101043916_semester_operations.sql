-- 구현 5단계: 질의응답 통계, 강사료, 학기 종료, 만족도 조사
-- 설계: docs/architecture.md 6.5, 6.6, 7장, 11장 3·4·9번

create table public.fee_records (
  id bigint generated always as identity primary key,
  semester_id bigint not null references public.semesters (id),
  mentor_id uuid not null references public.mentor_profiles (id) on delete cascade,
  question_count int not null check (question_count >= 0),
  answer_count int not null check (answer_count >= 0),
  amount int not null check (amount between 0 and 100000000),
  memo text check (char_length(memo) <= 1000),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz not null default now(),
  unique (semester_id, mentor_id)
);

create index fee_records_mentor_id_idx on public.fee_records (mentor_id);
create index fee_records_decided_by_idx on public.fee_records (decided_by);

create table public.survey_responses (
  id bigint generated always as identity primary key,
  semester_id bigint not null references public.semesters (id),
  mentor_id uuid not null references public.mentor_profiles (id) on delete cascade,
  mentee_id uuid not null references public.mentee_profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 2000),
  created_at timestamptz not null default now(),
  unique (semester_id, mentor_id, mentee_id)
);

create index survey_responses_mentor_id_idx on public.survey_responses (mentor_id);
create index survey_responses_mentee_id_idx on public.survey_responses (mentee_id);

-- ---------------------------------------------------------------------------
-- 함수
-- ---------------------------------------------------------------------------

-- 멘토별 톡방 수, 질문 수(멘티 메시지), 답변 수(멘토 메시지), 마지막 답변 시각 (6.6, 관리자 전용).
-- 관리자가 숨긴 메시지는 세지 않습니다.
create function public.admin_semester_stats(semester_id bigint)
returns table (
  mentor_id uuid,
  room_count integer,
  question_count integer,
  answer_count integer,
  last_answer_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 볼 수 있습니다' using errcode = '42501';
  end if;
  return query
  select
    r.mentor_id,
    count(distinct r.id)::int,
    count(m.id) filter (where m.sender_role = 'mentee')::int,
    count(m.id) filter (where m.sender_role = 'mentor')::int,
    max(m.created_at) filter (where m.sender_role = 'mentor')
  from public.chat_rooms r
  left join public.messages m on m.room_id = r.id and m.hidden_at is null
  where r.semester_id = admin_semester_stats.semester_id
  group by r.mentor_id;
end;
$$;

-- 학기 종료 (6.5 3번): 톡방을 읽기 전용으로 만들고 만족도 조사 기간을 엽니다.
create function public.close_semester(semester_id bigint, survey_closes_at timestamptz)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 학기를 종료할 수 있습니다' using errcode = '42501';
  end if;
  if survey_closes_at <= now() then
    raise exception '만족도 조사 마감은 지금보다 뒤여야 합니다' using errcode = '22023';
  end if;
  update public.semesters s
  set closed_at = now(),
      survey_opens_at = now(),
      survey_closes_at = close_semester.survey_closes_at
  where s.id = close_semester.semester_id and s.closed_at is null;
  if not found then
    raise exception '없는 학기이거나 이미 종료된 학기입니다' using errcode = '22023';
  end if;
end;
$$;

-- 내가 응답할 수 있는 만족도 조사: 종료된 학기의 조사 기간 안에, 그 학기 톡방이 있던 멘토마다 하나 (11장 4번)
create function public.my_pending_surveys()
returns table (semester_id bigint, semester_name text, survey_closes_at timestamptz, mentor_id uuid, mentor_name text, company text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.name, s.survey_closes_at, r.mentor_id, p.name || coalesce(p.name_tag, ''), mp.company
  from public.chat_rooms r
  join public.semesters s on s.id = r.semester_id
  join public.mentor_profiles mp on mp.id = r.mentor_id
  join public.profiles p on p.id = r.mentor_id
  where r.mentee_id = (select auth.uid())
    and s.closed_at is not null
    and now() between s.survey_opens_at and s.survey_closes_at
    and not exists (
      select 1 from public.survey_responses sr
      where sr.semester_id = s.id and sr.mentor_id = r.mentor_id and sr.mentee_id = r.mentee_id
    )
  order by s.id, p.name
$$;

-- 만족도 응답 검사: 응답자는 로그인한 멘티, 조사 기간 안, 그 학기에 그 멘토와 톡방이 있었어야 합니다.
create function public.before_survey_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.mentee_id := (select auth.uid());
  new.created_at := now();
  if not exists (
    select 1 from public.semesters s
    where s.id = new.semester_id and s.closed_at is not null
      and now() between s.survey_opens_at and s.survey_closes_at
  ) then
    raise exception '만족도 조사 기간이 아닙니다' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.chat_rooms r
    where r.semester_id = new.semester_id and r.mentor_id = new.mentor_id and r.mentee_id = new.mentee_id
  ) then
    raise exception '그 학기에 이 멘토와 톡방이 있던 멘티만 응답할 수 있습니다' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger before_survey_insert
  before insert on public.survey_responses
  for each row execute function public.before_survey_insert();

-- 강사료 기록: 결정한 관리자와 시각은 트리거가 채웁니다.
create function public.before_fee_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.decided_by := (select auth.uid());
  new.decided_at := now();
  return new;
end;
$$;

create trigger before_fee_write
  before insert or update on public.fee_records
  for each row execute function public.before_fee_write();

revoke execute on function public.before_survey_insert() from public, anon, authenticated;
revoke execute on function public.before_fee_write() from public, anon, authenticated;
revoke execute on function
  public.admin_semester_stats(bigint),
  public.close_semester(bigint, timestamptz),
  public.my_pending_surveys()
from public, anon;

-- ---------------------------------------------------------------------------
-- RLS (7장). 강사료·만족도 결과는 관리자만 봅니다 (11장 9번).
-- ---------------------------------------------------------------------------

alter table public.fee_records enable row level security;
alter table public.survey_responses enable row level security;

revoke all on public.fee_records, public.survey_responses from anon;

create policy "fee_records: 관리자 조회" on public.fee_records
  for select to authenticated using ((select public.is_admin()));
create policy "fee_records: 관리자 추가" on public.fee_records
  for insert to authenticated with check ((select public.is_admin()));
create policy "fee_records: 관리자 수정" on public.fee_records
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "fee_records: 관리자 삭제" on public.fee_records
  for delete to authenticated using ((select public.is_admin()));

-- 멘티는 자기 응답만 다시 볼 수 있습니다(무엇에 응답했는지). 결과 전체는 관리자만.
create policy "survey_responses: 본인·관리자 조회" on public.survey_responses
  for select to authenticated using (mentee_id = (select auth.uid()) or (select public.is_admin()));
create policy "survey_responses: 멘티 응답" on public.survey_responses
  for insert to authenticated with check (
    mentee_id = (select auth.uid())
    and exists (select 1 from public.mentee_profiles m where m.id = (select auth.uid()))
  );

-- 관리자는 톡방 메시지를 숨기거나 되돌립니다 (6.4). 이미 messages: 관리자 숨김 정책이 있습니다.
