# 학교 서버 이전 안내 (웹만 이전)

호서대학교 멘토링 웹을 Cloudflare에서 학교 서버로 옮기는 준비 문서입니다. 결정은 [architecture.md](architecture.md) 11장 11번에 있습니다(2026-11-27).

- **옮기는 것**: 웹 화면과 서버 처리(Next.js). 지금 Cloudflare Workers에서 돌고 있습니다.
- **그대로 두는 것**: DB, 로그인, 파일(사진·강의 자료·보고서), 알림. Supabase 클라우드 서울 리전에 있습니다.
  - 학교 서버에는 개인정보가 저장되지 않습니다. 웹 서버는 요청을 Supabase로 넘기기만 합니다.
- **자동 입력 방지**: Cloudflare Turnstile은 호스팅과 따로인 무료 서비스라 그대로 씁니다.

## 1. 구성

```
사용자 브라우저 ──HTTPS──▶ 학교 서버 [nginx :443] ──▶ [Next.js 웹 :3000]
       │                                                   │
       │  톡방 실시간·파일 올리기/받기                      │ 로그인·DB 읽기/쓰기
       ▼                                                   ▼
   Supabase 클라우드 (gxcnjcqfykcpbtikhixs, 서울) ◀────────┘
       │ 새 메시지 알림 → 휴대폰·PC 푸시
   Cloudflare Turnstile (가입·로그인 자동 입력 방지 위젯)
```

## 2. 학교 서버에 필요한 것

| 항목 | 필요한 것 | 비고 |
|---|---|---|
| 운영체제 | 리눅스(Ubuntu 22.04/24.04, Rocky 9 등) | 윈도우 서버도 Node.js로 가능하지만 아래 예시는 리눅스 기준 |
| 실행 방식 | **Docker**(권장) 또는 **Node.js 22** | 둘 다 파일을 준비해 둠 |
| 사양 | CPU 2코어, 메모리 2GB, 디스크 10GB | 동시 접속 수백 명 수준. 빌드할 때 메모리를 가장 많이 씀 |
| 도메인 | 예: `mentor.hoseo.ac.kr` | 학교 DNS에 등록 |
| HTTPS 인증서 | 학교 인증서 또는 Let's Encrypt | **꼭 필요.** 알림·앱 설치·로그인 쿠키가 HTTPS에서만 동작 |
| 들어오는 포트 | 443(HTTPS), 80(HTTPS로 넘김) | 외부(학생 휴대폰)에서 접속 가능해야 함 |
| 나가는 포트 | 443 → `gxcnjcqfykcpbtikhixs.supabase.co`, `challenges.cloudflare.com`, `registry.npmjs.org`(빌드할 때) | 학교 방화벽에서 허용 필요 |
| 접속 권한 | 담당자 SSH 계정, sudo 또는 docker 그룹 | 새 버전을 올릴 때 씀 |

## 3. 전산팀에 물어볼 것

1. 서버 운영체제는 무엇이고, Docker를 설치·사용할 수 있나요?
2. 도메인(예: mentor.hoseo.ac.kr)과 HTTPS 인증서는 누가 발급·갱신하나요?
3. 학교 밖(학생 휴대폰, 집)에서 접속할 수 있게 열 수 있나요? 학내망 전용인가요?
4. 서버가 밖으로 Supabase·Cloudflare Turnstile·npm 저장소에 HTTPS로 나갈 수 있나요? 프록시가 있나요?
5. 우리 쪽(취업팀·개발 담당) SSH 계정을 받을 수 있나요? 아니면 전산팀이 대신 올려 주나요?
6. 서버 백업·모니터링(다운 알림)·보안 점검(취약점 진단) 정책이 있나요?
7. 개인정보(학생 이름·학과, 질문·답변)가 학교 밖 클라우드(Supabase 서울 리전)에 있는 것이 괜찮나요?
   - 안 된다면 DB까지 옮겨야 합니다(8장 참고). 일이 훨씬 커집니다.
8. 학교 웹 방화벽(WAF)이나 리버스 프록시가 앞에 있나요? 있다면 WebSocket과 큰 요청 허용 여부도 알려 주세요.

## 4. 설치

저장소 `deploy/school/`에 필요한 파일이 있습니다.

| 파일 | 용도 |
|---|---|
| `Dockerfile` | 웹 이미지 빌드(Node 22, root가 아닌 사용자로 실행, 헬스체크 포함) |
| `docker-compose.yml` | 실행(127.0.0.1:3000에만 열고, 꺼지면 다시 켬, 로그 크기 제한) |
| `.env.example` | 환경 변수 3개(모두 공개 값). `.env`로 복사해서 씀 |
| `nginx.conf.example` | HTTPS 리버스 프록시 예시 |
| `keepalive.cron.example` | 하루 한 번 Supabase 깨우기(무료 플랜 정지 방지) |
| `systemd/hoseo-mentor.service.example` | Docker 없이 Node로 돌릴 때 서비스 등록 |
| `update.sh` | 새 버전 올리기(git pull → 빌드 → 재시작) |

### 4-1. Docker로 설치 (권장)

```bash
git clone https://github.com/yjhpine/hoseo.mentor-bridge.git /opt/hoseo-mentor
cd /opt/hoseo-mentor/deploy/school
cp .env.example .env              # 값은 그대로 써도 됨 (공개 값)
docker compose up -d --build      # 처음 빌드는 3~5분
curl -I http://127.0.0.1:3000/about   # 200이면 성공
```

### 4-2. Docker 없이 Node.js로 설치

```bash
# Node.js 22 설치 뒤
git clone https://github.com/yjhpine/hoseo.mentor-bridge.git /opt/hoseo-mentor
cd /opt/hoseo-mentor
cp deploy/school/.env.example deploy/school/.env
sudo useradd -r -s /usr/sbin/nologin hoseo && sudo chown -R hoseo /opt/hoseo-mentor
sudo cp deploy/school/systemd/hoseo-mentor.service.example /etc/systemd/system/hoseo-mentor.service
sudo systemctl daemon-reload && sudo systemctl enable hoseo-mentor
./deploy/school/update.sh node    # 빌드하고 서비스를 켬
```

### 4-3. HTTPS (nginx)

`deploy/school/nginx.conf.example`을 `/etc/nginx/conf.d/hoseo-mentor.conf`로 복사합니다. 그다음 도메인과 인증서 경로를 바꾸고 `sudo nginx -t && sudo systemctl reload nginx`를 실행합니다. 학교에 이미 웹 방화벽이나 리버스 프록시가 있으면 같은 설정(HTTPS, `X-Forwarded-*` 헤더, WebSocket 허용)을 그쪽에 넣습니다.

### 4-4. 하루 한 번 Supabase 깨우기

Supabase 무료 플랜은 7일 동안 사용이 적으면 프로젝트를 정지합니다. 지금은 Cloudflare가 하루 한 번 깨우는데, 이전하면 서버 cron이 맡습니다. `crontab -e`에 `deploy/school/keepalive.cron.example`의 한 줄을 넣습니다.
- 수동 확인: Docker는 `docker exec hoseo-mentor node keepalive.mjs`를 실행하고 "성공: 200"이 나오는지 봅니다.
- 유료 플랜(Pro)으로 바꾸면 이 작업은 필요 없습니다.

## 5. 이전 순서 (체크리스트)

**준비** (운영 중인 Cloudflare 사이트는 그대로 둠)
- [ ] 1\. 전산팀 답변을 받고 서버·도메인·인증서를 준비합니다(3장).
- [ ] 2\. 서버에 설치합니다(4-1 또는 4-2). `curl http://127.0.0.1:3000/about`이 200을 돌려줘야 합니다.
- [ ] 3\. HTTPS를 연결합니다(4-3). 브라우저에서 `https://새도메인`이 열려야 합니다.
- [ ] 4\. **Turnstile 허용 도메인 추가**: Cloudflare 대시보드 → Turnstile → 위젯(site key `0x4AAAAAAFu1jPNYduGAEpLg`) → 도메인에 새 도메인을 넣습니다. 이걸 빼먹으면 로그인 화면의 확인 칸이 실패합니다.
- [ ] 5\. **Supabase 설정 확인**: 대시보드 → Authentication → URL Configuration의 Site URL을 새 도메인으로 바꿉니다. 메일을 보내지 않는 구조라 로그인에는 영향이 없지만 맞춰 둡니다.
- [ ] 6\. **알림 연락처 주소**: Supabase 대시보드 → Edge Functions → Secrets에 `SITE_URL=https://새도메인`을 넣습니다(`push-notify`가 씀).
- [ ] 7\. keepalive cron을 등록합니다(4-4).

**시험** (새 도메인에서)
- [ ] 8\. 비로그인: 메인·멘토 찾기·서비스 소개·이용 안내·가이드 PDF가 열리는지 봅니다.
- [ ] 9\. 로그인: 시험 멘티·멘토 계정으로 로그인 → 질문 → 답변 → 알림 → 강의 수강 → 마이페이지를 확인합니다.
- [ ] 10\. 관리자: 사용자·멘토 개설·강사료·백업 내려받기를 확인합니다.
- [ ] 11\. 휴대폰: 홈 화면에 추가(앱 설치)하고 푸시 알림을 켜서 받아 봅니다. 예전 주소에서 설치한 앱·알림은 새 주소에서 다시 켜야 합니다.

**전환**
- [ ] 12\. 사용자 안내: 단톡방 안내문과 사이트 공지에 새 주소를 알립니다.
- [ ] 13\. 문서 주소 바꾸기: 매뉴얼 3종 표지, `docs/operations.md`, README, 안내문(6장 목록). 그다음 `node scripts/build-manual.mjs`로 PDF를 다시 만듭니다.
- [ ] 14\. 예전 주소(workers.dev)는 1~2주 동안 그대로 두거나, 새 주소로 넘기는 안내 화면으로 바꿉니다.
- [ ] 15\. 문제가 없으면 Cloudflare 자동 배포를 끄고 Worker를 멈춥니다. 그때까지는 7장의 되돌리기가 가능합니다.

## 6. 주소를 바꿔야 하는 곳

| 위치 | 내용 |
|---|---|
| `docs/manual/admin-manual.html`, `mentor-guide.html`, `mentee-guide.html` | 표지의 "사이트" 주소 → PDF 다시 만들기 |
| `docs/operations.md`, `README.md` | 사이트 주소 |
| 단톡방 멘토 안내문 | 사이트·가이드 PDF 주소 |
| Supabase Edge Function secret `SITE_URL` | 푸시 알림 연락처(5장 6번) |
| `docs/architecture.md` 11장 11번 | 확정 도메인과 이전 날짜 |

## 7. 되돌리기

- 이전 뒤에도 Cloudflare Worker를 바로 지우지 않습니다. 새 서버에 문제가 생기면 안내 주소를 예전 주소로 돌리면 됩니다.
- DB는 한 곳(Supabase)에만 있어서 두 주소 어디로 들어와도 같은 데이터를 봅니다. 따로 옮길 데이터가 없습니다.

## 8. 나중에 DB까지 학교로 옮겨야 한다면 (참고)

Supabase는 Docker로 직접 설치할 수 있습니다(공식 self-hosting). 그러면 데이터가 모두 학교 서버에 있게 되지만 일이 훨씬 커집니다.

- **필요한 것**
  - 서버 사양: 메모리 8GB 이상 권장
  - 운영 부담: Postgres 백업·업데이트·보안 패치를 학교가 맡아야 합니다.
- **옮길 것**
  - DB 전체(`pg_dump`): 회원·톡방·강의·강사료·만족도 등
  - 로그인 계정과 PIN(암호화된 값). 그대로 옮기면 사용자가 PIN을 다시 정하지 않아도 됩니다.
  - 파일 저장소: 사진·강의 자료·보고서
  - Edge Function 2개(`admin-users`, `push-notify`)와 비밀 키
- **바꿀 것**: 웹의 `NEXT_PUBLIC_SUPABASE_URL`과 키, CAPTCHA 연동, 알림용 `pg_net` 설정
- **위험**: 이전하는 동안 서비스를 멈춰야 하고, 학기 중에는 하지 않는 것이 좋습니다.

웹 이전을 먼저 하고 운영이 안정된 뒤, 전산팀 판단(3장 7번)에 따라 따로 계획합니다.
