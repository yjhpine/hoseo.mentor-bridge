// 개인정보 처리방침의 기준 값 (docs/architecture.md 6.7, 11장 19번).
// 처리방침 내용을 바꾸면 PRIVACY_POLICY_VERSION(시행일)을 새 날짜로 올립니다. 가입 동의 기록에 이 값이 남습니다.

export const PRIVACY_POLICY_VERSION = "2026-11-04";

export const PRIVACY_OPERATOR = "호서대학교 취업팀";
export const PRIVACY_OFFICER = { name: "양정환", phone: "010-3830-5972" };

/** 보관 기간: 마지막 이용(로그인) 후 1년. 탈퇴를 요청하면 그때 바로 파기합니다. */
export const RETENTION_TEXT = "마지막 이용일로부터 1년 (탈퇴를 요청하면 지체 없이 파기)";

export const PRIVACY_PATH = "/privacy";

/** 가입 화면 동의 요약과 처리방침 본문이 같은 내용을 쓰도록 한곳에 둡니다. */
export const COLLECTED_ITEMS = [
  { who: "멘티(재학생)", items: "학과, 이름, 구분 문자(같은 이름이 있을 때), PIN" },
  { who: "멘토(기업 현직자)", items: "이름, 구분 문자(같은 이름이 있을 때), PIN, 기업명, 직무 분야, 멘토 페이지에 직접 쓴 소개·경력" },
  { who: "이용하면서 생기는 정보", items: "1:1 질문·답변 내용, 강의 자료와 수강 신청 기록, 만족도 조사 응답, (멘토) 질의응답 건수와 강사료 책정 기록" },
  { who: "자동으로 생기는 정보", items: "접속 IP 주소, 접속 일시, 브라우저 정보, 로그인 상태를 유지하는 쿠키" },
  { who: "알림을 켠 경우(선택)", items: "새 메시지 알림을 받을 브라우저의 수신 정보(알림 주소와 암호화 키). 알림을 끄거나 로그아웃하면 지웁니다" },
] as const;

export const PURPOSES =
  "회원 식별과 로그인, 단과대학별 멘토·멘티 연결, 1:1 질의응답과 강의 운영, 새 메시지 알림, 멘토 강사료 산정, 만족도 조사, 부정 이용 방지";
