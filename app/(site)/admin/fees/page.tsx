"use client";

import { useList, type HttpError } from "@refinedev/core";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SemesterSelect } from "@/features/admin/components/semester-select";
import { useSemesterPicker, useSemesterStats, type MentorStats } from "@/features/admin/components/semester-stats";
import {
  calculateFee,
  isCapped,
  MAX_CAP,
  MAX_PER_ANSWER,
  parseWon,
  won,
  type FeeRate,
} from "@/features/admin/lib/fee";
import { formatTime } from "@/lib/chat/answer-length";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";

type Fee = Tables<"fee_records"> & { payer: { name: string } | null };
type RateRow = Tables<"fee_rates">;

// 강사료 책정 (6.6 /admin/fees, 11장 3·29~31번)
// - 학기마다 답변 1건당 단가와 상한(선택)을 정하면 멘토마다 계산 금액을 보여 주고 금액 칸에 미리 채웁니다.
// - 관리자가 확인하고 필요하면 고쳐서 책정합니다. 저장할 때의 질문·답변 수와 단가를 함께 남깁니다.
// - 지급하면 "지급 완료"로 지급 시각과 처리한 관리자를 남깁니다. 지급 완료 뒤에는 DB 트리거가 금액 수정을 막습니다.
export default function AdminFeesPage() {
  const { semesters, semesterId, setSemesterId, semester } = useSemesterPicker();
  const { rows, error } = useSemesterStats(semesterId);
  const enabled = Boolean(semesterId);
  const fees = useList<Fee, HttpError>({
    resource: "fee_records",
    pagination: { mode: "off" },
    filters: semesterId ? [{ field: "semester_id", operator: "eq", value: semesterId }] : [],
    meta: { select: "*, payer:profiles!fee_records_paid_by_fkey(name)" },
    queryOptions: { enabled },
  });
  const rates = useList<RateRow, HttpError>({
    resource: "fee_rates",
    pagination: { mode: "off" },
    filters: semesterId ? [{ field: "semester_id", operator: "eq", value: semesterId }] : [],
    queryOptions: { enabled },
  });
  const rateRow = rates.result.data[0];
  const rate: FeeRate | null = rateRow ? { perAnswer: rateRow.per_answer, cap: rateRow.cap } : null;

  const feeList = fees.result.data;
  const feeByMentor = new Map(feeList.map((f) => [f.mentor_id, f]));
  const sum = (list: Fee[]) => list.reduce((total, f) => total + f.amount, 0);
  const paid = feeList.filter((f) => f.paid_at);
  const unpaid = feeList.filter((f) => !f.paid_at);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">강사료</h1>
      <SemesterSelect semesters={semesters} value={semesterId} onChange={setSemesterId} />
      {semester && !semester.closed_at && (
        <p className="text-sm text-muted-foreground">아직 진행 중인 학기라 건수가 더 늘 수 있습니다. 보통 학기를 종료한 뒤 책정합니다.</p>
      )}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {semesterId && (
        <RateForm
          key={`${semesterId}-${rateRow?.updated_at ?? "none"}`}
          semesterId={semesterId}
          rate={rateRow}
          onSaved={() => rates.query.refetch()}
        />
      )}

      <dl className="grid grid-cols-1 gap-2 rounded-md border p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">책정</dt>
          <dd><strong>{feeList.length}명</strong> · {won(sum(feeList))}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">지급 완료</dt>
          <dd><strong>{paid.length}명</strong> · {won(sum(paid))}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">미지급</dt>
          <dd><strong>{unpaid.length}명</strong> · {won(sum(unpaid))}</dd>
        </div>
      </dl>

      <ul className="flex flex-col gap-3">
        {rows.length === 0 && (
          <li className="rounded-md border p-6 text-center text-muted-foreground">이 학기에 질의응답한 멘토가 없습니다.</li>
        )}
        {rows.map((row) => {
          const fee = feeByMentor.get(row.mentorId);
          return (
            <FeeRow
              key={`${semesterId}-${row.mentorId}-${fee?.amount ?? ""}-${fee?.paid_at ?? ""}-${rate?.perAnswer ?? ""}-${rate?.cap ?? ""}`}
              semesterId={semesterId!}
              stats={row}
              fee={fee}
              rate={rate}
              onSaved={() => fees.query.refetch()}
            />
          );
        })}
      </ul>
    </section>
  );
}

function RateForm({
  semesterId,
  rate,
  onSaved,
}: {
  semesterId: number;
  rate: RateRow | undefined;
  onSaved: () => void;
}) {
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const perAnswer = parseWon(String(data.get("perAnswer") ?? ""));
    const cap = parseWon(String(data.get("cap") ?? ""));
    if (perAnswer === null || Number.isNaN(perAnswer) || perAnswer > MAX_PER_ANSWER) {
      setMessage({ error: `답변 1건당 단가를 0~${won(MAX_PER_ANSWER)} 사이의 원 단위로 입력해 주세요.` });
      return;
    }
    if (cap !== null && (Number.isNaN(cap) || cap > MAX_CAP)) {
      setMessage({ error: `상한은 비워 두거나 0~${won(MAX_CAP)} 사이의 원 단위로 입력해 주세요.` });
      return;
    }
    setSaving(true);
    const { error } = await createClient()
      .from("fee_rates")
      .upsert(
        { semester_id: semesterId, per_answer: perAnswer, cap, updated_at: new Date().toISOString() },
        { onConflict: "semester_id" },
      );
    setSaving(false);
    if (error) setMessage({ error: error.message });
    else {
      setMessage({ success: "단가를 저장했습니다. 아래 멘토별 계산 금액이 바뀌었습니다." });
      onSaved();
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3 rounded-md border p-4">
      <div>
        <h2 className="font-semibold">이 학기 단가</h2>
        <p className="text-sm text-muted-foreground">
          계산 금액 = 답변 수 × 답변 1건당 단가 (상한이 있으면 상한까지). 답변은 질문마다 1건으로 셉니다. 멘토에게는 보이지 않습니다.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="grid gap-2">
          <Label htmlFor="fee-per-answer">답변 1건당 단가 (원)</Label>
          <Input id="fee-per-answer" name="perAnswer" inputMode="numeric" required defaultValue={rate?.per_answer ?? ""} className="sm:w-44" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="fee-cap">멘토 1명 상한 (원, 선택)</Label>
          <Input id="fee-cap" name="cap" inputMode="numeric" placeholder="비우면 상한 없음" defaultValue={rate?.cap ?? ""} className="sm:w-44" />
        </div>
        <Button type="submit" disabled={saving} className="sm:w-fit">{saving ? "저장 중…" : "단가 저장"}</Button>
      </div>
      {rate && (
        <p className="text-xs text-muted-foreground">마지막 저장 {formatTime(rate.updated_at)}</p>
      )}
      {message.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{message.error}</p>}
      {message.success && <p role="status" className="text-sm text-green-700 dark:text-green-400">{message.success}</p>}
    </form>
  );
}

function FeeRow({
  semesterId,
  stats,
  fee,
  rate,
  onSaved,
}: {
  semesterId: number;
  stats: MentorStats;
  fee: Fee | undefined;
  rate: FeeRate | null;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const changed = fee && (fee.question_count !== stats.questionCount || fee.answer_count !== stats.answerCount);
  const calculated = rate ? calculateFee(stats.answerCount, rate) : null;
  const isPaid = Boolean(fee?.paid_at);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = parseWon(String(data.get("amount") ?? ""));
    if (amount === null || Number.isNaN(amount)) {
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
          unit_price: rate?.perAnswer ?? null,
          memo: String(data.get("memo") ?? "").trim() || null,
        },
        { onConflict: "semester_id,mentor_id" },
      );
    setSaving(false);
    if (upsertError) setError(upsertError.message);
    else onSaved();
  }

  async function setPaid(paid: boolean) {
    if (!fee) return;
    const question = paid
      ? `${stats.name} 멘토의 강사료 ${won(fee.amount)}을 지급 완료로 표시할까요?\n지급 완료 뒤에는 금액을 고칠 수 없습니다.`
      : `${stats.name} 멘토의 지급 완료 표시를 취소할까요?`;
    if (!window.confirm(question)) return;
    setSaving(true);
    setError(null);
    const { error: updateError } = await createClient()
      .from("fee_records")
      .update({ paid_at: paid ? new Date().toISOString() : null })
      .eq("id", fee.id);
    setSaving(false);
    if (updateError) setError(updateError.message);
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
        {fee && (isPaid ? <Badge>지급 완료</Badge> : <Badge variant="secondary">미지급</Badge>)}
      </div>

      {rate && calculated !== null ? (
        <p className="text-sm">
          계산 금액: 답변 {stats.answerCount}건 × {won(rate.perAnswer)}
          {isCapped(stats.answerCount, rate) && ` → 상한 ${won(rate.cap!)} 적용`} = <strong>{won(calculated)}</strong>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">위에서 이 학기 단가를 저장하면 계산 금액이 나옵니다.</p>
      )}

      {fee && (
        <p className="text-sm">
          책정: <strong>{won(fee.amount)}</strong>
          <span className="text-muted-foreground">
            {" "}(질문 {fee.question_count} · 답변 {fee.answer_count}
            {fee.unit_price !== null && ` · 단가 ${won(fee.unit_price)}`} 기준, {formatTime(fee.decided_at)})
          </span>
          {changed && <span className="text-amber-700 dark:text-amber-400"> · 책정 뒤 건수가 바뀌었습니다</span>}
          {!changed && calculated !== null && calculated !== fee.amount && (
            <span className="text-muted-foreground"> · 계산 금액과 다르게 책정함</span>
          )}
        </p>
      )}

      {fee && isPaid && (
        <p className="text-sm text-green-700 dark:text-green-400">
          {formatTime(fee.paid_at!)} 지급 완료{fee.payer ? ` (처리: ${fee.payer.name})` : ""}. 금액을 고치려면 지급 취소 뒤 다시 책정하세요.
        </p>
      )}

      <form onSubmit={save} className="flex flex-col gap-2 sm:flex-row">
        <Input
          name="amount"
          inputMode="numeric"
          placeholder="금액 (원)"
          defaultValue={fee?.amount ?? calculated ?? ""}
          className="sm:w-40"
          aria-label={`${stats.name} 강사료`}
          required
          disabled={isPaid}
        />
        <Input
          name="memo"
          placeholder="메모 (선택)"
          maxLength={1000}
          defaultValue={fee?.memo ?? ""}
          aria-label={`${stats.name} 메모`}
          disabled={isPaid}
        />
        <Button type="submit" variant="outline" disabled={saving || isPaid}>{fee ? "다시 책정" : "책정"}</Button>
        {fee && (
          isPaid ? (
            <Button type="button" variant="ghost" disabled={saving} onClick={() => setPaid(false)}>지급 취소</Button>
          ) : (
            <Button type="button" disabled={saving} onClick={() => setPaid(true)}>지급 완료</Button>
          )
        )}
      </form>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </li>
  );
}
