# 관리자 매뉴얼 · 멘토/멘티 이용 가이드

화면 사진을 넣은 PDF 안내서입니다. 관리자 매뉴얼은 [operations.md](../operations.md)와 [backup.md](../backup.md)를 풀어 쓴 것이고, 멘토·멘티 가이드는 사이트 **이용 안내(/guide)** 화면에서 누구나 내려받습니다.

| 파일 | 내용 |
| --- | --- |
| `관리자 매뉴얼.pdf` | 관리자용 (A4, 19쪽) |
| `멘토 이용 가이드.pdf` | 멘토용 (A4, 10쪽). `public/guides/mentor-guide.pdf`로도 복사됨 |
| `멘티 이용 가이드.pdf` | 재학생용 (A4, 12쪽). `public/guides/mentee-guide.pdf`로도 복사됨 |
| `admin-manual.html`, `mentor-guide.html`, `mentee-guide.html` | PDF 원본. 글을 고칠 때는 이 파일을 고칩니다 |
| `guide.css` | 세 문서가 함께 쓰는 인쇄 스타일 |
| `images/` | 관리자 화면 사진, `images/guide/`는 멘토·멘티 화면 사진(`pc-`·`ph-` = PC·휴대폰) |

## PDF 다시 만들기

세 PDF를 한꺼번에 만들고, 멘토·멘티 가이드는 `public/guides/`에도 복사합니다. 가이드 쪽수가 바뀌면 `app/(site)/guide/page.tsx`의 `GUIDES` 쪽수도 고칩니다.

```bash
node scripts/build-manual.mjs
```

Playwright가 필요합니다(`npm i -D playwright && npx playwright install chromium`). 글꼴을 Google Fonts에서 받으므로 인터넷이 연결되어 있어야 합니다.

## 화면 사진 다시 찍기

화면이 바뀌어 사진을 새로 찍을 때 지킬 것입니다.

- 2026-11-25판 사진은 실제 사이트에 예시 데이터(멘토 홍길동·성춘향, 멘티 이몽룡·심청, "(예시)" 학기)를 잠깐 넣고 찍은 뒤 모두 지웠습니다. 다시 찍을 때도 끝나면 예시 데이터를 지웁니다. 로그인해야 하는 화면은 CAPTCHA를 잠시 끄고 찍고, 끝나면 다시 켭니다.
- 휴대폰 사진은 390×844(아이폰 13 크기) 한 화면씩 찍습니다. 전체 페이지로 찍으면 아래 고정 메뉴가 가운데에 찍힙니다.
- 이 저장소는 공개 저장소입니다. 사진에 **실제 멘토·멘티의 이름, 기업명, 질문·답변이 보이면 안 됩니다.** 가리거나(이름은 가운데 글자를 O로, 기업은 ○○기업) 예시 데이터만 보이게 찍습니다.
- 관리자 PIN, 임시 PIN이 화면에 보이는 순간은 찍지 않습니다.
- 사진은 머리말·바닥글을 빼고 관리자 메뉴 줄부터 잘라, 가로 1400픽셀 이하 PNG로 `images/`에 같은 이름으로 넣습니다.
