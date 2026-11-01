"use client";

import { useList, type HttpError } from "@refinedev/core";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSave } from "@/features/admin/components/use-save";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";

type Semester = Tables<"semesters">;

// 학기 만들기, 현재 학기 지정, 학기 종료와 만족도 조사 열기 (6.5)
// 멘티는 현재 학기가 있어야 멘토에게 질문(톡방 열기)할 수 있습니다.
export default function AdminSemestersPage() {
  const list = useList<Semester, HttpError>({
    resource: "semesters",
    pagination: { mode: "off" },
    sorters: [{ field: "starts_on", order: "desc" }],
  });
  const save = useSave(() => list.query.refetch());
  const [error, setError] = useState<string | null>(null);
  const semesters = list.result.data;
  const current = semesters.find((s) => s.is_current);

  async function closeSemester(semester: Semester, closesOn: string) {
    if (!closesOn) return;
    if (!confirm(`${semester.name} 학기를 종료할까요? 그 학기 톡방은 읽기 전용이 되고, ${closesOn}까지 만족도 조사를 받습니다.`)) return;
    setError(null);
    const { error: rpcError } = await createClient().rpc("close_semester", {
      semester_id: semester.id,
      // 마감일 하루가 끝날 때까지(한국 시간) 받습니다.
      survey_closes_at: new Date(`${closesOn}T23:59:59+09:00`).toISOString(),
    });
    if (rpcError) setError(rpcError.message);
    list.query.refetch();
  }

  async function makeCurrent(id: number) {
    setError(null);
    const { error: rpcError } = await createClient().rpc("set_current_semester", { semester_id: id });
    if (rpcError) setError(rpcError.message);
    list.query.refetch();
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">학기</h1>
      <p className="text-sm text-muted-foreground">
        톡방은 학기마다 새로 열립니다. 멘티는 <strong>현재 학기</strong>가 있어야 질문할 수 있습니다.
        {current ? ` 지금 현재 학기는 ${current.name}입니다.` : " 아직 현재 학기가 없습니다."}
      </p>

      <form
        className="grid gap-3 rounded-md border p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          const ok = await save.create("semesters", {
            name: String(data.get("name")).trim(),
            starts_on: String(data.get("startsOn")),
            ends_on: String(data.get("endsOn")),
          });
          if (ok) form.reset();
        }}
      >
        <div className="grid gap-1">
          <Label htmlFor="semester-name">학기 이름</Label>
          <Input id="semester-name" name="name" placeholder="예: 2026-2" maxLength={30} required />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="semester-start">시작일</Label>
          <Input id="semester-start" name="startsOn" type="date" required />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="semester-end">종료일</Label>
          <Input id="semester-end" name="endsOn" type="date" required />
        </div>
        <Button type="submit" disabled={save.pending}>학기 만들기</Button>
      </form>
      {(save.error || error) && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">{save.error ?? error}</p>
      )}

      <ul className="divide-y rounded-md border">
        {semesters.length === 0 && !list.query.isLoading && (
          <li className="p-6 text-center text-muted-foreground">아직 학기가 없습니다.</li>
        )}
        {semesters.map((semester) => (
          <li key={semester.id} className="flex flex-wrap items-center gap-2 p-3">
            <span className="font-medium">{semester.name}</span>
            <span className="text-sm text-muted-foreground">
              {semester.starts_on} ~ {semester.ends_on}
            </span>
            {semester.is_current && <Badge>현재 학기</Badge>}
            {semester.closed_at && <Badge variant="secondary">종료</Badge>}
            {semester.closed_at && semester.survey_closes_at && (
              <span className="text-xs text-muted-foreground">
                만족도 조사 ~{new Date(semester.survey_closes_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
              </span>
            )}
            {!semester.is_current && !semester.closed_at && (
              <Button size="sm" variant="outline" className="ml-auto" onClick={() => makeCurrent(semester.id)}>
                현재 학기로 지정
              </Button>
            )}
            {!semester.closed_at && <CloseSemesterForm semester={semester} onClose={closeSemester} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 학기 종료: 만족도 조사 마감일을 정합니다. 기본은 2주 뒤입니다. */
function CloseSemesterForm({
  semester,
  onClose,
}: {
  semester: Semester;
  onClose: (semester: Semester, closesOn: string) => void;
}) {
  const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  return (
    <form
      className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto"
      onSubmit={(event) => {
        event.preventDefault();
        onClose(semester, String(new FormData(event.currentTarget).get("closesOn")));
      }}
    >
      <Label htmlFor={`closes-${semester.id}`} className="whitespace-nowrap text-xs text-muted-foreground">조사 마감</Label>
      <Input id={`closes-${semester.id}`} name="closesOn" type="date" defaultValue={twoWeeks} required className="w-40" />
      <Button type="submit" size="sm" variant="outline">학기 종료</Button>
    </form>
  );
}
