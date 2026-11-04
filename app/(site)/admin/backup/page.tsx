"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DeleteUserButton } from "@/features/admin/components/user-actions";
import { download, stamp, toCsv, type BackupData } from "@/features/admin/lib/backup-files";
import { formatTime } from "@/lib/chat/answer-length";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type InactiveMember = Database["public"]["Functions"]["inactive_members"]["Returns"][number];

const TABLE_LABELS: Record<string, string> = {
  auth_users: "로그인 계정(가입·마지막 로그인 시각)",
  app_settings: "설정",
  colleges: "단과대학 구역",
  departments: "학과",
  job_fields: "직무 분야",
  profiles: "회원",
  mentee_profiles: "멘티",
  mentor_profiles: "멘토",
  privacy_consents: "개인정보 동의 기록",
  semesters: "학기",
  chat_rooms: "톡방",
  messages: "메시지",
  room_reads: "읽음 표시",
  courses: "강의",
  lessons: "강의 차시",
  enrollments: "수강 신청",
  fee_rates: "강사료 단가",
  fee_records: "강사료",
  survey_responses: "만족도 응답",
};

// 백업과 보관 기간 관리 (docs/architecture.md 6.7, docs/backup.md).
// 백업은 DB 함수 admin_backup()이 관리자에게만 전체 데이터를 JSON으로 돌려줍니다.
export default function AdminBackupPage() {
  const [backup, setBackup] = useState<BackupData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inactive, setInactive] = useState<InactiveMember[] | null>(null);

  const loadInactive = () =>
    createClient()
      .rpc("inactive_members")
      .then(({ data, error: e }) => {
        if (e) setError(e.message);
        else setInactive(data ?? []);
      });
  useEffect(() => {
    loadInactive();
  }, []);

  async function runBackup() {
    setBusy(true);
    setError(null);
    const { data, error: e } = await createClient().rpc("admin_backup");
    setBusy(false);
    if (e || !data) {
      setError(e?.message ?? "백업을 받지 못했습니다.");
      return;
    }
    const result = data as unknown as BackupData;
    setBackup(result);
    download(`hoseo-mentor-backup-${stamp()}.json`, JSON.stringify(result, null, 2), "application/json");
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">백업</h1>

      <div className="flex flex-col gap-3 rounded-md border p-4">
        <h2 className="font-medium">전체 백업</h2>
        <p className="text-sm text-muted-foreground">
          모든 데이터를 JSON 파일 하나로 내려받습니다. 학기를 종료한 뒤, 그리고 회원을 탈퇴 처리하기 전에 받아 두세요.
          PIN과 강의 파일은 들어가지 않습니다. 파일에 개인정보가 있으므로 암호를 건 저장 장치에 보관하고, 만든 날로부터 1년이
          지나면 지웁니다.
        </p>
        <Button onClick={runBackup} disabled={busy} className="self-start">
          {busy ? "백업을 만드는 중…" : "전체 백업 받기 (JSON)"}
        </Button>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {backup && (
          <div className="flex flex-col gap-2">
            <p className="text-sm">
              {formatTime(backup.exported_at)} 기준 백업을 받았습니다. 엑셀로 볼 표는 아래에서 따로 받을 수 있습니다.
            </p>
            <ul className="divide-y rounded-md border text-sm">
              {Object.entries(backup.tables).map(([table, rows]) => (
                <li key={table} className="flex items-center gap-2 p-2">
                  <span className="flex-1">
                    {TABLE_LABELS[table] ?? table} <span className="text-xs text-muted-foreground">{table}</span>
                  </span>
                  <span className="text-muted-foreground">{rows.length}행</span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={rows.length === 0}
                    onClick={() =>
                      download(`hoseo-mentor-${table}-${stamp(new Date(backup.exported_at))}.csv`, toCsv(rows), "text/csv;charset=utf-8")
                    }
                  >
                    CSV
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-md border p-4">
        <h2 className="font-medium">보관 기간이 지난 회원</h2>
        <p className="text-sm text-muted-foreground">
          마지막 이용(로그인·접속)으로부터 1년이 지난 멘티·멘토입니다. 개인정보 처리방침에 따라 백업을 받은 뒤 탈퇴 처리합니다.
        </p>
        {inactive === null ? (
          <p className="text-sm text-muted-foreground">불러오는 중…</p>
        ) : inactive.length === 0 ? (
          <p className="rounded-md bg-muted p-4 text-center text-sm text-muted-foreground">지금은 없습니다.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {inactive.map((member) => {
              const name = member.name + (member.name_tag ?? "");
              return (
                <li key={member.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                  <span className="flex-1 text-sm">
                    <span className="font-medium">{name}</span> · {ROLE_LABELS[member.role]}
                    <span className="block text-xs text-muted-foreground">
                      마지막 이용 {formatTime(member.last_used_at)} · 가입 {formatTime(member.created_at)}
                    </span>
                  </span>
                  <DeleteUserButton userId={member.id} name={name} onDone={loadInactive} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
