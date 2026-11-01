"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/features/auth/api/actions";
import { createClient } from "@/lib/supabase/server";

/** 만족도 응답. 응답 자격(조사 기간, 그 학기 톡방)은 DB 트리거가 다시 확인합니다 (6.5 4번). */
export async function submitSurvey(_prev: FormState, formData: FormData): Promise<FormState> {
  const semesterId = Number(formData.get("semesterId"));
  const mentorId = formData.get("mentorId");
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim();
  if (!Number.isInteger(semesterId) || typeof mentorId !== "string") return { error: "조사를 찾지 못했습니다." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "별점을 골라 주세요." };
  if (comment.length > 2000) return { error: "의견은 2000자까지입니다." };

  const supabase = await createClient();
  const { error } = await supabase.from("survey_responses").insert({
    semester_id: semesterId,
    mentor_id: mentorId,
    rating,
    comment: comment || null,
  });
  if (error) {
    return { error: /duplicate key/i.test(error.message) ? "이미 응답했습니다." : error.message };
  }
  revalidatePath("/mypage");
  return { success: "응답해 주셔서 고맙습니다." };
}
