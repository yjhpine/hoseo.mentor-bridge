-- 비로그인(anon)은 오류 기록 표에 아무 권한도 없습니다. 기록은 report_error()로만 남깁니다 (11장 34번).
revoke all on public.issue_reports from anon;
