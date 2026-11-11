-- 핵심 흐름 DB 시험 (docs/testing.md)
-- 관리자·멘토·멘티 2명을 임시로 만들어 한 학기를 처음부터 끝까지 돌리고, 역할마다 되는 것과 막혀야 하는 것을 확인합니다.
-- 마지막에 일부러 오류를 내서 모든 변경을 되돌립니다. 그래서 운영 DB에서 돌려도 아무것도 남지 않습니다.
-- 결과는 오류 메시지로 나옵니다: 첫 줄이 "통과 N / 전체 M", 그 아래 실패 항목, 그 아래 전체 항목.
--
-- 실행: Supabase 대시보드 → SQL Editor에 이 파일 전체를 붙여 넣고 Run. (또는 Claude에게 "DB 시험 돌려줘")
-- 주의: 알림 요청(pg_net)도 되돌려져 실제 알림은 나가지 않습니다.

create function pg_temp.act(uid uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $f$;
create function pg_temp.back() returns void language plpgsql as $f$ begin execute 'reset role'; end $f$;
-- 비로그인 방문자 (공개 메인·멘토 카드)
create function pg_temp.anon() returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
end $f$;
create temp table r (n serial, step text, expect text, got text);
grant all on r to authenticated;
grant usage on sequence r_n_seq to authenticated;

do $$
declare
  a uuid := gen_random_uuid(); m uuid := gen_random_uuid(); ma uuid := gen_random_uuid(); mb uuid := gen_random_uuid();
  dept bigint; college bigint; job bigint;
  sem bigint; room bigint; crs bigint; v int; v2 int; t text; summary text; failed text;
  long_answer text := '전자회로와 반도체공학을 깊게 공부하세요. 면접에서 공정 원리를 물어볼 때 이 두 과목이 기본이 됩니다. 현장 실습도 꼭 해 보세요.';
begin
  -- 시험에 쓸 학과·구역·직무 분야는 지금 DB에 있는 것 중에서 고릅니다.
  select d.id, d.college_id into dept, college
  from public.departments d join public.colleges c on c.id = d.college_id
  where d.is_active and c.is_active order by d.id limit 1;
  select id into job from public.job_fields order by id limit 1;
  if dept is null or job is null then
    raise exception '시험할 학과나 직무 분야가 없습니다';
  end if;

  -- 0. 가입 (가입 트리거 통과). 관리자는 허가(admin_invites)가 있어야 만들어집니다.
  insert into public.admin_invites(email) values (public.login_email('admin', public.normalize_login_name('시험관리자')));
  insert into auth.users (id, email, raw_user_meta_data, aud, role) values
   (a, public.login_email('admin', public.normalize_login_name('시험관리자')),
    '{"login_group":"admin","name":"시험관리자"}', 'authenticated', 'authenticated'),
   (m, public.login_email('mentor', public.normalize_login_name('시험멘토')),
    jsonb_build_object('login_group','mentor','name','시험멘토','company','시험전자','job_field_id',job,'privacy_policy_version','2026-11-01'), 'authenticated', 'authenticated'),
   (ma, public.login_email('dept:'||dept, public.normalize_login_name('시험멘티가')),
    jsonb_build_object('login_group','dept:'||dept,'name','시험멘티가','privacy_policy_version','2026-11-01'), 'authenticated', 'authenticated'),
   (mb, public.login_email('dept:'||dept, public.normalize_login_name('시험멘티나')),
    jsonb_build_object('login_group','dept:'||dept,'name','시험멘티나','privacy_policy_version','2026-11-01'), 'authenticated', 'authenticated');
  insert into r(step,expect,got) select '가입: 관리자·멘토·멘티 2명 프로필', '4', count(*)::text from public.profiles where id in (a,m,ma,mb);
  insert into r(step,expect,got) select '가입: 멘토·멘티 개인정보 동의 기록', '3', count(*)::text from public.privacy_consents where user_id in (m,ma,mb);

  begin
    insert into auth.users (id, email, raw_user_meta_data, aud, role) values (gen_random_uuid(),
      public.login_email('dept:'||dept, public.normalize_login_name('동의안함')),
      jsonb_build_object('login_group','dept:'||dept,'name','동의안함'), 'authenticated', 'authenticated');
    t := '허용됨';
  exception when others then t := '거부'; end;
  insert into r(step,expect,got) values ('개인정보 동의 없이 가입', '거부', t);

  begin
    insert into auth.users (id, email, raw_user_meta_data, aud, role) values (gen_random_uuid(),
      public.login_email('admin', public.normalize_login_name('가짜관리자')),
      '{"login_group":"admin","name":"가짜관리자"}', 'authenticated', 'authenticated');
    t := '허용됨';
  exception when others then t := '거부'; end;
  insert into r(step,expect,got) values ('허가 없이 관리자 가입', '거부', t);

  -- 1. 관리자: 학기 만들기·현재 학기
  perform pg_temp.act(a);
  insert into public.semesters(name, starts_on, ends_on) values ('시험 학기', current_date, current_date + 100) returning id into sem;
  perform public.set_current_semester(sem);
  perform pg_temp.back();
  insert into r(step,expect,got) select '관리자: 학기 생성·현재 학기 지정', 'true', is_current::text from public.semesters where id = sem;

  perform pg_temp.act(m);
  begin perform public.set_current_semester(sem); t := '허용됨'; exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('멘토: 현재 학기 바꾸기', '거부', t);

  -- 2. 멘토 페이지: 개설 전에는 안 보이고, 멘토는 스스로 공개할 수 없음
  perform pg_temp.act(ma); select count(*) into v from public.mentor_directory where id = m; perform pg_temp.back();
  insert into r(step,expect,got) values ('멘티: 개설 전 멘토 목록에 안 보임', '0', v::text);
  perform pg_temp.anon(); select count(*) into v from public.public_mentors(null, null, null, 50, 0) where id = m; perform pg_temp.back();
  insert into r(step,expect,got) values ('비로그인: 개설 전 멘토 카드 안 보임', '0', v::text);

  perform pg_temp.act(m);
  update public.mentor_profiles set headline = '반도체 공정 엔지니어', intro = '소개입니다' where id = m;
  begin update public.mentor_profiles set status = 'published' where id = m; t := '허용됨'; exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) select '멘토: 내 페이지 소개 저장', '반도체 공정 엔지니어', headline from public.mentor_profiles where id = m;
  insert into r(step,expect,got) values ('멘토: 스스로 공개', '거부', t);

  perform pg_temp.act(a); update public.mentor_profiles set college_id = college, status = 'published' where id = m; perform pg_temp.back();
  perform pg_temp.act(ma); select count(*) into v from public.mentor_directory where id = m; perform pg_temp.back();
  insert into r(step,expect,got) values ('관리자 개설 뒤 멘티 목록에 보임', '1', v::text);

  -- 비로그인 공개 범위 (11장 8번): 공개 함수로 카드만, 멘토 표는 직접 못 읽음, 공개 설정을 끄면 숨김
  perform pg_temp.anon(); select count(*) into v from public.public_mentors(null, null, null, 50, 0) where id = m; perform pg_temp.back();
  insert into r(step,expect,got) values ('비로그인: 공개 멘토 카드 보임', '1', v::text);
  perform pg_temp.anon();
  begin perform count(*) from public.mentor_profiles; t := '허용됨'; exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('비로그인: 멘토 표 직접 읽기', '거부', t);
  update public.app_settings set public_browsing = false;
  perform pg_temp.anon(); select count(*) into v from public.public_mentors(null, null, null, 50, 0) where id = m; perform pg_temp.back();
  update public.app_settings set public_browsing = true;
  insert into r(step,expect,got) values ('공개 설정을 끄면 비로그인 멘토 카드 숨김', '0', v::text);

  -- 3. 1:1 톡방: 멘티 질문 → 멘토 답변 (알림을 켠 멘토에게는 알림 요청이 쌓임)
  insert into public.push_subscriptions(user_id, endpoint, p256dh, auth)
  values (m, 'https://fcm.googleapis.com/fcm/send/core-loop-test', 'test', 'test');
  select count(*) into v2 from net.http_request_queue;

  perform pg_temp.act(ma);
  room := public.open_chat_room(m);
  insert into public.messages(room_id, body) values (room, '반도체 공정 엔지니어가 되려면 어떤 과목이 중요할까요?');
  perform pg_temp.back();
  insert into r(step,expect,got) select '멘티: 톡방 열고 질문', '1', count(*)::text from public.messages where room_id = room;
  insert into r(step,expect,got) select '알림을 켠 멘토에게 알림 요청 1건', '1', (count(*) - v2)::text from net.http_request_queue;

  perform pg_temp.act(mb);
  select count(*) into v from public.messages where room_id = room;
  begin insert into public.messages(room_id, body) values (room, '끼어들기'); t := '허용됨'; exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('다른 멘티: 남의 톡방 읽기', '0', v::text), ('다른 멘티: 남의 톡방에 쓰기', '거부', t);

  perform pg_temp.act(m);
  begin insert into public.messages(room_id, body) values (room, '네 전자회로요'); t := '허용됨'; exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('멘토: 50자 미만 답변', '거부', t);

  perform pg_temp.act(m);
  begin insert into public.messages(room_id, body) values (room, repeat(U&'\3164', 60)); t := '허용됨'; exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('멘토: 보이지 않는 글자로 채운 답변', '거부', t);

  -- 한 트랜잭션 안에서는 시각이 모두 같아서, 멘티가 마지막으로 읽은 시각을 1초 앞으로 돌려 둡니다.
  update public.room_reads set last_read_at = last_read_at - interval '1 second' where room_id = room and user_id = ma;
  perform pg_temp.act(m); insert into public.messages(room_id, body) values (room, long_answer); perform pg_temp.back();
  insert into r(step,expect,got)
  select '멘토: 50자 이상 답변 (공백 제외 ' || public.answer_length(long_answer) || '자)', 'mentor', sender_role::text
  from public.messages where room_id = room order by id desc limit 1;

  perform pg_temp.act(ma); select coalesce(sum(unread), 0) into v from public.my_unread_counts() where room_id = room; perform pg_temp.back();
  insert into r(step,expect,got) values ('멘티: 안 읽은 답변 수', '1', v::text);
  perform pg_temp.act(ma); perform public.mark_room_read(room); select coalesce(sum(unread), 0) into v from public.my_unread_counts() where room_id = room; perform pg_temp.back();
  insert into r(step,expect,got) values ('멘티: 톡방을 읽은 뒤 안 읽은 수', '0', v::text);
  -- 멘토가 이어서 한 번 더 보내도 답변은 1건 (11장 26번: 질문마다 1건)
  perform pg_temp.act(m); insert into public.messages(room_id, body) values (room, long_answer || ' 덧붙여서 하나 더 말씀드리면 기초 실험 과목도 중요합니다.'); perform pg_temp.back();

  -- 4. 강의: 멘토가 만들고 공개, 수강 신청한 멘티만 자료를 봄
  perform pg_temp.act(m);
  insert into public.courses(mentor_id, title, summary) values (m, '시험 강의', '요약') returning id into crs;
  insert into public.lessons(course_id, title, kind, url, position) values (crs, '1강', 'video_link', 'https://example.com/v', 1);
  update public.courses set status = 'published' where id = crs;
  perform pg_temp.back();
  insert into r(step,expect,got) select '멘토: 강의 만들고 공개', 'published', status::text from public.courses where id = crs;

  perform pg_temp.act(m);
  begin
    insert into public.lessons(course_id, title, kind, file_path, file_name, position)
    values (crs, '설치 파일', 'file', crs || '/00000000-0000-0000-0000-000000000000.pdf', '설치.exe', 2);
    t := '허용됨';
  exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('멘토: 허용 안 된 형식(.exe) 자료 등록', '거부', t);

  -- 자료 파일은 개설(공개)된 멘토만 올림 (11장 27번)
  perform pg_temp.act(m);
  begin insert into storage.objects(bucket_id, name) values ('course-files', crs || '/11111111-1111-1111-1111-111111111111.pdf'); t := '허용됨'; exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('개설된 멘토: 자료 파일 올리기', '허용됨', t);
  perform pg_temp.act(a); update public.mentor_profiles set status = 'hidden' where id = m; perform pg_temp.back();
  perform pg_temp.act(m);
  begin insert into storage.objects(bucket_id, name) values ('course-files', crs || '/22222222-2222-2222-2222-222222222222.pdf'); t := '허용됨'; exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('개설 안 된(비공개) 멘토: 자료 파일 올리기', '거부', t);
  perform pg_temp.act(a); update public.mentor_profiles set status = 'published' where id = m; perform pg_temp.back();

  -- 프로필 사진: 멘토 본인 폴더에만 올리고, 로그인 사용자가 공개 멘토 사진을 봄 (11장 18번)
  perform pg_temp.act(m);
  begin
    insert into storage.objects(bucket_id, name) values ('avatars', m || '/33333333-3333-3333-3333-333333333333.webp');
    update public.mentor_profiles set photo_path = m || '/33333333-3333-3333-3333-333333333333.webp' where id = m;
    t := '허용됨';
  exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('멘토: 내 프로필 사진 올리기', '허용됨', t);
  perform pg_temp.act(m);
  begin insert into storage.objects(bucket_id, name) values ('avatars', ma || '/44444444-4444-4444-4444-444444444444.webp'); t := '허용됨'; exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('멘토: 남의 폴더에 사진 올리기', '거부', t);
  perform pg_temp.act(ma);
  begin insert into storage.objects(bucket_id, name) values ('avatars', ma || '/55555555-5555-5555-5555-555555555555.webp'); t := '허용됨'; exception when others then t := '거부'; end;
  select count(*) into v from storage.objects where bucket_id = 'avatars' and name like m || '/%';
  perform pg_temp.back();
  insert into r(step,expect,got) values ('멘티: 프로필 사진 올리기', '거부', t), ('멘티: 공개 멘토 사진 보기', '1', v::text);

  perform pg_temp.act(mb); select count(*) into v from public.lessons where course_id = crs; perform pg_temp.back();
  insert into r(step,expect,got) values ('수강 안 한 멘티: 강의 자료 보기', '0', v::text);
  perform pg_temp.act(ma);
  insert into public.enrollments(course_id) values (crs);
  select count(*) into v from public.lessons where course_id = crs;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('수강 신청한 멘티: 강의 자료 보기', '1', v::text);

  -- 5. 관리자: 질의응답 현황과 내용
  perform pg_temp.act(a);
  select question_count || '/' || answer_count || '/' || room_count into t from public.admin_semester_stats(sem) where mentor_id = m;
  select count(*) into v from public.messages where room_id = room;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('관리자: 멘토별 질문/답변/톡방 수 (이어 보낸 답변은 1건)', '1/1/1', t), ('관리자: 톡방 내용 열람', '3', v::text);

  -- 질문 없이 톡방만 연 멘티 (아래 만족도 자격 확인용)
  perform pg_temp.act(mb); perform public.open_chat_room(m); perform pg_temp.back();

  -- 6. 강사료: 관리자만 책정·열람
  perform pg_temp.act(m);
  begin
    insert into public.fee_records(semester_id, mentor_id, question_count, answer_count, amount) values (sem, m, 1, 1, 999999);
    t := '허용됨';
  exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('멘토: 자기 강사료 쓰기', '거부', t);
  perform pg_temp.act(a);
  insert into public.fee_records(semester_id, mentor_id, question_count, answer_count, amount) values (sem, m, 1, 1, 50000);
  perform pg_temp.back();
  perform pg_temp.act(m); select count(*) into v from public.fee_records; perform pg_temp.back();
  insert into r(step,expect,got) values ('멘토: 강사료 열람', '0', v::text);
  insert into r(step,expect,got)
  select '관리자: 강사료 책정 (책정자 기록)', '50000/true', amount || '/' || (decided_by = a)::text from public.fee_records where semester_id = sem;

  -- 단가는 관리자만 (11장 29·30번), 지급 완료 뒤에는 금액을 못 고침 (31번)
  perform pg_temp.act(a);
  insert into public.fee_rates(semester_id, per_answer, cap) values (sem, 10000, 50000);
  perform pg_temp.back();
  perform pg_temp.act(m); select count(*) into v from public.fee_rates; perform pg_temp.back();
  insert into r(step,expect,got) values ('멘토: 강사료 단가 보기', '0', v::text);
  perform pg_temp.act(a);
  update public.fee_records set paid_at = now() where semester_id = sem and mentor_id = m;
  begin update public.fee_records set amount = 60000 where semester_id = sem and mentor_id = m; t := '허용됨'; exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got)
  select '관리자: 지급 완료 (처리자 기록)', 'true', (paid_at is not null and paid_by = a)::text from public.fee_records where semester_id = sem and mentor_id = m;
  insert into r(step,expect,got) values ('관리자: 지급 완료 뒤 금액 고치기', '거부', t);
  perform pg_temp.act(a);
  update public.fee_records set paid_at = null where semester_id = sem and mentor_id = m;
  update public.fee_records set amount = 10000, unit_price = 10000 where semester_id = sem and mentor_id = m;
  perform pg_temp.back();
  insert into r(step,expect,got)
  select '관리자: 지급 취소 뒤 다시 책정', '10000/미지급', amount || '/' || case when paid_at is null and paid_by is null then '미지급' else '지급' end from public.fee_records where semester_id = sem and mentor_id = m;

  -- 7. 학기 종료 → 톡방 읽기 전용, 만족도 조사
  perform pg_temp.act(m);
  begin perform public.close_semester(sem, now() + interval '14 days'); t := '허용됨'; exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('멘토: 학기 종료', '거부', t);
  perform pg_temp.act(a); perform public.close_semester(sem, now() + interval '14 days'); perform pg_temp.back();

  perform pg_temp.act(ma);
  begin insert into public.messages(room_id, body) values (room, '종료 뒤 질문'); t := '허용됨'; exception when others then t := '거부'; end;
  select count(*) into v from public.my_pending_surveys();
  insert into public.survey_responses(semester_id, mentor_id, rating, comment) values (sem, m, 5, '도움이 많이 됐어요');
  perform pg_temp.back();
  insert into r(step,expect,got) values ('학기 종료 뒤 톡방에 쓰기', '거부', t), ('멘티: 응답할 만족도 조사', '1', v::text);

  perform pg_temp.act(mb);
  begin insert into public.survey_responses(semester_id, mentor_id, rating) values (sem, m, 1); t := '허용됨'; exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('질문 없이 톡방만 연 멘티: 만족도 응답', '거부', t);

  perform pg_temp.act(m); select count(*) into v from public.survey_responses; perform pg_temp.back();
  insert into r(step,expect,got) values ('멘토: 만족도 결과 열람', '0', v::text);
  perform pg_temp.act(a); select count(*) into v from public.survey_responses where semester_id = sem; perform pg_temp.back();
  insert into r(step,expect,got) values ('관리자: 만족도 결과 열람', '1', v::text);

  -- 8. 백업: 관리자만, 모든 메시지 포함
  select count(*) into v2 from public.messages;
  perform pg_temp.act(a); select jsonb_array_length(public.admin_backup() -> 'tables' -> 'messages') into v; perform pg_temp.back();
  insert into r(step,expect,got) values ('관리자: 전체 백업 (메시지 수 = DB 메시지 수)', v2::text, v::text);
  perform pg_temp.act(ma);
  begin perform public.admin_backup(); t := '허용됨'; exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('멘티: 전체 백업', '거부', t);

  -- 9. 알림 구독: 실제 푸시 서비스 주소만
  perform pg_temp.act(ma);
  begin perform public.save_push_subscription('https://attacker.example/hook', 'k', 'a'); t := '허용됨'; exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('멘티: 푸시 서비스가 아닌 주소로 알림 구독', '거부', t);

  -- 10. 임시 PIN 표시는 본인이 끌 수 없음 (PIN을 바꾸면 자동으로 꺼짐)
  update public.profiles set must_change_pin = true where id = ma;
  perform pg_temp.act(ma);
  begin update public.profiles set must_change_pin = false where id = ma; t := '허용됨'; exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('멘티: 임시 PIN 표시를 직접 끄기', '거부', t);
  update auth.users set encrypted_password = extensions.crypt('654321', extensions.gen_salt('bf')) where id = ma;
  insert into r(step,expect,got) select '멘티: PIN을 바꾸면 임시 PIN 표시 꺼짐', 'false', must_change_pin::text from public.profiles where id = ma;

  -- 11. 알림 구독: 본인 것만 보임
  perform pg_temp.act(ma); select count(*) into v from public.push_subscriptions; perform pg_temp.back();
  insert into r(step,expect,got) values ('멘티: 남의 알림 구독 보기', '0', v::text);

  -- 12. 오류·신고 (11장 34번): 기록은 함수로만, 읽기·처리는 관리자만
  perform pg_temp.anon(); perform public.report_error('client', '시험 오류 core_loop', 'stack', '/core-loop-test?q=개인정보', 'test-agent'); perform pg_temp.back();
  select count(*) into v from public.issue_reports where path = '/core-loop-test' and kind = 'error';
  insert into r(step,expect,got) values ('비로그인: 화면 오류 기록 (주소의 ? 뒤는 버림)', '1', v::text);
  perform pg_temp.anon(); perform public.report_error('client', '시험 오류 core_loop', 'stack', '/core-loop-test', 'test-agent'); perform pg_temp.back();
  select occurrences into v from public.issue_reports where path = '/core-loop-test' and kind = 'error';
  insert into r(step,expect,got) values ('같은 오류는 한 줄로 묶고 횟수만 올림', '2', v::text);
  perform pg_temp.anon();
  begin select count(*) into v from public.issue_reports; t := '허용됨'; exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('비로그인: 오류 기록 직접 읽기', '거부', t);
  perform pg_temp.anon();
  begin perform public.submit_issue_report('비로그인 신고 시험입니다', '/core-loop-test'); t := '허용됨'; exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('비로그인: 문제 알리기', '거부', t);
  perform pg_temp.act(ma); perform public.submit_issue_report('멘토 상세가 안 열려요', '/core-loop-test', 'test-agent'); perform pg_temp.back();
  select count(*) into v from public.issue_reports where path = '/core-loop-test' and kind = 'report' and user_id = ma;
  insert into r(step,expect,got) values ('멘티: 문제 알리기', '1', v::text);
  perform pg_temp.act(ma);
  begin perform public.submit_issue_report('  짧 음 ', '/core-loop-test'); t := '허용됨'; exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('멘티: 너무 짧은 문제 알리기', '거부', t);
  perform pg_temp.act(ma); select count(*) into v from public.issue_reports; perform pg_temp.back();
  insert into r(step,expect,got) values ('멘티: 오류·신고 기록 읽기', '0', v::text);
  perform pg_temp.act(ma); update public.issue_reports set status = 'done' where path = '/core-loop-test'; perform pg_temp.back();
  select count(*) into v from public.issue_reports where path = '/core-loop-test' and status = 'done';
  insert into r(step,expect,got) values ('멘티: 처리 완료로 바꾸기 (바뀌지 않음)', '0', v::text);
  perform pg_temp.act(a); select count(*) into v from public.issue_reports where path = '/core-loop-test'; perform pg_temp.back();
  insert into r(step,expect,got) values ('관리자: 오류·신고 읽기', '2', v::text);
  perform pg_temp.act(a);
  update public.issue_reports set status = 'done', resolved_at = now() where path = '/core-loop-test';
  begin update public.issue_reports set message = '고침' where path = '/core-loop-test'; t := '허용됨'; exception when others then t := '거부'; end;
  perform pg_temp.back();
  select count(*) into v from public.issue_reports where path = '/core-loop-test' and status = 'done';
  insert into r(step,expect,got) values ('관리자: 처리 완료 표시', '2', v::text);
  insert into r(step,expect,got) values ('관리자: 오류 내용 고치기', '거부', t);
  perform pg_temp.anon(); perform public.report_error('client', '시험 오류 core_loop', null, '/core-loop-test'); perform pg_temp.back();
  select count(*) into v from public.issue_reports where path = '/core-loop-test' and kind = 'error';
  insert into r(step,expect,got) values ('처리 완료 뒤 같은 오류가 다시 나면 새 줄', '2', v::text);
  update public.issue_reports set last_seen = now() - interval '91 days' where path = '/core-loop-test' and status = 'done';
  perform pg_temp.anon(); perform public.report_error('client', '다른 시험 오류', null, '/core-loop-test-2'); perform pg_temp.back();
  select count(*) into v from public.issue_reports where path = '/core-loop-test' and status = 'done';
  insert into r(step,expect,got) values ('90일 지난 기록은 다음 기록 때 지워짐', '0', v::text);

  -- 13. 멘토 학기 보고서 (11장 35번): 멘토 본인만 내고 바꾸며, 관리자는 읽기만
  perform pg_temp.act(m);
  insert into public.mentor_reports(semester_id, mentor_id, file_path, file_name, file_size)
  values (sem, m, m || '/' || sem || '/66666666-6666-6666-6666-666666666666.pdf', '보고서.pdf', 1000);
  perform pg_temp.back();
  select count(*) into v from public.mentor_reports where mentor_id = m and semester_id = sem;
  insert into r(step,expect,got) values ('멘토: 학기 보고서 내기', '1', v::text);
  perform pg_temp.act(m);
  begin
    insert into public.mentor_reports(semester_id, mentor_id, file_path, file_name, file_size)
    values (sem, m, m || '/' || sem || '/77777777-7777-7777-7777-777777777777.pdf', '두번째.pdf', 1000);
    t := '허용됨';
  exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('멘토: 같은 학기에 보고서 두 건', '거부', t);
  perform pg_temp.act(m);
  update public.mentor_reports set file_path = m || '/' || sem || '/88888888-8888-8888-8888-888888888888.hwp', file_name = '보고서.hwp'
   where mentor_id = m and semester_id = sem;
  perform pg_temp.back();
  insert into r(step,expect,got) select '멘토: 보고서 바꾸기', '보고서.hwp', file_name from public.mentor_reports where mentor_id = m and semester_id = sem;
  perform pg_temp.act(m);
  begin
    insert into public.mentor_reports(semester_id, mentor_id, file_path, file_name, file_size)
    values (sem, ma, ma || '/' || sem || '/99999999-9999-9999-9999-999999999999.pdf', '대신.pdf', 1000);
    t := '허용됨';
  exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('멘토: 남의 이름으로 보고서 내기', '거부', t);
  perform pg_temp.act(ma); select count(*) into v from public.mentor_reports; perform pg_temp.back();
  insert into r(step,expect,got) values ('멘티: 멘토 보고서 보기', '0', v::text);
  perform pg_temp.act(a); select count(*) into v from public.mentor_reports where mentor_id = m; perform pg_temp.back();
  insert into r(step,expect,got) values ('관리자: 멘토 보고서 보기', '1', v::text);
  perform pg_temp.act(a);
  begin update public.mentor_reports set file_name = '관리자가고침.pdf' where mentor_id = m; t := '허용됨'; exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) select '관리자: 멘토 보고서 고치기 (바뀌지 않음)', '보고서.hwp', file_name from public.mentor_reports where mentor_id = m and semester_id = sem;
  perform pg_temp.act(a);
  insert into public.semesters(name, starts_on, ends_on) values ('시험 다음 학기', current_date + 200, current_date + 300) returning id into v2;
  perform pg_temp.back();
  perform pg_temp.act(m);
  begin
    insert into public.mentor_reports(semester_id, mentor_id, file_path, file_name, file_size)
    values (v2, m, m || '/' || v2 || '/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.pdf', '미리.pdf', 1000);
    t := '허용됨';
  exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('멘토: 시작 안 한 학기 보고서 내기', '거부', t);
  perform pg_temp.act(m);
  begin insert into storage.objects(bucket_id, name) values ('mentor-reports', m || '/' || sem || '/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.pdf'); t := '허용됨'; exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('멘토: 내 폴더에 보고서 파일 올리기', '허용됨', t);
  perform pg_temp.act(m);
  begin insert into storage.objects(bucket_id, name) values ('mentor-reports', ma || '/' || sem || '/cccccccc-cccc-cccc-cccc-cccccccccccc.pdf'); t := '허용됨'; exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('멘토: 남의 폴더에 보고서 파일 올리기', '거부', t);
  perform pg_temp.act(m);
  begin insert into storage.objects(bucket_id, name) values ('mentor-reports', m || '/' || sem || '/dddddddd-dddd-dddd-dddd-dddddddddddd.exe'); t := '허용됨'; exception when others then t := '거부'; end;
  perform pg_temp.back();
  insert into r(step,expect,got) values ('멘토: 허용 안 된 형식(.exe) 보고서 파일', '거부', t);
  perform pg_temp.act(ma);
  begin insert into storage.objects(bucket_id, name) values ('mentor-reports', ma || '/' || sem || '/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee.pdf'); t := '허용됨'; exception when others then t := '거부'; end;
  select count(*) into v from storage.objects where bucket_id = 'mentor-reports' and name like m || '/%';
  perform pg_temp.back();
  insert into r(step,expect,got) values ('멘티: 보고서 파일 올리기', '거부', t), ('멘티: 멘토 보고서 파일 보기', '0', v::text);
  perform pg_temp.act(a); select count(*) into v from storage.objects where bucket_id = 'mentor-reports' and name like m || '/%'; perform pg_temp.back();
  insert into r(step,expect,got) values ('관리자: 멘토 보고서 파일 보기', '1', v::text);
  perform pg_temp.act(m); delete from public.mentor_reports where mentor_id = m and semester_id = sem; perform pg_temp.back();
  select count(*) into v from public.mentor_reports where mentor_id = m;
  insert into r(step,expect,got) values ('멘토: 보고서 지우기', '0', v::text);

  -- 결과
  select '통과 ' || count(*) filter (where got = expect) || ' / 전체 ' || count(*) into summary from r;
  select string_agg(n || '. ' || step || ' (기대 ' || expect || ', 실제 ' || got || ')', E'\n' order by n)
    into failed from r where got <> expect;
  select string_agg(n || '. ' || (case when got = expect then 'OK  ' else 'FAIL' end) || ' ' || step, E'\n' order by n)
    into t from r;
  raise exception E'[DB 시험 결과, 모든 변경 되돌림]\n%\n\n실패:\n%\n\n전체:\n%', summary, coalesce(failed, '없음'), t;
end $$;
