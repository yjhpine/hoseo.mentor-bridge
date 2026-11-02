-- 2차 보안 검수에서 보류했던 운영 규칙 3가지 (docs/architecture.md 11장 26~28번, 2026-11-02 확정)

-- ---------------------------------------------------------------------------
-- 26번. 질문·답변은 "차례"로 셈
-- 멘티가 연달아 보낸 메시지 묶음 = 질문 1건, 그 뒤 멘토가 연달아 보낸 메시지 묶음 = 답변 1건.
-- 짧게 나눠 여러 번 보내도 건수가 늘지 않습니다. 관리자가 숨긴 메시지는 없는 것으로 봅니다.
-- ---------------------------------------------------------------------------
-- 톡방마다 보이는 메시지를 순서대로 놓고, 바로 앞 메시지와 보낸 쪽이 다르면(또는 첫 메시지면) 새 차례입니다.
create function public.message_turns(semester_id bigint default null, mentor_id uuid default null)
returns table (message_id bigint, room_id bigint, mentor_id uuid, sender_role public.user_role)
language sql
stable
set search_path = ''
as $$
  select t.id, t.room_id, t.mentor_id, t.sender_role
  from (
    select m.id, m.room_id, r.mentor_id, m.sender_role,
           lag(m.sender_role) over (partition by m.room_id order by m.id) as prev_role
    from public.messages m
    join public.chat_rooms r on r.id = m.room_id
    where m.hidden_at is null
      and (message_turns.semester_id is null or r.semester_id = message_turns.semester_id)
      and (message_turns.mentor_id is null or r.mentor_id = message_turns.mentor_id)
  ) t
  where t.prev_role is distinct from t.sender_role
$$;
-- 내부용: 아래 SECURITY DEFINER 함수들만 부릅니다.
revoke execute on function public.message_turns(bigint, uuid) from public, anon, authenticated;

create or replace function public.admin_semester_stats(semester_id bigint)
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
  with turns as (
    select t.mentor_id,
           count(*) filter (where t.sender_role = 'mentee')::int as questions,
           -- 멘토가 먼저 말을 건 경우(앞에 질문이 없는 첫 차례)는 답변으로 세지 않습니다.
           count(*) filter (where t.sender_role = 'mentor' and exists (
             select 1 from public.message_turns(admin_semester_stats.semester_id) q
             where q.room_id = t.room_id and q.sender_role = 'mentee' and q.message_id < t.message_id
           ))::int as answers
    from public.message_turns(admin_semester_stats.semester_id) t
    group by t.mentor_id
  )
  select
    r.mentor_id,
    count(distinct r.id)::int,
    coalesce(max(tu.questions), 0),
    coalesce(max(tu.answers), 0),
    max(m.created_at) filter (where m.sender_role = 'mentor')
  from public.chat_rooms r
  left join public.messages m on m.room_id = r.id and m.hidden_at is null
  left join turns tu on tu.mentor_id = r.mentor_id
  where r.semester_id = admin_semester_stats.semester_id
  group by r.mentor_id;
end;
$$;

create or replace function public.mentor_activity(mentor_id uuid)
returns table (answer_count integer, room_count integer, answered_room_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::int from public.message_turns(null, mentor_activity.mentor_id) t
      where t.sender_role = 'mentor' and exists (
        select 1 from public.message_turns(null, mentor_activity.mentor_id) q
        where q.room_id = t.room_id and q.sender_role = 'mentee' and q.message_id < t.message_id
      )),
    (select count(*)::int from public.chat_rooms r
      where r.mentor_id = mentor_activity.mentor_id
        and exists (select 1 from public.messages m where m.room_id = r.id and m.sender_role = 'mentee')),
    (select count(*)::int from public.chat_rooms r
      where r.mentor_id = mentor_activity.mentor_id
        and exists (select 1 from public.messages m where m.room_id = r.id and m.sender_role = 'mentee')
        and exists (select 1 from public.messages m where m.room_id = r.id and m.sender_role = 'mentor'))
  where exists (
    select 1 from public.mentor_profiles mp
    where mp.id = mentor_activity.mentor_id
      and (mp.status = 'published' or mp.id = (select auth.uid()) or public.is_admin())
  )
$$;

-- ---------------------------------------------------------------------------
-- 27번. 강의 자료 파일은 개설(공개)된 멘토만 올림 (무료 저장 용량 1GB 보호)
-- ---------------------------------------------------------------------------
alter policy "course-files: 작성 멘토 올리기" on storage.objects
  with check (
    bucket_id = 'course-files'
    and name ~ '^[1-9][0-9]*/[0-9a-f-]{36}\.(pdf|hwp|hwpx|doc|docx|xls|xlsx|ppt|pptx|png|jpg|jpeg|zip|txt)$'
    and exists (
      select 1 from public.courses c
      join public.mentor_profiles mp on mp.id = c.mentor_id
      where c.id = public.course_id_from_path(name)
        and c.mentor_id = (select auth.uid())
        and mp.status = 'published'
    )
  );

-- ---------------------------------------------------------------------------
-- 28번. 만족도는 그 학기에 그 멘토에게 질문하고 답변을 받은 멘티만
-- ---------------------------------------------------------------------------
-- 톡방에 멘티 질문과 그 뒤의 멘토 답변이 있는지 (숨긴 메시지 제외)
create function public.room_has_answer(room_id bigint)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.messages a
    where a.room_id = room_has_answer.room_id and a.sender_role = 'mentor' and a.hidden_at is null
      and exists (
        select 1 from public.messages q
        where q.room_id = a.room_id and q.sender_role = 'mentee' and q.hidden_at is null and q.id < a.id
      )
  )
$$;
revoke execute on function public.room_has_answer(bigint) from public, anon, authenticated;

create or replace function public.my_pending_surveys()
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
    and public.room_has_answer(r.id)
    and not exists (
      select 1 from public.survey_responses sr
      where sr.semester_id = s.id and sr.mentor_id = r.mentor_id and sr.mentee_id = r.mentee_id
    )
  order by s.id, p.name
$$;

create or replace function public.before_survey_insert()
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
      and public.room_has_answer(r.id)
  ) then
    raise exception '그 학기에 이 멘토에게 질문하고 답변을 받은 멘티만 응답할 수 있습니다' using errcode = '42501';
  end if;
  return new;
end;
$$;
