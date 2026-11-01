"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/features/auth/api/actions";
import { createClient } from "@/lib/supabase/server";

/** 멘토 상세의 "질문하기": 이번 학기 톡방을 열거나 기존 방으로 갑니다 (3.3). 조건은 DB 함수가 확인합니다. */
export async function openChatRoom(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const mentorId = formData.get("mentorId");
  if (typeof mentorId !== "string") {
    return { error: "멘토를 찾지 못했습니다." };
  }

  const supabase = await createClient();
  const { data: roomId, error } = await supabase.rpc("open_chat_room", {
    mentor_id: mentorId,
  });
  if (error || !roomId) {
    // DB 함수의 안내 문구(학기 없음, 질문 마감 등)를 그대로 보여 줍니다.
    return { error: error?.message ?? "톡방을 열지 못했습니다." };
  }
  redirect(`/chats/${roomId}`);
}
