"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/features/auth/api/actions";
import { MENTEE_CHARACTERS } from "@/features/mentors/lib/characters";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

/**
 * 멘티가 평상복 캐릭터를 고릅니다 (11장 38번). 멘티는 평상복 6종 안에서만 고르고,
 * DB 함수 set_my_mentee_character가 번호(1~6)와 멘티 본인인지를 다시 확인합니다.
 */
export async function setMyMenteeCharacter(choice: number): Promise<FormState> {
  const user = await getCurrentUser();
  if (user?.role !== "mentee") {
    return { error: "멘티만 바꿀 수 있습니다." };
  }
  if (!Number.isInteger(choice) || choice < 1 || choice > MENTEE_CHARACTERS.length) {
    return { error: "캐릭터를 다시 골라 주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_my_mentee_character", { choice });
  if (error) {
    return { error: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/mypage");
  revalidatePath("/chats", "layout");
  return { success: `내 캐릭터를 ${MENTEE_CHARACTERS[choice - 1].name}(으)로 바꿨습니다.` };
}
