import type { Metadata } from "next";
import { BrandMark } from "@/components/brand-mark";
import {
  COLLECTED_ITEMS,
  PRIVACY_OFFICER,
  PRIVACY_OPERATOR,
  PRIVACY_POLICY_VERSION,
  PURPOSES,
  RETENTION_TEXT,
  MENTOR_PUBLIC_TEXT,
} from "@/lib/privacy/policy";

export const metadata: Metadata = { title: "개인정보 처리방침" };

const TRUSTEES = [
  {
    name: "Supabase Inc.(미국). 데이터는 서울 리전에 저장",
    work: "회원 정보·질의응답·강의 자료 저장, 로그인 처리",
    items: "2번의 모든 항목",
    period: "3번 보유 기간과 같음",
  },
  {
    name: "Cloudflare, Inc.(미국)",
    work: "웹사이트 전송, 자동 가입·로그인 방지(Turnstile)",
    items: "접속 IP 주소, 접속 일시, 브라우저 정보",
    period: "업체 정책에 따른 기간",
  },  {
    name: "브라우저 알림 서비스(이용자 브라우저에 따라 Google·Apple·Mozilla·Microsoft 등, 미국)",
    work: "알림을 켠 이용자에게 새 메시지 알림 전달. 알림 내용은 암호화되어 이 업체들은 읽을 수 없음",
    items: "알림 수신 주소, 암호화된 알림 내용",
    period: "전달할 때까지 (최대 1일)",
  },
];

// 개인정보 처리방침 (docs/architecture.md 6.7). 로그인하지 않아도 볼 수 있습니다 (lib/supabase/proxy.ts).
// 내용을 바꾸면 lib/privacy/policy.ts의 PRIVACY_POLICY_VERSION(시행일)을 올립니다.
export default function PrivacyPage() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-6 p-5 md:p-10">
      <div><BrandMark /></div>
      <article className="flex flex-col gap-6 text-sm leading-relaxed">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">개인정보 처리방침</h1>
          <p className="text-muted-foreground">
            {PRIVACY_OPERATOR}(이하 &quot;운영자&quot;)은 호서대학교 멘토링 서비스(이하 &quot;서비스&quot;)를
            운영하면서 「개인정보 보호법」에 따라 이용자의 개인정보를 아래와 같이 처리합니다.
          </p>
          <p className="text-muted-foreground">시행일: {PRIVACY_POLICY_VERSION}</p>
        </header>

        <Section title="1. 처리 목적">
          <p>{PURPOSES}. 이 목적 외에는 쓰지 않으며, 목적이 바뀌면 다시 동의를 받습니다.</p>
        </Section>

        <Section title="2. 처리하는 개인정보 항목">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="p-2">구분</th>
                  <th className="p-2">항목</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {COLLECTED_ITEMS.map((row) => (
                  <tr key={row.who}>
                    <td className="w-28 p-2 align-top font-medium sm:w-40">{row.who}</td>
                    <td className="p-2">{row.items}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            이메일·전화번호·학번은 받지 않습니다. PIN은 되돌릴 수 없는 방식(해시)으로 바꿔 저장하므로 운영자도 알 수
            없습니다.
          </p>
        </Section>

        <Section title="3. 보유 기간">
          <p>
            {RETENTION_TEXT}. 1년 동안 이용하지 않은 회원의 정보는 관리자가 확인한 뒤 파기합니다. 법령에서 따로 보관하도록
            정한 정보는 그 기간 동안 보관합니다.
          </p>
          <p>
            운영자가 학기 말에 내려받아 보관하는 백업 파일도 만든 날로부터 1년이 지나면 파기합니다.
          </p>
        </Section>

        <Section title="4. 파기 절차와 방법">
          <p>
            보유 기간이 지나거나 탈퇴를 요청하면 관리자가 계정을 지우고, 그 계정의 프로필·질문과 답변·강의와 수강
            기록·만족도 응답·동의 기록·올린 강의 파일을 함께 지웁니다. 전자 파일은 복구할 수 없는 방법으로 지우고, 종이
            문서는 분쇄하거나 소각합니다.
          </p>
        </Section>

        <Section title="5. 제3자 제공">
          <p>이용자의 개인정보를 제3자에게 제공하지 않습니다. 법령에 따른 요청이 있을 때만 예외로 합니다.</p>
          <p>
            다만 멘토 연결이라는 서비스 목적에 따라, {MENTOR_PUBLIC_TEXT} 멘토는 관리자에게 요청해 공개를 멈출 수
            있습니다.
          </p>
        </Section>

        <Section title="6. 처리 위탁과 국외 이전">
          <p>서비스를 운영하려고 아래 업체의 클라우드 서비스를 씁니다.</p>
          <ul className="flex flex-col gap-2">
            {TRUSTEES.map((t) => (
              <li key={t.name} className="rounded-md border p-3">
                <p className="font-medium">{t.name}</p>
                <dl className="mt-1 grid grid-cols-[4.5rem_1fr] gap-x-2 gap-y-1">
                  <dt className="text-muted-foreground">맡기는 일</dt>
                  <dd>{t.work}</dd>
                  <dt className="text-muted-foreground">항목</dt>
                  <dd>{t.items}</dd>
                  <dt className="text-muted-foreground">보유 기간</dt>
                  <dd>{t.period}</dd>
                </dl>
              </li>
            ))}
          </ul>
          <p>
            서비스를 이용할 때마다 인터넷으로 전송됩니다. 국외 이전을 원하지 않으면 가입하지 않거나 탈퇴를 요청할 수
            있으며, 이 경우 서비스를 이용할 수 없습니다.
          </p>
        </Section>

        <Section title="7. 이용자의 권리와 행사 방법">
          <p>
            이용자는 언제든지 자기 개인정보의 열람, 정정, 삭제, 처리 정지와 동의 철회(탈퇴)를 요청할 수 있습니다. 서비스
            화면에는 탈퇴 기능이 없으며, 아래 개인정보 보호책임자에게 연락하면 본인임을 확인한 뒤 지체 없이 처리합니다.
            이름과 멘토 소개는 서비스 화면에서 직접 고칠 수 있는 부분도 있습니다.
          </p>
        </Section>

        <Section title="8. 안전성 확보 조치">
          <ul className="list-disc space-y-1 pl-5">
            <li>PIN은 해시로 바꿔 저장하고, 모든 통신은 암호화(HTTPS)합니다.</li>
            <li>데이터마다 볼 수 있는 사람을 정해(멘티·멘토·관리자) 데이터베이스에서 접근을 제한합니다.</li>
            <li>관리자 기능은 지정된 관리자 계정만 쓸 수 있습니다.</li>
            <li>자동 가입·로그인 방지(CAPTCHA)와 요청 횟수 제한으로 무작위 대입을 막습니다.</li>
            <li>백업 파일은 암호를 건 저장 장치에 보관하고 접근할 사람을 정합니다.</li>
          </ul>
        </Section>

        <Section title="9. 쿠키">
          <p>
            로그인 상태를 유지하려고 쿠키를 씁니다. 브라우저 설정에서 쿠키를 막을 수 있지만, 그러면 로그인할 수 없습니다.
            화면 밝기(다크 모드) 설정은 이용자의 브라우저에만 저장됩니다.
          </p>
        </Section>

        <Section title="10. 개인정보 보호책임자">
          <p>
            {PRIVACY_OPERATOR} {PRIVACY_OFFICER.name} ·{" "}
            <a href={`tel:${PRIVACY_OFFICER.phone}`} className="underline underline-offset-4">
              {PRIVACY_OFFICER.phone}
            </a>
          </p>
          <p>개인정보에 관한 문의, 열람·정정·삭제와 탈퇴 요청은 위 연락처로 해 주세요.</p>
        </Section>

        <Section title="11. 권익 침해 구제">
          <ul className="list-disc space-y-1 pl-5">
            <li>개인정보침해 신고센터 (privacy.kisa.or.kr / 국번 없이 118)</li>
            <li>개인정보 분쟁조정위원회 (www.kopico.go.kr / 1833-6972)</li>
            <li>대검찰청 (www.spo.go.kr / 국번 없이 1301)</li>
            <li>경찰청 (ecrm.police.go.kr / 국번 없이 182)</li>
          </ul>
        </Section>

        <Section title="12. 처리방침 변경">
          <p>
            이 처리방침은 {PRIVACY_POLICY_VERSION}부터 적용합니다. 내용이 바뀌면 시행 7일 전에 서비스 화면에 알립니다.
          </p>
        </Section>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}
