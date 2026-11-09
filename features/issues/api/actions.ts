"use server";

import { headers } from "next/headers";
import { safeNextPath } from "@/lib/auth/public-paths";
import { LIMITS, cleanPath, truncate } from "@/lib/errors/normalize";
import { createClient } from "@/lib/supabase/server";

export type ReportState = { error?: string; success?: string; values?: { message: string } };

/** "문제 알리기" 보내기 (11장 34번). 로그인 확인·길이·하루 10건 제한은 DB 함수 submit_issue_report()가 합니다. */
export async function submitIssueReport(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const raw = formData.get("message");
  const message = typeof raw === "string" ? raw.trim() : "";
  const from = formData.get("from");
  const values = { message };

  if (message.replace(/\s/g, "").length < 5) {
    return { error: "무엇을 하다가 어떤 문제가 생겼는지 5자 이상 적어 주세요.", values };
  }
  if (message.length > LIMITS.message) {
    return { error: `내용은 ${LIMITS.message}자까지 적을 수 있습니다.`, values };
  }

  const agent = (await headers()).get("user-agent");
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_issue_report", {
    message,
    path: cleanPath(safeNextPath(from) ?? ""),
    user_agent: truncate(agent, LIMITS.userAgent),
  });
  if (error) {
    return {
      error: /오늘은 더 보낼 수 없습니다|로그인한 사용자만/.test(error.message)
        ? error.message
        : "보내지 못했습니다. 잠시 후 다시 시도해 주세요.",
      values,
    };
  }
  return { success: "알려 주셔서 고맙습니다. 관리자가 확인한 뒤 고치겠습니다." };
}
