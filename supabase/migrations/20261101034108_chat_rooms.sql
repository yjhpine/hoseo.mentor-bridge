-- 구현 3단계: 학기(최소), 1:1 톡방, 메시지, 읽음 위치, 50자 답변 검증, Realtime
-- 설계: docs/architecture.md 3.3, 5장, 6.3, 6.4, 7장, 8장

-- ---------------------------------------------------------------------------
-- 학기 (6.5). 종료·만족도 조사는 5단계에서 씁니다.
-- ---------------------------------------------------------------------------

create table public.semesters (
  id bigint generated always as identity primary key,
  name text not null unique check (char_length(btrim(name)) between 1 and 30),
  starts_on date not null,
  ends_on date not null,
  is_current boolean not null default false,
  closed_at timestamptz,
  survey_opens_at timestamptz,
  survey_closes_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

-- 현재 학기는 하나만
create unique index semesters_one_current_idx on public.semesters (is_current) where is_current;

-- 현재 학기를 바꿉니다. 부분 유니크 인덱스 때문에 기존 현재 학기를 먼저 내립니다.
create function public.set_current_semester(semester_id bigint)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 현재 학기를 바꿀 수 있습니다' using errcode = '42501';
  end if;
  update public.semesters set is_current = false where is_current and id <> semester_id;
  update public.semesters set is_current = true where id = semester_id;
  if not found then
    raise exception '없는 학기입니다' using errcode = '22023';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 톡방과 메시지 (6.4)
-- ---------------------------------------------------------------------------

-- 학기마다 멘티-멘토 쌍당 하나
create table public.chat_rooms (
  id bigint generated always as identity primary key,
  semester_id bigint not null references public.semesters (id),
  mentor_id uuid not null references public.mentor_profiles (id) on delete cascade,
  mentee_id uuid not null references public.mentee_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  unique (semester_id, mentor_id, mentee_id)
);

create index chat_rooms_mentor_id_idx on public.chat_rooms (mentor_id, last_message_at desc);
create index chat_rooms_mentee_id_idx on public.chat_rooms (mentee_id, last_message_at desc);

-- 메시지는 수정·삭제하지 않습니다 (강사료 근거). 부적절한 메시지는 관리자가 hidden_at으로 숨깁니다.
create table public.messages (
  id bigint generated always as identity primary key,
  room_id bigint not null references public.chat_rooms (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  sender_role public.user_role not null,
  body text not null check (char_length(body) between 1 and 5000 and btrim(body) <> ''),
  created_at timestamptz not null default now(),
  hidden_at timestamptz
);

create index messages_room_id_created_at_idx on public.messages (room_id, created_at);

create table public.room_reads (
  room_id bigint not null references public.chat_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- ---------------------------------------------------------------------------
-- 함수
-- ---------------------------------------------------------------------------

create function public.is_room_member(room_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.chat_rooms r
    where r.id = room_id and (select auth.uid()) in (r.mentor_id, r.mentee_id)
  )
$$;

-- app_settings 기준 답변 글자 수. 공백 제외면 JavaScript의 \s와 같은 글자들을 뺍니다 (화면과 같은 결과).
create function public.answer_length(body text)
returns integer
language sql
stable
set search_path = ''
as $$
  select char_length(
    case when (select answer_count_spaces from public.app_settings limit 1)
      then body
      else regexp_replace(body, '[\t\n\v\f\r    -     　﻿]', '', 'g')
    end
  )
$$;

-- 멘티가 멘토 상세의 "질문하기"로 이번 학기 톡방을 열거나 기존 방을 돌려받습니다 (3.3).
create function public.open_chat_room(mentor_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_semester public.semesters;
  v_room_id bigint;
begin
  if not exists (select 1 from public.mentee_profiles where id = v_me) then
    raise exception '멘티만 질문할 수 있습니다' using errcode = '42501';
  end if;

  select * into v_semester from public.semesters where is_current;
  if not found or v_semester.closed_at is not null then
    raise exception '지금은 질문을 받는 학기가 아닙니다' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.mentor_profiles m
    where m.id = open_chat_room.mentor_id and m.status = 'published' and m.accepting_questions
  ) then
    raise exception '지금 질문을 받지 않는 멘토입니다' using errcode = '22023';
  end if;

  insert into public.chat_rooms (semester_id, mentor_id, mentee_id)
  values (v_semester.id, open_chat_room.mentor_id, v_me)
  -- 매개변수 이름(mentor_id)과 열 이름이 겹치지 않게 제약 이름으로 씁니다.
  on conflict on constraint chat_rooms_semester_id_mentor_id_mentee_id_key do nothing
  returning id into v_room_id;

  if v_room_id is null then
    select id into v_room_id from public.chat_rooms
    where semester_id = v_semester.id and chat_rooms.mentor_id = open_chat_room.mentor_id and mentee_id = v_me;
  end if;
  return v_room_id;
end;
$$;

-- 메시지 저장 전 검사: 보낸 사람과 역할을 채우고, 학기 종료와 멘토 답변 길이를 확인합니다 (6.3, 6.4).
create function public.before_message_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.chat_rooms;
  v_min int;
begin
  new.sender_id := (select auth.uid());
  new.created_at := now();
  new.hidden_at := null;

  select * into v_room from public.chat_rooms where id = new.room_id;
  if not found or new.sender_id is null or new.sender_id not in (v_room.mentor_id, v_room.mentee_id) then
    raise exception '이 톡방의 참여자만 메시지를 보낼 수 있습니다' using errcode = '42501';
  end if;
  new.sender_role := case when new.sender_id = v_room.mentor_id then 'mentor' else 'mentee' end;

  if exists (select 1 from public.semesters where id = v_room.semester_id and closed_at is not null) then
    raise exception '종료된 학기의 톡방에는 쓸 수 없습니다' using errcode = '42501';
  end if;

  if new.sender_role = 'mentor' then
    select answer_min_length into v_min from public.app_settings limit 1;
    if public.answer_length(new.body) < v_min then
      raise exception '멘토 답변은 % 이상이어야 합니다', v_min || '자' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger before_message_insert
  before insert on public.messages
  for each row execute function public.before_message_insert();

create function public.after_message_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.chat_rooms set last_message_at = new.created_at where id = new.room_id;
  -- 보낸 사람은 자기 메시지까지 읽은 것으로 봅니다.
  insert into public.room_reads (room_id, user_id, last_read_at)
  values (new.room_id, new.sender_id, new.created_at)
  on conflict (room_id, user_id) do update set last_read_at = excluded.last_read_at;
  return new;
end;
$$;

create trigger after_message_insert
  after insert on public.messages
  for each row execute function public.after_message_insert();

-- 관리자는 hidden_at만 바꿉니다. 내용·보낸 사람·시각은 누구도 바꾸지 못합니다.
create function public.protect_message_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id or new.room_id <> old.room_id or new.sender_id <> old.sender_id
    or new.sender_role <> old.sender_role or new.body <> old.body or new.created_at <> old.created_at then
    raise exception '메시지는 수정할 수 없습니다. 숨기기만 할 수 있습니다' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger protect_message_columns
  before update on public.messages
  for each row execute function public.protect_message_columns();

-- 톡방을 읽은 위치를 지금으로 옮깁니다.
create function public.mark_room_read(room_id bigint)
returns void
language sql
set search_path = ''
as $$
  insert into public.room_reads (room_id, user_id, last_read_at)
  select mark_room_read.room_id, (select auth.uid()), now()
  where public.is_room_member(mark_room_read.room_id)
  on conflict on constraint room_reads_pkey do update set last_read_at = excluded.last_read_at
$$;

-- 내 톡방별 안 읽은 메시지 수 (상대가 보낸, 숨기지 않은 메시지 중 마지막으로 읽은 뒤 것)
create function public.my_unread_counts()
returns table (room_id bigint, unread integer)
language sql
stable
set search_path = ''
as $$
  select r.id, count(m.id)::int
  from public.chat_rooms r
  left join public.room_reads rr on rr.room_id = r.id and rr.user_id = (select auth.uid())
  join public.messages m on m.room_id = r.id
    and m.sender_id <> (select auth.uid())
    and m.hidden_at is null
    and m.created_at > coalesce(rr.last_read_at, '-infinity'::timestamptz)
  where (select auth.uid()) in (r.mentor_id, r.mentee_id)
  group by r.id
$$;

-- 멘토 상세의 활동 지표 (4.2). 멘티는 남의 톡방을 볼 수 없으므로 집계만 돌려줍니다.
create function public.mentor_activity(mentor_id uuid)
returns table (answer_count integer, room_count integer, answered_room_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::int from public.messages m join public.chat_rooms r on r.id = m.room_id
      where r.mentor_id = mentor_activity.mentor_id and m.sender_role = 'mentor' and m.hidden_at is null),
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

revoke execute on function public.before_message_insert() from public, anon, authenticated;
revoke execute on function public.after_message_insert() from public, anon, authenticated;
revoke execute on function public.protect_message_columns() from public, anon, authenticated;
revoke execute on function
  public.set_current_semester(bigint),
  public.is_room_member(bigint),
  public.answer_length(text),
  public.open_chat_room(uuid),
  public.mark_room_read(bigint),
  public.my_unread_counts(),
  public.mentor_activity(uuid)
from public, anon;

-- ---------------------------------------------------------------------------
-- RLS (7장)
-- ---------------------------------------------------------------------------

alter table public.semesters enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.messages enable row level security;
alter table public.room_reads enable row level security;

revoke all on public.semesters, public.chat_rooms, public.messages, public.room_reads from anon;

create policy "semesters: 로그인 사용자 조회" on public.semesters
  for select to authenticated using (true);
create policy "semesters: 관리자 추가" on public.semesters
  for insert to authenticated with check ((select public.is_admin()));
create policy "semesters: 관리자 수정" on public.semesters
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "semesters: 관리자 삭제" on public.semesters
  for delete to authenticated using ((select public.is_admin()));

-- 톡방은 open_chat_room()으로만 만들고, 수정·삭제하지 않습니다.
create policy "chat_rooms: 참여자·관리자 조회" on public.chat_rooms
  for select to authenticated using (
    (select auth.uid()) in (mentor_id, mentee_id) or (select public.is_admin())
  );

create policy "messages: 참여자·관리자 조회" on public.messages
  for select to authenticated using (
    (hidden_at is null and (select public.is_room_member(room_id))) or (select public.is_admin())
  );
create policy "messages: 참여자 작성" on public.messages
  for insert to authenticated with check ((select public.is_room_member(room_id)));
create policy "messages: 관리자 숨김" on public.messages
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "room_reads: 본인 조회" on public.room_reads
  for select to authenticated using (user_id = (select auth.uid()));
create policy "room_reads: 본인 기록" on public.room_reads
  for insert to authenticated with check (user_id = (select auth.uid()) and (select public.is_room_member(room_id)));
create policy "room_reads: 본인 수정" on public.room_reads
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- 같은 톡방 상대의 이름과 학과 (7장)
create policy "profiles: 톡방 상대 조회" on public.profiles
  for select to authenticated using (
    exists (
      select 1 from public.chat_rooms r
      where (r.mentor_id = (select auth.uid()) and r.mentee_id = profiles.id)
         or (r.mentee_id = (select auth.uid()) and r.mentor_id = profiles.id)
    )
  );
create policy "mentee_profiles: 톡방 상대 멘토 조회" on public.mentee_profiles
  for select to authenticated using (
    exists (
      select 1 from public.chat_rooms r
      where r.mentor_id = (select auth.uid()) and r.mentee_id = mentee_profiles.id
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime (8장): 톡방 화면이 새 메시지를 바로 받습니다. Realtime도 위 RLS를 따릅니다.
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.messages;
