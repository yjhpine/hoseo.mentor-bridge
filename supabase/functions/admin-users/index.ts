// 관리자 계정 작업: PIN 초기화, 이름·소속 변경, 관리자 계정 생성 (docs/architecture.md 6.1)
// Supabase 관리자 API가 필요해 secret 키를 쓰는 유일한 곳입니다. 호출한 사람이 관리자인지 먼저 확인합니다.
// 새 API 키는 플랫폼의 verify_jwt 검사를 쓸 수 없어 verify_jwt = false로 두고 여기서 직접 확인합니다.
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")!)["default"],
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// lib/auth/login-key.ts, DB profiles CHECK와 같은 규칙
const PIN_PATTERN = /^\d{6}$/;
const NAME_PATTERN = /^[가-힣A-Za-z]+( [가-힣A-Za-z]+)*$/;
const NAME_TAG_PATTERN = /^[A-Za-z0-9]{1,3}$/;
const NAME_MAX_LENGTH = 30;

type Body =
  | { action: "reset_pin"; user_id: string; temp_pin: string }
  | {
    action: "update_identity";
    user_id: string;
    name: string;
    name_tag?: string | null;
    /** 멘티만. 멘토·관리자는 소속이 바뀌지 않습니다. */
    department_id?: number;
  }
  | { action: "create_admin"; name: string; name_tag?: string | null; temp_pin: string };

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function cleanName(raw: unknown): string {
  const name = typeof raw === "string" ? raw.normalize("NFC").trim().replace(/\s+/g, " ") : "";
  if (name.length > NAME_MAX_LENGTH || !NAME_PATTERN.test(name)) {
    throw new HttpError(400, "이름은 한글이나 영문으로 30자까지입니다.");
  }
  return name;
}

function cleanTag(raw: unknown): string | null {
  const tag = typeof raw === "string" ? raw.trim() : "";
  if (tag === "") return null;
  if (!NAME_TAG_PATTERN.test(tag)) {
    throw new HttpError(400, "구분 문자는 영문이나 숫자 1~3자입니다.");
  }
  return tag;
}

function checkPin(pin: unknown): string {
  if (typeof pin !== "string" || !PIN_PATTERN.test(pin)) {
    throw new HttpError(400, "PIN은 숫자 6자리입니다.");
  }
  return pin;
}

/** 로그인 키 계산은 DB 함수에 맡깁니다. 앱(lib/auth/login-key.ts)과 같은 결과를 냅니다. */
async function loginKey(loginGroup: string, nameWithTag: string) {
  const { data: loginName, error: e1 } = await admin.rpc("normalize_login_name", {
    raw: nameWithTag,
  });
  if (e1 || typeof loginName !== "string") throw e1 ?? new Error("normalize_login_name");
  const { data: email, error: e2 } = await admin.rpc("login_email", {
    login_group: loginGroup,
    login_name: loginName,
  });
  if (e2 || typeof email !== "string") throw e2 ?? new Error("login_email");
  return { loginName, email };
}

async function getProfile(userId: unknown) {
  if (typeof userId !== "string") throw new HttpError(400, "사용자를 지정해야 합니다.");
  const { data, error } = await admin
    .from("profiles")
    .select("id, role, name, name_tag, login_group, login_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "없는 사용자입니다.");
  return data;
}

async function resetPin(callerId: string, body: Extract<Body, { action: "reset_pin" }>) {
  const target = await getProfile(body.user_id);
  if (target.id === callerId) {
    throw new HttpError(400, "내 PIN은 PIN 변경 화면에서 바꿉니다.");
  }
  const pin = checkPin(body.temp_pin);

  const { error } = await admin.auth.admin.updateUserById(target.id, { password: pin });
  if (error) throw error;

  // 다음 로그인 때 본인이 PIN을 바꾸게 합니다.
  const { error: e2 } = await admin
    .from("profiles")
    .update({ must_change_pin: true })
    .eq("id", target.id);
  if (e2) throw e2;
  return { ok: true };
}

async function updateIdentity(body: Extract<Body, { action: "update_identity" }>) {
  const target = await getProfile(body.user_id);
  const name = cleanName(body.name);
  const nameTag = cleanTag(body.name_tag);

  let loginGroup = target.login_group;
  let departmentId: number | null = null;
  if (target.role === "mentee") {
    departmentId = Number(body.department_id);
    if (!Number.isInteger(departmentId) || departmentId < 1) {
      throw new HttpError(400, "학과를 골라야 합니다.");
    }
    const { data: department } = await admin
      .from("departments")
      .select("id, colleges!inner(id)")
      .eq("id", departmentId)
      .eq("is_active", true)
      .eq("colleges.is_active", true)
      .maybeSingle();
    if (!department) throw new HttpError(400, "쓰고 있는 학과가 아닙니다.");
    loginGroup = `dept:${departmentId}`;
  }

  const { loginName, email } = await loginKey(loginGroup, name + (nameTag ?? ""));

  const { data: taken } = await admin
    .from("profiles")
    .select("id")
    .eq("login_group", loginGroup)
    .eq("login_name", loginName)
    .neq("id", target.id)
    .maybeSingle();
  if (taken) {
    throw new HttpError(409, "같은 소속에 같은 이름이 이미 있습니다. 구분 문자를 붙여 주세요.");
  }

  const { data: oldMentee } = await admin
    .from("mentee_profiles")
    .select("department_id")
    .eq("id", target.id)
    .maybeSingle();

  // auth.users의 이메일은 늘 profiles의 로그인 키와 맞아야 하므로(guard_login_email)
  // profiles를 먼저 고치고 이메일을 바꿉니다. 이메일을 못 바꾸면 되돌립니다.
  const { error: e1 } = await admin
    .from("profiles")
    .update({ name, name_tag: nameTag, login_group: loginGroup, login_name: loginName })
    .eq("id", target.id);
  if (e1) throw e1;
  if (departmentId !== null) {
    const { error } = await admin
      .from("mentee_profiles")
      .update({ department_id: departmentId })
      .eq("id", target.id);
    if (error) throw error;
  }

  const { error: e2 } = await admin.auth.admin.updateUserById(target.id, {
    email,
    email_confirm: true,
  });
  if (e2) {
    await admin
      .from("profiles")
      .update({
        name: target.name,
        name_tag: target.name_tag,
        login_group: target.login_group,
        login_name: target.login_name,
      })
      .eq("id", target.id);
    if (oldMentee) {
      await admin
        .from("mentee_profiles")
        .update({ department_id: oldMentee.department_id })
        .eq("id", target.id);
    }
    throw e2;
  }
  return { ok: true };
}

async function createAdmin(body: Extract<Body, { action: "create_admin" }>) {
  const name = cleanName(body.name);
  const nameTag = cleanTag(body.name_tag);
  const pin = checkPin(body.temp_pin);
  const { email } = await loginKey("admin", name + (nameTag ?? ""));

  // 가입 트리거는 secret 키로 넣은 허가(admin_invites)가 있는 이메일만 관리자로 만들고 허가를 지웁니다.
  const { error: e1 } = await admin
    .from("admin_invites")
    .upsert({ email, created_at: new Date().toISOString() });
  if (e1) throw e1;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: pin,
    email_confirm: true,
    user_metadata: { login_group: "admin", name, name_tag: nameTag },
  });
  if (error) {
    await admin.from("admin_invites").delete().eq("email", email);
  }
  if (error?.code === "email_exists") {
    throw new HttpError(409, "같은 이름의 관리자가 이미 있습니다. 구분 문자를 붙여 주세요.");
  }
  if (error) throw error;

  const { error: e2 } = await admin
    .from("profiles")
    .update({ must_change_pin: true })
    .eq("id", data.user.id);
  if (e2) throw e2;
  return { ok: true, user_id: data.user.id };
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") throw new HttpError(405, "POST만 받습니다.");

    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) throw new HttpError(401, "로그인이 필요합니다.");
    const { data: auth } = await admin.auth.getUser(token);
    if (!auth.user) throw new HttpError(401, "로그인이 필요합니다.");
    const { data: caller } = await admin
      .from("profiles")
      .select("role")
      .eq("id", auth.user.id)
      .maybeSingle();
    if (caller?.role !== "admin") throw new HttpError(403, "관리자만 할 수 있습니다.");

    const body = (await req.json()) as Body;
    let result;
    switch (body.action) {
      case "reset_pin":
        result = await resetPin(auth.user.id, body);
        break;
      case "update_identity":
        result = await updateIdentity(body);
        break;
      case "create_admin":
        result = await createAdmin(body);
        break;
      default:
        throw new HttpError(400, "알 수 없는 작업입니다.");
    }
    return Response.json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return Response.json({ error: "처리하지 못했습니다." }, { status: 500 });
  }
});
