import { createClient } from "@/lib/supabase/server";

/** 내가 응답할 만족도 조사 (종료된 학기의 조사 기간 안, 그 학기 톡방이 있던 멘토마다) */
export async function listPendingSurveys() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_pending_surveys");
  return data ?? [];
}
