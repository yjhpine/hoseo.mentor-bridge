import type { Metadata } from "next";
import Link from "next/link";
import { PageBanner } from "@/components/page-banner";
import { PRIVACY_OFFICER, PRIVACY_OPERATOR, PRIVACY_PATH } from "@/lib/privacy/policy";

export const metadata: Metadata = { title: "이용 안내" };

const FAQ = [
  {
    q: "PIN을 잊어버렸어요.",
    a: "관리자에게 임시 PIN을 요청하세요. 임시 PIN으로 로그인하면 새 PIN을 정하는 화면이 먼저 나옵니다.",
  },
  {
    q: "같은 학과에 이름이 같은 사람이 있다고 나와요.",
    a: "가입할 때 이름 뒤에 붙일 구분 문자(영문·숫자 1~3자)를 정합니다. 로그인할 때도 이름 뒤에 함께 씁니다. 예: 홍길동A",
  },
  {
    q: "로그인하지 않으면 무엇을 볼 수 있나요?",
    a: "메인, 서비스 소개, 이용 안내, 단과대학 구역과 멘토 카드, 강의 목록을 볼 수 있습니다. 멘토 상세, 질문, 수강 신청은 로그인한 뒤에 할 수 있습니다.",
  },
  {
    q: "멘토가 답을 너무 짧게 하면 어떡하죠?",
    a: "멘토 답변은 공백을 뺀 50자 이상이어야 보낼 수 있습니다. 화면과 서버 양쪽에서 확인합니다.",
  },
  {
    q: "답변 알림이 오지 않아요.",
    a: "마이페이지(멘토는 내 멘토 페이지)에서 알림을 켜세요. 켰는데도 오지 않으면 그 아래 안내에 따라 휴대폰·PC의 알림 설정과 브라우저 알림 허용을 확인하세요.",
  },
  {
    q: "앱처럼 쓰고 싶어요.",
    a: "마이페이지의 '앱으로 설치' 버튼을 누르거나, 아이폰은 Safari의 공유 → '홈 화면에 추가'로 설치할 수 있습니다.",
  },
];

// 이용 안내·자주 묻는 질문 (누구나 봄, 11장 32번)
export default function GuidePage() {
  return (
    <div className="flex flex-col gap-10 py-6">
      <PageBanner
        eyebrow="이용 안내"
        title="이용 안내 · 자주 묻는 질문"
        description="가입부터 질문, 답변 알림까지 순서대로 안내합니다."
      />

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">처음 쓰는 순서</h2>
        <ol className="flex flex-col gap-3">
          <Step n={1} title="회원가입">
            <Link href="/auth/sign-up" className="font-medium text-brand underline underline-offset-4">
              회원가입
            </Link>
            에서 소속(학과, 또는 멘토)과 이름을 입력하고 숫자 6자리 PIN을 정합니다. 이메일은 받지 않습니다. 멘토는
            기업명과 직무 분야도 입력하고, 관리자가 단과대학 구역에 배치하면 공개됩니다.
          </Step>
          <Step n={2} title="로그인">
            오른쪽 위 <strong>로그인</strong> 버튼을 누르고 소속·이름·PIN을 입력합니다. 같은 기기에서는 로그인이
            유지됩니다. 여러 사람이 쓰는 PC라면 다 쓴 뒤 로그아웃하세요.
          </Step>
          <Step n={3} title="멘토 찾기">
            <Link href="/mentors" className="font-medium text-brand underline underline-offset-4">
              멘토 찾기
            </Link>
            나 상단의 <strong>단과대학</strong> 메뉴에서 구역을 골라 멘토를 찾습니다. 직무 분야와 검색어로 좁힐 수
            있습니다.
          </Step>
          <Step n={4} title="질문하기">
            멘토 상세에서 <strong>질문하기</strong>를 누르면 그 멘토와의 1:1 톡방이 열립니다. 궁금한 점을 구체적으로
            쓸수록 좋은 답을 받습니다.
          </Step>
          <Step n={5} title="답변 받기·알림">
            멘토는 공백을 뺀 50자 이상으로 답합니다. 알림을 켜 두면 답변이 왔을 때 휴대폰·PC로 알려 드립니다.
          </Step>
        </ol>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">자주 묻는 질문</h2>
        <div className="flex flex-col divide-y rounded-xl border">
          {FAQ.map((item) => (
            <details key={item.q} className="group px-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 py-3 font-medium">
                <span>
                  <span className="mr-2 font-bold text-brand">Q.</span>
                  {item.q}
                </span>
                <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-180">
                  ▾
                </span>
              </summary>
              <p className="pb-4 text-sm text-foreground/80">
                <span className="mr-2 font-bold">A.</span>
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-xl bg-accent p-5">
        <h2 className="text-lg font-semibold">문의</h2>
        <p className="text-sm text-foreground/80">
          운영: {PRIVACY_OPERATOR} · 담당 {PRIVACY_OFFICER.name} ({PRIVACY_OFFICER.phone})
        </p>
        <p className="text-sm">
          <Link href={PRIVACY_PATH} className="font-medium underline underline-offset-4">
            개인정보 처리방침
          </Link>
        </p>
      </section>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4 rounded-xl border bg-card p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-foreground">
        {n}
      </span>
      <span className="flex flex-col gap-1">
        <span className="font-semibold">{title}</span>
        <span className="text-sm leading-relaxed text-foreground/80">{children}</span>
      </span>
    </li>
  );
}
