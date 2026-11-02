# 보안 검수 기록

## 2026-11-02 1차 전체 검수

Claude Code로 코드, DB, 실제 사이트를 검수했습니다. 바로 악용할 수 있는 심각한 취약점은 없었고, 아래 항목을 고쳤습니다.

### 범위와 방법

| 범위 | 방법 |
| --- | --- |
| 비밀 키 노출 | 현재 파일과 Git 기록 전체에서 secret 키·개인 키 형태 검색, `.gitignore` 확인 |
| 의존성 | `npm audit` (운영·개발 구분) |
| HTTP 보안 헤더 | 실제 사이트 응답 헤더 확인 |
| 인증·접근 제어 | 로그인·가입·PIN 변경 서버 액션, proxy의 로그인 확인, 관리자 화면 `requireRole`, 서버 액션별 권한 판단 방식 |
| DB 권한 | 모든 표의 RLS·정책·권한, SECURITY DEFINER 함수와 실행 권한을 카탈로그에서 확인, 핵심 흐름 DB 시험 35단계 |
| 비로그인 공격 | 공개 키만으로 21개 표 읽기, 참조 표 쓰기·수정·삭제, 관리자 RPC, Storage 목록, `admin-users` 호출 시도 |
| 입력·XSS | HTML 직접 삽입 코드 검색, 사용자 URL을 링크로 쓰는 곳(강의 링크) 검증, 백업 CSV |
| 파일 | 다운로드 경로의 권한 판단, 서명 URL, 버킷 공개 여부·크기·형식 |
| Edge Function | `admin-users` 호출자 확인, `push-notify` 남용 가능성 |

### 결과와 조치

| # | 심각도 | 내용 | 조치 |
| --- | --- | --- | --- |
| M1 | 중간 | 브라우저 보안 헤더가 없어 클릭재킹(로그인 화면을 다른 사이트 틀에 넣어 속이기)이 가능, `x-powered-by`로 사용 기술 노출 | `next.config.ts`에 `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `poweredByHeader: false`. 정적 파일은 `public/_headers` |
| L1 | 낮음 | 비로그인에 참조 표(구역·학과·직무) 쓰기 권한, 로그인 사용자에게 `TRUNCATE`·`REFERENCES`·`TRIGGER` 권한 (RLS·API 구조로 실제 사용은 불가) | 마이그레이션 `security_hardening`으로 회수, 앞으로 만드는 표의 기본 권한도 회수 |
| L2 | 낮음 | 강의 자료 파일 형식 제한 없음 | PDF·HWP·HWPX·워드·엑셀·파워포인트·PNG·JPG·ZIP·TXT만 허용 (11장 25번). 화면(`lib/files/course-file-types.ts`)과 Storage 버킷 양쪽에서 막음 |
| L3 | 낮음 | 개발 도구 취약점 (vitest critical 등) | vitest 5로 올림. eslint 계열(moderate)과 빌드 도구 glob(high)은 운영 코드에 들어가지 않고 상위 패키지 업데이트를 기다림 |
| L4 | 낮음 | `push-notify`를 로그인 없이 계속 부르면 무료 호출량(월 50만)을 소모할 수 있음. 알림을 마음대로 보내지는 못함 | 감시만. Supabase Usage에서 Edge Function 호출 수가 갑자기 늘면 확인 |

### 받아들인 것 (설계상)

- **세션 쿠키:** Supabase 브라우저 클라이언트가 읽어야 해서 자바스크립트로 읽을 수 있습니다. 그래서 XSS 방지가 중요하고, 이번 검수에서 XSS 위험 지점은 없었습니다.
- **동명이인 확인:** 회원가입할 때 같은 소속에 같은 이름이 있는지 알 수 있습니다. 이름과 학과는 공개 정보로 보고 설계했습니다.
- **로그인 실패 잠금 없음:** 유료 기능이라 CAPTCHA와 요청 제한으로 대신합니다 (11장 16번).
- **전체 CSP 없음:** 스크립트 출처까지 제한하는 CSP는 Turnstile·Supabase·Next.js 인라인 스크립트와 맞춰야 해서 아직 넣지 않았습니다. 지금은 `frame-ancestors`만 둡니다.

### 확인해서 문제없던 것

- **비밀 키:** 코드와 Git 기록 전체에 secret 키나 개인 키가 없습니다. 앱 코드에서 secret 키를 쓰지 않습니다. 브라우저에 공개되는 값은 Supabase 주소와 공개 키뿐입니다.
- **비로그인 공격:** 21개 표 중 회원·메시지·강의·강사료·알림 키 등 18개는 읽기가 거부됐습니다. 공개된 3개(가입 화면용)도 쓰기·수정·삭제는 모두 거부됐습니다. 관리자 함수, Storage 목록, `admin-users`도 거부됐습니다.
- **DB 권한:** 모든 표에 RLS가 켜져 있습니다. SECURITY DEFINER 함수는 모두 `search_path`를 고정하고, 비로그인에게 실행 권한이 없습니다. 관리자 함수는 안에서 관리자인지 확인합니다. 멘토 목록 뷰는 `security_invoker`입니다.
- **XSS:** `dangerouslySetInnerHTML`·`innerHTML`·`eval`이 없습니다. 강의 링크는 DB 제약과 서버 양쪽에서 `http(s)://`만 받습니다. 백업 CSV는 엑셀 수식이 실행되지 않게 처리합니다.
- **파일:** 다운로드는 RLS로 수강 여부를 판단하고 60초짜리 서명 URL만 넘깁니다. 버킷은 비공개입니다.
- **인증:** 로그인 오류가 어느 값이 틀렸는지 알려 주지 않습니다. CAPTCHA가 켜져 있습니다. 임시 PIN은 서버에서 무작위로 만듭니다.
- **관리자 작업:** `admin-users`가 관리자인지 다시 확인하고, 자기 계정과 마지막 관리자는 지울 수 없습니다.
- **서버 액션:** Next.js가 다른 사이트에서 보낸 요청을 막고(CSRF), 호출한 사람의 세션으로만 DB에 접근합니다.
- **기타:** 오픈 리다이렉트가 없습니다. HTTPS는 `.dev` 도메인이라 브라우저가 강제합니다(HSTS 사전 등록). GitHub Actions는 읽기 권한만 쓰고 비밀 값이 없습니다.

### 조치 뒤 확인

- 핵심 흐름 DB 시험: 통과 35 / 전체 35 (권한 회수 뒤)
- 단위 시험 30개 통과: 파일 형식 목록이 앱과 마이그레이션에서 같은지, 보안 헤더가 빠지지 않았는지 포함
- 로컬 운영 빌드와 실제 사이트에서 보안 헤더 확인

## 다음 검수 때 볼 것

- 전체 CSP(스크립트·연결 출처 제한) 도입 여부
- eslint·OpenNext 상위 패키지 업데이트 뒤 `npm audit`
- 교차 검수: OWASP Security Audit 플러그인이나 Trail of Bits 스킬로 이번 결과와 비교
