"use client";

import { useList, type HttpError } from "@refinedev/core";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSave } from "@/features/admin/components/use-save";
import { formatTime } from "@/lib/chat/answer-length";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database.types";

type Issue = Tables<"issue_reports">;
type Kind = "report" | "error";
type Status = "new" | "done";

const KIND_LABELS: Record<Kind, string> = { report: "사용자 신고", error: "자동 오류" };
const STATUS_LABELS: Record<Status, string> = { new: "새로 들어옴", done: "처리 완료" };
const SOURCE_LABELS: Record<string, string> = { client: "화면", server: "서버", user: "사용자" };

// 오류·신고 (docs/architecture.md 11장 34번). 자동으로 모인 오류와 사용자가 보낸 "문제 알리기"를 보고 처리 완료로 표시합니다.
// 기록은 90일이 지나면 지워집니다.
export default function AdminIssuesPage() {
  const [kind, setKind] = useState<Kind>("report");
  const [status, setStatus] = useState<Status>("new");
  const list = useList<Issue, HttpError>({
    resource: "issue_reports",
    pagination: { currentPage: 1, pageSize: 100 },
    filters: [
      { field: "kind", operator: "eq", value: kind },
      { field: "status", operator: "eq", value: status },
    ],
    sorters: [{ field: "last_seen", order: "desc" }],
  });
  const profiles = useList<Tables<"profiles">, HttpError>({
    resource: "profiles",
    pagination: { mode: "off" },
    queryOptions: { enabled: kind === "report" },
  });
  const nameById = new Map(profiles.result.data.map((p) => [p.id, p.name + (p.name_tag ?? "")]));
  const save = useSave(() => list.query.refetch());
  const issues = list.result.data;

  const mark = (issue: Issue, next: Status) =>
    save.update("issue_reports", issue.id, {
      status: next,
      resolved_at: next === "done" ? new Date().toISOString() : null,
    });

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">오류·신고</h1>
      <p className="text-sm text-muted-foreground">
        사용자가 보낸 &quot;문제 알리기&quot;와 화면·서버에서 자동으로 모인 오류입니다. 같은 오류는 한 줄로 묶어 횟수를
        셉니다. 고쳤으면 처리 완료로 표시하세요. 기록은 90일이 지나면 지워집니다.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="종류" className="flex rounded-md border p-0.5">
          {(Object.keys(KIND_LABELS) as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                "h-9 rounded px-3 text-sm",
                kind === k ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {KIND_LABELS[k]}
            </button>
          ))}
        </div>
        <div role="tablist" aria-label="처리 상태" className="flex rounded-md border p-0.5">
          {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={status === s}
              onClick={() => setStatus(s)}
              className={cn(
                "h-9 rounded px-3 text-sm",
                status === s ? "bg-secondary font-medium text-secondary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <span className="text-sm text-muted-foreground">{issues.length}건</span>
      </div>

      {save.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {save.error}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {!list.query.isLoading && issues.length === 0 && (
          <li className="rounded-md border p-6 text-center text-muted-foreground">
            {status === "new" ? "새로 들어온 것이 없습니다." : "처리 완료한 것이 없습니다."}
          </li>
        )}
        {issues.map((issue) => {
          const [firstLine, ...rest] = issue.message.split("\n");
          return (
            <li key={issue.id} className="flex flex-col gap-2 rounded-md border p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">{SOURCE_LABELS[issue.source] ?? issue.source}</Badge>
                {issue.occurrences > 1 && <Badge variant="secondary">{issue.occurrences}회</Badge>}
                <span className="text-muted-foreground">
                  {formatTime(issue.last_seen)}
                  {issue.occurrences > 1 && ` (처음 ${formatTime(issue.first_seen)})`}
                </span>
                {issue.kind === "report" && (
                  <span className="font-medium">{issue.user_id ? nameById.get(issue.user_id) ?? "사용자" : "탈퇴한 사용자"}</span>
                )}
                <span className="ml-auto">
                  {issue.status === "new" ? (
                    <Button size="sm" onClick={() => mark(issue, "done")} disabled={save.pending}>
                      처리 완료
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => mark(issue, "new")} disabled={save.pending}>
                      다시 열기
                    </Button>
                  )}
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words">{issue.kind === "report" ? issue.message : firstLine}</p>
              {issue.path && <p className="break-all text-sm text-muted-foreground">화면: {issue.path}</p>}
              {(issue.detail || issue.user_agent || (issue.kind === "error" && rest.length > 0)) && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer py-1">자세히</summary>
                  <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2">
                    {[issue.kind === "error" ? rest.join("\n") : "", issue.detail, issue.user_agent && `브라우저: ${issue.user_agent}`]
                      .filter(Boolean)
                      .join("\n")}
                  </pre>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
