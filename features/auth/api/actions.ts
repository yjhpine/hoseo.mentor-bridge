"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  cleanName,
  isValidName,
  isValidNameTag,
  isValidPin,
  loginEmail,
  normalizeLoginName,
  parseLoginGroup,
} from "@/lib/auth/login-key";

export type FormState = {
  error?: string;
  success?: string;
  /** 같은 소속에 같은 이름이 있어 구분 문자가 필요함 */
  needsTag?: boolean;
  /** 실패했을 때 다시 채워 줄 입력값 (PIN은 넣지 않음) */
  values?: Record<string, string>;
};

const RATE_LIMITED = "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function login(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const group = parseLoginGroup(field(formData, "group"));
  const name = field(formData, "name");
  const pin = field(formData, "pin");
  const values = { group: group ?? "", name };

  if (!group || !name.trim()) {
    return { error: "소속과 이름을 입력해 주세요.", values };
  }
  if (!isValidPin(pin)) {
    return { error: "PIN은 숫자 6자리입니다.", values };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: await loginEmail(group, normalizeLoginName(name)),
    password: pin,
  });
  if (error) {
    // 어느 값이 틀렸는지 알려 주지 않습니다 (6.1).
    return {
      error:
        error.status === 429
          ? RATE_LIMITED
          : "소속, 이름 또는 PIN이 맞지 않습니다.",
      values,
    };
  }

  // 임시 PIN이면 바로 PIN 변경 화면으로 보냅니다. 다른 화면으로 가려 해도 proxy가 다시 보냅니다.
  const { data: profile } = await supabase
    .from("profiles")
    .select("must_change_pin")
    .eq("id", data.user.id)
    .maybeSingle();
  redirect(profile?.must_change_pin ? "/account/pin" : "/");
}

export async function signUp(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const group = parseLoginGroup(field(formData, "group"));
  const name = cleanName(field(formData, "name"));
  const nameTag = field(formData, "nameTag").trim();
  const pin = field(formData, "pin");
  const pinConfirm = field(formData, "pinConfirm");
  const company = field(formData, "company").trim();
  const jobFieldId = field(formData, "jobFieldId");
  const values = { group: group ?? "", name, nameTag, company, jobFieldId };
  const needsTag = nameTag !== "";

  // 가입 화면으로는 관리자가 될 수 없습니다 (DB 트리거도 막음).
  if (!group || group === "admin") {
    return { error: "소속을 골라 주세요.", values, needsTag };
  }
  if (!isValidName(name)) {
    return {
      error: "이름은 한글이나 영문으로 30자까지 입력해 주세요.",
      values,
      needsTag,
    };
  }
  if (needsTag && !isValidNameTag(nameTag)) {
    return {
      error: "구분 문자는 영문이나 숫자 1~3자입니다.",
      values,
      needsTag,
    };
  }
  if (!isValidPin(pin)) {
    return { error: "PIN은 숫자 6자리로 정해 주세요.", values, needsTag };
  }
  if (pin !== pinConfirm) {
    return { error: "PIN 확인이 맞지 않습니다.", values, needsTag };
  }

  const isMentor = group === "mentor";
  if (isMentor && (company.length === 0 || company.length > 100)) {
    return { error: "기업명을 입력해 주세요.", values, needsTag };
  }
  if (isMentor && !/^[1-9][0-9]*$/.test(jobFieldId)) {
    return { error: "직무 분야를 골라 주세요.", values, needsTag };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: await loginEmail(group, normalizeLoginName(name + nameTag)),
    password: pin,
    options: {
      data: {
        login_group: group,
        name,
        name_tag: nameTag || null,
        ...(isMentor ? { company, job_field_id: Number(jobFieldId) } : {}),
      },
    },
  });

  if (error?.code === "user_already_exists") {
    return {
      error: needsTag
        ? "이 구분 문자도 이미 쓰이고 있습니다. 다른 구분 문자를 입력해 주세요."
        : "같은 소속에 같은 이름이 이미 있습니다. 이름 뒤에 붙일 구분 문자를 입력해 주세요.",
      values,
      needsTag: true,
    };
  }
  if (error) {
    return {
      error:
        error.status === 429
          ? RATE_LIMITED
          : "가입하지 못했습니다. 입력한 내용을 확인하고 다시 시도해 주세요.",
      values,
      needsTag,
    };
  }

  // 이메일 인증이 없으므로 가입 직후 바로 로그인됩니다.
  redirect("/");
}

export async function changePin(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const currentPin = field(formData, "currentPin");
  const newPin = field(formData, "newPin");
  const newPinConfirm = field(formData, "newPinConfirm");

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) {
    redirect("/auth/login");
  }

  if (!isValidPin(currentPin) || !isValidPin(newPin)) {
    return { error: "PIN은 숫자 6자리입니다." };
  }
  if (newPin !== newPinConfirm) {
    return { error: "새 PIN 확인이 맞지 않습니다." };
  }
  if (newPin === currentPin) {
    return { error: "지금 PIN과 다른 PIN을 정해 주세요." };
  }

  // Supabase의 "Require current password"가 켜져 있어 현재 PIN이 틀리면 거부됩니다.
  const { error } = await supabase.auth.updateUser({
    password: newPin,
    current_password: currentPin,
  });
  if (
    error?.code === "current_password_invalid" ||
    error?.code === "current_password_required"
  ) {
    return { error: "현재 PIN이 맞지 않습니다." };
  }
  if (error?.code === "same_password") {
    return { error: "지금 PIN과 다른 PIN을 정해 주세요." };
  }
  if (error) {
    return {
      error:
        error.status === 429
          ? RATE_LIMITED
          : "PIN을 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  await supabase
    .from("profiles")
    .update({ must_change_pin: false })
    .eq("id", userId);

  return { success: "PIN을 바꿨습니다. 다음 로그인부터 새 PIN을 쓰세요." };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
