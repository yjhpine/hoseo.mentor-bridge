-- 2차 보안 검수 후속 조치 (docs/security-review.md 2차)

-- ---------------------------------------------------------------------------
-- C2. 보이지 않는 글자로 50자 채우기 방지 (11장 1번 "공백 제외"의 취지)
-- 한글 채움 문자(U+3164 등), 폭 없는 공백(U+200B 등), 방향 표시, 이체 선택자처럼 화면에 보이지 않는 글자도 뺍니다.
-- 화면 lib/chat/answer-length.ts의 INVISIBLE과 같은 목록입니다. 한쪽을 고치면 다른 쪽도 고칩니다.
-- ---------------------------------------------------------------------------
create or replace function public.answer_length(body text)
returns integer
language sql
stable
set search_path = ''
as $$
  select char_length(
    case when (select answer_count_spaces from public.app_settings limit 1)
      then body
      else regexp_replace(
        regexp_replace(body, '[\t\n\v\f\r \u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]', '', 'g'),
        '[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\u2800\u3164\uFE00-\uFE0F\uFFA0\U000E0000-\U000E007F]', '', 'g')
    end
  )
$$;

-- ---------------------------------------------------------------------------
-- C3. 알림 구독 주소는 실제 브라우저 푸시 서비스만, 한 사람당 5개까지
-- 아무 주소나 넣으면 메시지가 올 때마다 Edge Function이 그 주소로 요청을 보내게 됩니다.
-- Chrome·Edge·삼성 인터넷(FCM), Firefox(Mozilla), Safari(Apple), 옛 Edge(Windows).
-- ---------------------------------------------------------------------------
alter table public.push_subscriptions
  add constraint push_subscriptions_endpoint_push_service check (
    endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|([a-z0-9-]+\.)*push\.apple\.com|([a-z0-9-]+\.)*notify\.windows\.com)/'
  );

create or replace function public.save_push_subscription(endpoint text, p256dh text, auth text, user_agent text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
begin
  if v_me is null then
    raise exception '로그인이 필요합니다' using errcode = '42501';
  end if;
  delete from public.push_subscriptions s where s.endpoint = save_push_subscription.endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (v_me, save_push_subscription.endpoint, save_push_subscription.p256dh,
          save_push_subscription.auth, left(save_push_subscription.user_agent, 300));
  -- 브라우저를 여러 개 써도 최근 5개만 남깁니다.
  delete from public.push_subscriptions s
  where s.user_id = v_me
    and s.id not in (
      select k.id from public.push_subscriptions k
      where k.user_id = v_me order by k.created_at desc, k.id desc limit 5
    );
end;
$$;

-- ---------------------------------------------------------------------------
-- C4. 임시 PIN 표시(must_change_pin)는 PIN을 실제로 바꿔야만 꺼짐
-- 전에는 본인이 표시만 직접 끄고 관리자가 알려 준 임시 PIN을 계속 쓸 수 있었습니다.
-- 이제 Supabase Auth의 비밀번호(PIN)가 바뀌면 이 트리거가 끄고, 본인이 직접 끌 수는 없습니다.
-- 관리자가 PIN을 초기화하면 admin-users가 비밀번호를 바꾼 뒤 표시를 다시 켭니다.
-- ---------------------------------------------------------------------------
create function public.clear_must_change_pin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set must_change_pin = false
  where id = new.id and must_change_pin;
  return new;
end;
$$;
revoke execute on function public.clear_must_change_pin() from public, anon, authenticated;

create trigger on_auth_user_password_changed
  after update of encrypted_password on auth.users
  for each row
  when (new.encrypted_password is distinct from old.encrypted_password)
  execute function public.clear_must_change_pin();

create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_backend() then
    return new;
  end if;

  if new.id <> old.id
    or new.role <> old.role
    or new.name <> old.name
    or new.name_tag is distinct from old.name_tag
    or new.login_group <> old.login_group
    or new.login_name <> old.login_name
    or new.created_at <> old.created_at then
    raise exception '이름·소속·역할은 관리자 계정 작업으로만 바꿀 수 있습니다' using errcode = '42501';
  end if;

  if new.must_change_pin is distinct from old.must_change_pin and not public.is_admin() then
    raise exception '임시 PIN 표시는 PIN을 바꾸면 자동으로 꺼집니다' using errcode = '42501';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- C5. PIN을 바꾸면 다른 기기의 로그인을 끊음
-- PIN이 새어 나가 PIN을 바꿔도, 이미 로그인한 다른 기기는 그대로 남아 있었습니다.
-- ---------------------------------------------------------------------------
-- 본인 PIN 변경 뒤: 지금 쓰는 기기만 남기고 끊습니다.
create function public.revoke_other_sessions()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.sessions s
  where s.user_id = (select auth.uid())
    and s.id is distinct from nullif((select auth.jwt()) ->> 'session_id', '')::uuid
$$;
revoke execute on function public.revoke_other_sessions() from public, anon;
grant execute on function public.revoke_other_sessions() to authenticated;

-- 관리자의 PIN 초기화 뒤 (admin-users, secret 키): 그 사람의 모든 기기를 끊습니다.
create function public.revoke_user_sessions(target uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.sessions s where s.user_id = target
$$;
revoke execute on function public.revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_user_sessions(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- C6. 강의 자료 파일 이름·경로를 DB에서도 검사 (11장 25번)
-- 화면을 거치지 않고 API로 차시를 넣어도 허용 형식의 확장자만, 경로는 "{강의 id}/{무작위 id}.{확장자}"만 받습니다.
-- 확장자 목록은 lib/files/course-file-types.ts와 같습니다.
-- ---------------------------------------------------------------------------
alter table public.lessons
  add constraint lessons_file_path_format check (
    file_path is null
    or file_path ~ '^[1-9][0-9]*/[0-9a-f-]{36}\.(pdf|hwp|hwpx|doc|docx|xls|xlsx|ppt|pptx|png|jpg|jpeg|zip|txt)$'
  ),
  add constraint lessons_file_name_extension check (
    file_name is null
    or lower(file_name) ~ '\.(pdf|hwp|hwpx|doc|docx|xls|xlsx|ppt|pptx|png|jpg|jpeg|zip|txt)$'
  );

alter policy "course-files: 작성 멘토 올리기" on storage.objects
  with check (
    bucket_id = 'course-files'
    and name ~ '^[1-9][0-9]*/[0-9a-f-]{36}\.(pdf|hwp|hwpx|doc|docx|xls|xlsx|ppt|pptx|png|jpg|jpeg|zip|txt)$'
    and exists (
      select 1 from public.courses c
      where c.id = public.course_id_from_path(name) and c.mentor_id = (select auth.uid())
    )
  );
