-- 멘토 프로필 사진 (docs/architecture.md 7장 Storage, 11장 18번)
-- 멘토 본인이 올리고, 관리자는 지울 수 있습니다. 올리면 바로 공개되고 로그인 사용자만 봅니다.
-- 브라우저가 512px 정사각형으로 줄여 WEBP(지원하지 않으면 JPG)로 올립니다. 경로: "{멘토 id}/{무작위 id}.webp"

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 1024 * 1024, array['image/webp', 'image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 경로의 첫 폴더(멘토 id). 모양이 맞지 않으면 null.
create function public.avatar_owner(path text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f-]{36}\.(webp|jpg)$'
    then split_part(path, '/', 1)::uuid
  end
$$;

create policy "avatars: 멘토 본인 올리기" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'avatars'
    and public.avatar_owner(name) = (select auth.uid())
    and exists (select 1 from public.mentor_profiles m where m.id = (select auth.uid()))
  );

create policy "avatars: 로그인 사용자 보기 (공개 멘토·본인·관리자)" on storage.objects
  for select to authenticated using (
    bucket_id = 'avatars'
    and (
      public.avatar_owner(name) = (select auth.uid())
      or (select public.is_admin())
      or exists (
        select 1 from public.mentor_profiles m
        where m.id = public.avatar_owner(name) and m.status = 'published'
      )
    )
  );

create policy "avatars: 멘토 본인·관리자 지우기" on storage.objects
  for delete to authenticated using (
    bucket_id = 'avatars'
    and (public.avatar_owner(name) = (select auth.uid()) or (select public.is_admin()))
  );

-- 사진 경로는 그 멘토의 폴더 안, 위 모양만 받습니다.
alter table public.mentor_profiles
  add constraint mentor_profiles_photo_path_format check (
    photo_path is null or public.avatar_owner(photo_path) = id
  );
