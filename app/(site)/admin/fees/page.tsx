"use client";

import { useList, type HttpError } from "@refinedev/core";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SemesterSelect } from "@/features/admin/components/semester-select";
import { useSemesterPicker, useSemesterStats, type MentorStats } from "@/features/admin/components/semester-stats";
import { formatTime } from "@/lib/chat/answer-length";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";

type Fee = Tables<"fee_records">;

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

// 강사료 책정 (6.6 /admin/fees, 11장 3번): 건수는 자동 집계, 금액은 관리자가 입력합니다.
// 저장할 때의 질문·답변 수를 함께 남겨, 나중에 건수가 바뀌어도 책정 근거를 알 수 있게 합니다.
export default function AdminFeesPage() {
  const { semesters, semesterId, setSemesterId, semester } = useSemesterPicker();
  const { rows, error } = useSemesterStats(semesterId);
  const fees = useList<Fee, HttpError>({
    resource: "fee_records",
    pagination: { mode: "off" },
    filters: semesterId ? [{ field: "semester_id", operator: "eq", value: semesterId }] : [],
    queryOptions: { enabled: Boolean(semesterId) },
  });
  const feeByMentor = new Map(fees.result.data.map((f) => [f.mentor_id, f]));
  const total = fees.result.data.reduce((sum, f) => sum + f.amount, 0);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">강사료</h1>
      <SemesterSelect semesters={semesters} value={semesterId} onChange={setSemesterId} />
      {semester && !semester.closed_at && (
        <p className="text-sm text-muted-foreground">아직 진행 중인 학기라 건수가 더 늘 수 있습니다. 보통 학기를 종료한 뒤 책정합니다.</p>
      )}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <p className="text-sm">책정 완료 {fees.result.data.length}명 · 합계 <strong>{won(total)}</strong></p>

      <ul className="flex flex-col gap-3">
        {rows.length === 0 && (
          <li className="rounded-md border p-6 text-center text-muted-foreground">이 학기에 질의응답한 멘토가 없습니다.</li>
        )}
        {rows.map((row) => (
          <FeeRow
            key={`${semesterId}-${row.mentorId}`}
            semesterId={semesterId!}
            stats={row}
            fee={feeByMentor.get(row.mentorId)}
            onSaved={() => fees.query.refetch()}
          />
        ))}
      </ul>
    </section>
  );
}

function FeeRow({
  semesterId,
  stats,
  fee,
  onSaved,
}: {
  semesterId: number;
  stats: MentorStats;
  fee: Fee | undefined;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const changed = fee && (fee.question_count !== stats.questionCount || fee.answer_count !== stats.answerCount);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = Number(String(data.get("amount")).replace(/[,\s]/g, ""));
    if (!Number.isInteger(amount) || amount < 0) {
      setError("금액은 0 이상의 정수(원)로 입력해 주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error: upsertError } = await createClient()
      .from("fee_records")
      .upsert(
        {
          semester_id: semesterId,
          mentor_id: stats.mentorId,
          question_count: stats.questionCount,
          answer_count: stats.answerCount,
          amount,
          memo: String(data.get("memo") ?? "").trim() || null,
        },
        { onConflict: "semester_id,mentor_id" },
      );
    setSaving(false);
    if (upsertError) setError(upsertError.message);
    else onSaved();
  }

  return (
    <li className="flex flex-col gap-2 rounded-md border p-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-medium">{stats.name}</span>
        <span className="text-sm text-muted-foreground">{stats.company}</span>
        <span className="text-sm">
          톡방 {stats.roomCount} · 질문 {stats.questionCount} · 답변 {stats.answerCount}
        </span>
      </div>
      {fee && (
        <p className="text-sm">
          책정: <strong>{won(fee.amount)}</strong>
          <span className="text-muted-foreground">
            {" "}(질문 {fee.question_count} · 답변 {fee.answer_count} 기준, {formatTime(fee.decided_at)})
          </span>
          {changed && <span className="text-amber-700 dark:text-amber-400"> · 책정 뒤 건수가 바뀌었습니다</span>}
        </p>
      )}
      <form onSubmit={save} className="flex flex-col gap-2 sm:flex-row">
        <Input name="amount" inputMode="numeric" placeholder="금액 (원)" defaultValue={fee?.amount ?? ""} className="sm:w-40" aria-label={`${stats.name} 강사료`} required />
        <Input name="memo" placeholder="메모 (선택)" maxLength={1000} defaultValue={fee?.memo ?? ""} aria-label={`${stats.name} 메모`} />
        <Button type="submit" variant="outline" disabled={saving}>{fee ? "다시 책정" : "책정"}</Button>
      </form>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </li>
  );
}
