"use server";

import { FunctionsHttpError } from "@supabase/supabase-js";
import type { FormState } from "@/features/auth/api/actions";
import { cleanName } from "@/lib/auth/login-key";
import { createClient } from "@/lib/supabase/server";

// 관리자 계정 작업은 Edge Function admin-users가 secret 키로 처리합니다 (docs/architecture.md 6.1).
// 앱은 로그인한 관리자의 세션으로 부르기만 하고, 관리자인지는 함수가 다시 확인합니다.
async function callAdminUsers(body: Record<string, unknown>) {
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("admin-users", { body });
  if (error instanceof FunctionsHttpError) {
    const payload = await error.context.json().catch(() => null);
    return { error: (payload?.error as string) ?? "처리하지 못했습니다." };
  }
  if (error) {
    return { error: "관리자 기능에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  return { data };
}

/** 임시 PIN은 서버에서 무작위로 정해 관리자에게 한 번만 보여 줍니다. */
function randomPin(): string {
  const [n] = crypto.getRandomValues(new Uint32Array(1));
  return String(n % 1_000_000).padStart(6, "0");
}

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function resetPin(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const tempPin = randomPin();
  const result = await callAdminUsers({
    action: "reset_pin",
    user_id: field(formData, "userId"),
    temp_pin: tempPin,
  });
  if (result.error) {
    return { error: result.error };
  }
  return { success: `임시 PIN ${tempPin} — 본인에게 전해 주세요. 다음 로그인 때 새 PIN으로 바꾸게 됩니다.` };
}

export async function createAdmin(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = cleanName(field(formData, "name"));
  const nameTag = field(formData, "nameTag").trim();
  const tempPin = randomPin();
  const result = await callAdminUsers({
    action: "create_admin",
    name,
    name_tag: nameTag || null,
    temp_pin: tempPin,
  });
  if (result.error) {
    return { error: result.error, values: { name, nameTag } };
  }
  return {
    success: `관리자 ${name}${nameTag} 계정을 만들었습니다. 임시 PIN ${tempPin} — 소속 "관리자"로 로그인한 뒤 새 PIN으로 바꾸게 됩니다.`,
  };
}

/** 이름·구분 문자·(멘티면) 학과 변경. 로그인 키가 바뀌므로 admin-users가 가상 이메일도 함께 바꿉니다. */
export async function updateIdentity(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = cleanName(field(formData, "name"));
  const nameTag = field(formData, "nameTag").trim();
  const departmentId = field(formData, "departmentId");
  const result = await callAdminUsers({
    action: "update_identity",
    user_id: field(formData, "userId"),
    name,
    name_tag: nameTag || null,
    ...(departmentId ? { department_id: Number(departmentId) } : {}),
  });
  if (result.error) {
    return { error: result.error, values: { name, nameTag, departmentId } };
  }
  return {
    success: `${name}${nameTag}(으)로 바꿨습니다. 이제 이 이름${departmentId ? "과 학과" : ""}로 로그인합니다.`,
  };
}
