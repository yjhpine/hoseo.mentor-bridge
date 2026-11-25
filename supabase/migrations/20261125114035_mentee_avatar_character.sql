-- 멘티 기본 캐릭터 고르기 (docs/architecture.md 11장 38번, 2026-11-25 변경)
-- 멘티는 평상복 동물 6종 중에서만 고릅니다. null이면 화면이 멘티 id로 정합니다.
-- mentee_profiles에는 멘티 수정 정책이 없으므로(학과는 로그인 키와 묶임) 이 열만 바꾸는 함수를 둡니다.

alter table public.mentee_profiles
  add column avatar_character smallint
  constraint mentee_profiles_avatar_character_range check (avatar_character between 1 and 6);

comment on column public.mentee_profiles.avatar_character is
  '톡방 등에 보일 평상복 캐릭터 번호 1~6. null이면 멘티 id로 자동 (11장 38번)';

create function public.set_my_mentee_character(choice smallint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다' using errcode = '42501';
  end if;
  if choice is null or choice not between 1 and 6 then
    raise exception '캐릭터 번호가 올바르지 않습니다' using errcode = '22023';
  end if;
  update public.mentee_profiles set avatar_character = choice where id = v_uid;
  if not found then
    raise exception '멘티만 고를 수 있습니다' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.set_my_mentee_character(smallint) from public, anon;
grant execute on function public.set_my_mentee_character(smallint) to authenticated;
