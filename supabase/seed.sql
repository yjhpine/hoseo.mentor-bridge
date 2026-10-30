-- 처음 운영 데이터. 원격 프로젝트에는 2026-10-30에 넣었습니다. 다시 실행해도 겹치지 않습니다.

-- 직무 분야: 잇다(itdaa.net)의 직무 카테고리 20개 ("전체" 제외, docs/itdaa-structure.md)
insert into public.job_fields (name, position)
select name, ord * 10 from unnest(array[
  '인사/총무/노무', '마케팅/MD', '홍보/CSR', '영업/영업관리', '해외영업',
  '회계/재무/금융', '전략/기획', '유통/무역/구매', '공사/공기업', 'IT개발/데이터',
  '서비스 기획/UI·UX', '디자인/예술', '미디어', '서비스', '연구/설계',
  '전문/특수', '교육/상담/컨설팅', '공무원/비영리', '생산/품질/제조', '기타 사무'
]) with ordinality as t(name, ord)
on conflict (name) do nothing;

-- 단과대학·학과: 호서대학교 홈페이지에서 확인해 채울 예정
