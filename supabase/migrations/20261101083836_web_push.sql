-- 새 메시지 웹 푸시 알림 (docs/architecture.md 6.9, 11장 23번)
-- 흐름: messages INSERT → 트리거가 pg_net으로 Edge Function push-notify 호출 → 받는 사람의 브라우저 구독으로 푸시

create extension if not exists pg_net;

-- 1. 브라우저 구독. 사용자가 "알림 받기"를 켠 브라우저마다 한 줄. 회원을 지우면 함께 지워집니다.
create table public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 2000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select on public.push_subscriptions to authenticated;
create policy "push_subscriptions: 본인 조회" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

-- 같은 브라우저를 다른 계정이 쓰면 구독 주인을 바꿔야 해서, 저장·삭제는 함수로만 합니다.
create function public.save_push_subscription(endpoint text, p256dh text, auth text, user_agent text default null)
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
end;
$$;

create function public.delete_push_subscription(endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions s
  where s.endpoint = delete_push_subscription.endpoint and s.user_id = (select auth.uid());
$$;

revoke execute on function public.save_push_subscription(text, text, text, text) from public, anon;
revoke execute on function public.delete_push_subscription(text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.delete_push_subscription(text) to authenticated;

-- 2. VAPID 키 (서버가 푸시를 보낼 때 서명하는 키). Edge Function이 처음 쓸 때 만들어 여기에 둡니다.
--    정책이 없어 secret 키(service_role)로만 읽습니다. 백업(admin_backup)에도 넣지 않습니다.
create table public.push_vapid_keys (
  id smallint primary key default 1 check (id = 1),
  public_key jsonb not null,
  private_key jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.push_vapid_keys enable row level security;
revoke all on public.push_vapid_keys from anon, authenticated;

-- 3. 보낸 기록. 메시지마다 한 번만 보내도록 Edge Function이 먼저 여기에 넣습니다.
create table public.push_deliveries (
  message_id bigint primary key references public.messages (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.push_deliveries enable row level security;
revoke all on public.push_deliveries from anon, authenticated;

-- 4. 새 메시지가 생기면 Edge Function을 부릅니다. 받는 사람이 구독하지 않았으면 부르지 않습니다.
--    함수는 메시지 번호만 받고, 내용·받는 사람은 DB에서 다시 읽습니다 (밖에서 불러도 이미 보낸 메시지는 다시 안 보냄).
create function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipient uuid;
begin
  select case when new.sender_id = r.mentor_id then r.mentee_id else r.mentor_id end
    into v_recipient
  from public.chat_rooms r where r.id = new.room_id;

  if v_recipient is null
    or not exists (select 1 from public.push_subscriptions s where s.user_id = v_recipient) then
    return null;
  end if;

  perform net.http_post(
    url := 'https://gxcnjcqfykcpbtikhixs.supabase.co/functions/v1/push-notify',
    body := jsonb_build_object('message_id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 5000
  );
  return null;
end;
$$;

create trigger notify_new_message
  after insert on public.messages
  for each row execute function public.notify_new_message();

revoke execute on function public.notify_new_message() from public, anon, authenticated;
