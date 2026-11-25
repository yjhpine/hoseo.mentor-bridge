import { createClient } from "@/lib/supabase/server";

/** 지금 내 캐릭터 번호 (고른 값, 없으면 null, 11장 38번). RLS가 본인 행만 돌려줍니다. */
export async function getMyMenteeCharacter(userId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("mentee_profiles").select("avatar_character").eq("id", userId).maybeSingle();
  return data?.avatar_character ?? null;
}
