# 레퍼런스 레포와 라이선스 규칙

에이전트가 역공학(화면 구성, 흐름, 데이터 모델 분석)에 쓰는 오픈소스 목록입니다. 분야마다 GitHub 스타가 가장 많은 레포를 골랐습니다. 스타 수와 라이선스는 2026-10-29 기준입니다.

```bash
npm run refs
```

위 명령은 아래 레포를 `references/` 폴더에 얕게 복제하거나 갱신합니다. `references/`는 Git에 올라가지 않습니다. 레퍼런스 안의 에이전트 지침 파일(`CLAUDE.md`, `AGENTS.md`, `.claude/`, `.cursor/` 등)과 라이선스가 다른 chatwoot의 `enterprise/` 폴더는 받지 않습니다.

## 사용 규칙

| 등급 | 라이선스 | 해도 되는 것 | 하면 안 되는 것 |
| --- | --- | --- | --- |
| 🟢 | MIT, Apache-2.0 | 읽기, 구조 참고, 코드 일부를 가져와 수정 | 출처와 라이선스 표시 없이 가져오기 |
| 🔴 | AGPL-3.0 | 읽기, 데이터 모델과 흐름 참고 | 코드 복사, 다른 언어로 옮겨 쓰기 |

🟢 레포에서 코드를 가져올 때는 다음을 지킵니다.

1. 가져온 파일 맨 위에 출처 주석을 남깁니다. 예: `// Adapted from Coding-Coach/find-a-mentor (MIT) src/components/Card/Card.tsx`
2. [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)에 레포, 라이선스, 저작권 표시, 가져온 파일을 적습니다.
3. Apache-2.0 레포(apache/answer)는 `NOTICE` 파일 내용도 함께 옮깁니다.

🔴 레포는 구조만 보고 우리 코드로 새로 작성합니다. 가져다 쓰면 이 서비스 전체를 AGPL로 공개해야 할 수 있습니다.

라이선스가 없는 레포는 저작권자가 모든 권리를 가집니다. 그래서 목록에 넣지 않았습니다.

## 레퍼런스 목록

| 폴더 | 레포 | 스타 | 라이선스 (저작권자) | 등급 | 우리 기능 | 볼 곳 |
| --- | --- | --- | --- | --- | --- | --- |
| `find-a-mentor` | [Coding-Coach/find-a-mentor](https://github.com/Coding-Coach/find-a-mentor) | 751 | MIT (Coding-Coach) | 🟢 | 멘토 목록, 필터, 멘토 소개 카드, 멘토링 신청, 관리자 승인 | `src/components/` (`MentorsList`, `Card`, `Filter`, `UserProfile`), `netlify/functions-src/functions/` (`mentors.ts`, `mentorships.ts`, `admin/`) |
| `bulletproof-react` | [alan2207/bulletproof-react](https://github.com/alan2207/bulletproof-react) | 36k | MIT (Alan Alickovic) | 🟢 | 폴더 구조, API 계층, 에러 처리 | `apps/nextjs-app/src/`, `docs/project-structure.md` |
| `answer` | [apache/answer](https://github.com/apache/answer) | 15.7k | Apache-2.0 (The Apache Software Foundation) | 🟢 | 질문·답변 데이터 모델, 답변 길이 검증(50자 기준의 참고), 관리자 화면 | `internal/entity/` (`question_entity.go`, `answer_entity.go`), `internal/schema/answer_schema.go`, `internal/controller_admin/` |
| `chatwoot` | [chatwoot/chatwoot](https://github.com/chatwoot/chatwoot) | 38.5k | MIT (Chatwoot Inc., `enterprise/` 제외) | 🟢 | 1:1 톡방 구조, 질의응답 건수 집계(강사료 산정), 만족도 조사 | `app/models/` (`conversation.rb`, `message.rb`, `reporting_event.rb`), `app/builders/csat_surveys/` |
| `frappe-lms` | [frappe/lms](https://github.com/frappe/lms) | 3.3k | AGPL-3.0 | 🔴 | 강의, 챕터, 수강 등록, 진도 데이터 모델 | `lms/lms/doctype/` (`lms_course`, `course_chapter`, `course_lesson`, `lms_enrollment`, `lms_course_progress`, `lms_course_mentor_mapping`) |

## 스택으로 쓰는 라이브러리

레퍼런스와 달리 패키지로 설치해서 씁니다. 모두 상업적 사용과 수정이 자유로운 라이선스입니다.

| 영역 | 프로젝트 | 스타 | 라이선스 |
| --- | --- | --- | --- |
| 프레임워크 | [vercel/next.js](https://github.com/vercel/next.js) | 143k | MIT |
| 백엔드·DB | [supabase/supabase](https://github.com/supabase/supabase) | 114k | Apache-2.0 |
| Supabase 클라이언트 | [supabase/supabase-js](https://github.com/supabase/supabase-js), [supabase/ssr](https://github.com/supabase/ssr) | 4.6k / 0.2k | MIT |
| UI 컴포넌트 | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | 127k | MIT |
| 스타일 | [tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss) | 98k | MIT |
| 관리자 화면 (관리자 기능 구현 때 설치) | [refinedev/refine](https://github.com/refinedev/refine) | 36k | MIT |

프로젝트 뼈대는 Next.js 공식 예제 `with-supabase`(MIT)로 만들었습니다.

## 후보에서 뺀 레포

| 레포 | 이유 |
| --- | --- |
| classroomio/classroomio (1.7k, AGPL-3.0) | 강의 분야에서 frappe/lms보다 스타가 적음 |
| marmelab/react-admin (27k, MIT) | 관리자 화면 분야에서 refine보다 스타가 적음 |
| ReDI-School/connect, boostcampwm-2021/web32-SSUL, Team-B1ND/mentomen-web | 라이선스가 없어 코드 참고 불가 |
