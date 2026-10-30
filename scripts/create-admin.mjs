// 첫 관리자 계정을 만듭니다 (docs/architecture.md 6.1). 운영자 PC에서 한 번 실행합니다.
// 두 번째 관리자부터는 관리자 화면(/admin/users)에서 만듭니다.
//
//   node --env-file=.env.local scripts/create-admin.mjs
//
// secret 키(sb_secret_...)는 실행할 때 입력받고 어디에도 저장하지 않습니다.
// Supabase 대시보드 > Project Settings > API Keys에서 복사합니다.
// 환경 변수 SUPABASE_SECRET_KEY로 넘겨도 됩니다.

import { createInterface } from "node:readline/promises";
import { stdin, stdout, exit } from "node:process";
import { createClient } from "@supabase/supabase-js";

// lib/auth/login-key.ts, DB profiles CHECK와 같은 규칙
const PIN_PATTERN = /^\d{6}$/;
const NAME_PATTERN = /^[가-힣A-Za-z]+( [가-힣A-Za-z]+)*$/;
const NAME_TAG_PATTERN = /^[A-Za-z0-9]{1,3}$/;

const rl = createInterface({ input: stdin, output: stdout, terminal: true });

/** 입력한 글자를 화면에 보이지 않게 받습니다 (PIN, secret 키). */
async function askHidden(question) {
  const write = rl._writeToOutput;
  rl._writeToOutput = (text) => {
    if (text.startsWith(question)) write.call(rl, question);
  };
  const answer = await rl.question(question);
  rl._writeToOutput = write;
  stdout.write("\n");
  return answer.trim();
}

function fail(message) {
  console.error(`\n${message}`);
  rl.close();
  exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url) {
  fail("NEXT_PUBLIC_SUPABASE_URL이 없습니다. node --env-file=.env.local scripts/create-admin.mjs 로 실행하세요.");
}

const secretKey = process.env.SUPABASE_SECRET_KEY || (await askHidden("secret 키 (sb_secret_...): "));
if (!secretKey.startsWith("sb_secret_")) {
  fail("secret 키는 sb_secret_ 로 시작합니다.");
}

const supabase = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { count, error: countError } = await supabase
  .from("profiles")
  .select("id", { count: "exact", head: true })
  .eq("role", "admin");
if (countError) {
  fail(
    `Supabase에 연결하지 못했습니다 (${countError.code || countError.message || "알 수 없는 오류"}). ` +
      "secret 키와 .env.local의 NEXT_PUBLIC_SUPABASE_URL이 맞는지 확인하세요.",
  );
}
if (count > 0) {
  console.log(`이미 관리자가 ${count}명 있습니다. 보통은 관리자 화면(/admin/users)에서 만듭니다.`);
  const go = (await rl.question("그래도 계속할까요? (y/N) ")).trim().toLowerCase();
  if (go !== "y") fail("그만둡니다.");
}

const name = (await rl.question("관리자 이름: ")).normalize("NFC").trim().replace(/\s+/g, " ");
if (name.length > 30 || !NAME_PATTERN.test(name)) {
  fail("이름은 한글이나 영문으로 30자까지입니다.");
}
const nameTag = (await rl.question("구분 문자 (동명이인일 때만, 없으면 Enter): ")).trim();
if (nameTag && !NAME_TAG_PATTERN.test(nameTag)) {
  fail("구분 문자는 영문이나 숫자 1~3자입니다.");
}

const pin = await askHidden("PIN (숫자 6자리): ");
if (!PIN_PATTERN.test(pin)) fail("PIN은 숫자 6자리입니다.");
if ((await askHidden("PIN 확인: ")) !== pin) fail("PIN 확인이 맞지 않습니다.");

// 로그인 키(가상 이메일)는 DB 함수로 계산해 앱과 같은 값을 씁니다.
const { data: loginName, error: e1 } = await supabase.rpc("normalize_login_name", {
  raw: name + nameTag,
});
if (e1) fail(`로그인 키를 계산하지 못했습니다: ${e1.message}`);
const { data: email, error: e2 } = await supabase.rpc("login_email", {
  login_group: "admin",
  login_name: loginName,
});
if (e2) fail(`로그인 키를 계산하지 못했습니다: ${e2.message}`);

// 가입 트리거는 secret 키로 넣은 허가(admin_invites)가 있는 이메일만 관리자로 만들고 허가를 지웁니다.
const { error: e3 } = await supabase
  .from("admin_invites")
  .upsert({ email, created_at: new Date().toISOString() });
if (e3) fail(`관리자 허가를 기록하지 못했습니다: ${e3.message}`);
const { error } = await supabase.auth.admin.createUser({
  email,
  password: pin,
  email_confirm: true,
  user_metadata: { login_group: "admin", name, name_tag: nameTag || null },
});
if (error) await supabase.from("admin_invites").delete().eq("email", email);
if (error?.code === "email_exists") {
  fail("같은 이름의 관리자가 이미 있습니다. 구분 문자를 붙여 다시 실행하세요.");
}
if (error) fail(`계정을 만들지 못했습니다: ${error.message}`);

console.log(`\n관리자 ${name}${nameTag} 계정을 만들었습니다.`);
console.log(`로그인 화면에서 소속 "관리자", 이름 "${name}${nameTag}", 방금 정한 PIN으로 로그인하세요.`);
rl.close();
