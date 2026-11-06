import Link from "next/link";
import {
  COLLECTED_ITEMS,
  MENTOR_PUBLIC_TEXT,
  PRIVACY_PATH,
  PURPOSES,
  RETENTION_TEXT,
} from "@/lib/privacy/policy";

// 가입 화면의 개인정보 수집·이용 동의 (docs/architecture.md 6.7).
// 법에서 알리라고 정한 네 가지(항목, 목적, 보유 기간, 거부할 권리와 불이익)를 보여 주고 체크를 받습니다.
export function PrivacyConsent({ isMentor, defaultChecked }: { isMentor: boolean; defaultChecked?: boolean }) {
  const mine = COLLECTED_ITEMS[isMentor ? 1 : 0];
  return (
    <div className="flex flex-col gap-3 rounded-md border p-3 text-xs">
      <p className="text-sm font-medium">개인정보 수집·이용 동의 (필수)</p>
      <dl className="grid grid-cols-[4.5rem_1fr] gap-x-2 gap-y-1.5">
        <dt className="text-muted-foreground">수집 항목</dt>
        <dd>
          {mine.items}. 이용하면서 질문·답변, 강의·수강 기록, 만족도 응답, 접속 기록이 생깁니다.
        </dd>
        <dt className="text-muted-foreground">이용 목적</dt>
        <dd>{PURPOSES}</dd>
        <dt className="text-muted-foreground">보유 기간</dt>
        <dd>{RETENTION_TEXT}</dd>
        {isMentor && (
          <>
            <dt className="text-muted-foreground">공개 범위</dt>
            <dd>{MENTOR_PUBLIC_TEXT}</dd>
          </>
        )}
      </dl>
      <p className="text-muted-foreground">
        동의하지 않을 수 있지만, 그러면 가입할 수 없습니다. 자세한 내용은{" "}
        <Link href={PRIVACY_PATH} target="_blank" className="text-foreground underline underline-offset-4">
          개인정보 처리방침
        </Link>
        에 있습니다.
      </p>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="privacyConsent"
          value="yes"
          required
          defaultChecked={defaultChecked}
          className="size-5 shrink-0"
        />
        위 내용을 읽었고 동의합니다.
      </label>
    </div>
  );
}
