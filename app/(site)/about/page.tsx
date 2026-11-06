import { ArrowRight, Building2, MessageCircle, ShieldCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageBanner } from "@/components/page-banner";
import { Button } from "@/components/ui/button";
import { PRIVACY_OPERATOR } from "@/lib/privacy/policy";

export const metadata: Metadata = { title: "서비스 소개" };

const FEATURES = [
  {
    icon: Building2,
    title: "단과대학별 멘토",
    body: "AI공과대학, 바이오헬스대학, 아트앤컬처대학, 글로벌융합대학 구역마다 현직 멘토를 배치합니다.",
  },
  {
    icon: MessageCircle,
    title: "1:1 질문 톡방",
    body: "멘티와 멘토가 1:1 톡방에서 묻고 답합니다. 다른 학생에게는 대화가 보이지 않습니다.",
  },
  {
    icon: Users,
    title: "성의 있는 답변",
    body: "멘토 답변은 공백을 뺀 50자 이상이어야 보낼 수 있어, 짧은 답 대신 경험이 담긴 답을 받습니다.",
  },
  {
    icon: ShieldCheck,
    title: "학교가 관리",
    body: `${PRIVACY_OPERATOR}이 멘토를 확인해 구역에 배치하고 개설합니다. 개설된 멘토만 목록에 나옵니다.`,
  },
];

// 서비스 소개 (누구나 봄, 11장 32번)
export default function AboutPage() {
  return (
    <div className="flex flex-col gap-10 py-6">
      <PageBanner
        eyebrow="서비스 소개"
        title="호서대학교 멘토링"
        description="호서대학교 학생과 현직 선배·전문가를 단과대학별로 이어 주는 1:1 멘토링 서비스입니다. 진로·취업·직무에 관한 궁금한 점을 현직자에게 직접 물어보세요."
      />
      <ul className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <li key={feature.title} className="flex gap-4 rounded-xl border bg-card p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-accent text-brand">
              <feature.icon className="size-5" aria-hidden />
            </span>
            <span className="flex flex-col gap-1">
              <span className="font-semibold">{feature.title}</span>
              <span className="text-sm text-muted-foreground">{feature.body}</span>
            </span>
          </li>
        ))}
      </ul>
      <section className="flex flex-col gap-3 rounded-xl bg-accent p-5 sm:p-6">
        <h2 className="text-lg font-semibold">누가 쓰나요?</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="font-semibold text-brand">멘티 (학생)</dt>
            <dd className="text-foreground/80">멘토를 찾아 질문하고, 멘토가 연 강의를 신청합니다.</dd>
          </div>
          <div>
            <dt className="font-semibold text-brand">멘토 (현직자)</dt>
            <dd className="text-foreground/80">멘토 페이지를 꾸미고, 질문에 답하고, 강의를 엽니다.</dd>
          </div>
          <div>
            <dt className="font-semibold text-brand">관리자 ({PRIVACY_OPERATOR})</dt>
            <dd className="text-foreground/80">멘토를 구역에 배치·개설하고 운영 현황을 봅니다.</dd>
          </div>
        </dl>
      </section>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/mentors">
            멘토 찾기
            <ArrowRight aria-hidden />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/guide">이용 안내 보기</Link>
        </Button>
      </div>
    </div>
  );
}
