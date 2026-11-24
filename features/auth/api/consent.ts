"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/features/auth/api/actions";
import { PRIVACY_POLICY_VERSION } from "@/lib/privacy/policy";
import { createClient } from "@/lib/supabase/server";

/**
 * 첫 로그인 개인정보 동의 (11장 36번). 관리자가 대신 만든 멘토 계정은 가입 때 동의를 받지 못해 여기서 받습니다.
 * 동의하면 DB 함수가 동의 기록을 남기고, 자동 공개 설정인 멘토는 바로 공개합니다. 그다음 임시 PIN 변경으로 갑니다(proxy).
 */
export async function recordConsent(_prev: FormState, formData: FormData): Promise<FormState> {
  if (formData.get("privacyConsent") !== "yes") {
    return { error: "개인정보 수집·이용에 동의해야 이용할 수 있습니다." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_privacy_consent", { policy_version: PRIVACY_POLICY_VERSION });
  if (error) {
    return { error: "동의를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  redirect("/");
}
