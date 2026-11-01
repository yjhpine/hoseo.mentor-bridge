-- 강의를 만든 직후 id를 돌려받을 때(INSERT ... RETURNING) can_view_course()는 같은 문장에서
-- 막 넣은 행을 보지 못해 거부됐습니다. 작성 멘토와 관리자는 행의 열로 바로 판단합니다.
drop policy "courses: 공개·작성 멘토·관리자 조회" on public.courses;
create policy "courses: 공개·작성 멘토·관리자 조회" on public.courses
  for select to authenticated using (
    mentor_id = (select auth.uid())
    or (select public.is_admin())
    or (status = 'published' and exists (
      select 1 from public.mentor_profiles m where m.id = mentor_id and m.status = 'published'
    ))
  );
