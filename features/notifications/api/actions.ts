"use server";

import { createClient } from "@/lib/supabase/server";

// 웹 푸시 공개 키 (6.9). Edge Function push-notify가 VAPID 키를 갖고 있어 서버에서 대신 받아 옵니다.
// 브라우저에서 바로 부르면 다른 출처 요청(CORS) 설정이 필요해서 서버 액션을 거칩니다.
export async function getPushPublicKey(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke<{ publicKey?: string }>("push-notify", {
    body: { action: "public_key" },
  });
  if (error || !data?.publicKey) return null;
  return data.publicKey;
}
