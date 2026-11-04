"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/features/auth/api/actions";
import { getCurrentUser } from "@/lib/auth/current-user";
import { AVATAR_BUCKET, avatarOwner } from "@/features/mentors/lib/avatar";
import { createClient } from "@/lib/supabase/server";

// DB mentor_profiles CHECK와 같은 길이 제한
const LIMITS = { headline: 100, intro: 5000, career: 5000 } as const;

function text(formData: FormData, name: keyof typeof LIMITS): string | null {
  const value = formData.get(name);
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed === "" ? null : trimmed;
}

/** 멘토 본인이 바꿀 수 있는 것: 대표 멘토링 분야, 소개, 경력, 질문 받기 (3.2). 나머지는 트리거가 막습니다. */
export async function updateMyMentorPage(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (user?.role !== "mentor") {
    return { error: "멘토만 바꿀 수 있습니다." };
  }

  const values = {
    headline: text(formData, "headline"),
    intro: text(formData, "intro"),
    career: text(formData, "career"),
    accepting_questions: formData.get("acceptingQuestions") === "on",
  };
  for (const key of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    if ((values[key]?.length ?? 0) > LIMITS[key]) {
      return { error: `${LABELS[key]}은(는) ${LIMITS[key]}자까지 쓸 수 있습니다.` };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("mentor_profiles")
    .update(values)
    .eq("id", user.id);
  if (error) {
    return { error: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath(`/mentors/${user.id}`);
  return { success: "저장했습니다." };
}

const LABELS = { headline: "대표 멘토링 분야", intro: "멘토 소개", career: "주요 경력" };

/**
 * 멘토 본인이 프로필 사진을 바꾸거나 지웁니다 (11장 18번).
 * 사진 파일은 브라우저가 줄여서 Storage에 먼저 올리고, 여기서는 경로만 저장한 뒤 예전 파일을 지웁니다.
 * path가 null이면 사진을 지우고 기본 이미지로 돌아갑니다. 경로 모양과 주인은 DB 제약과 Storage 정책도 다시 확인합니다.
 */
export async function setMyMentorPhoto(path: string | null): Promise<FormState> {
  const user = await getCurrentUser();
  if (user?.role !== "mentor") {
    return { error: "멘토만 바꿀 수 있습니다." };
  }
  if (path !== null && avatarOwner(path) !== user.id) {
    return { error: "사진을 저장하지 못했습니다. 다시 올려 주세요." };
  }

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("mentor_profiles")
    .select("photo_path")
    .eq("id", user.id)
    .maybeSingle();
  const { error } = await supabase
    .from("mentor_profiles")
    .update({ photo_path: path })
    .eq("id", user.id);
  if (error) {
    if (path) await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    return { error: "사진을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  if (before?.photo_path && before.photo_path !== path) {
    await supabase.storage.from(AVATAR_BUCKET).remove([before.photo_path]);
  }

  revalidatePath("/mentor");
  revalidatePath(`/mentors/${user.id}`);
  revalidatePath("/mentors");
  revalidatePath("/");
  return { success: path ? "사진을 바꿨습니다." : "사진을 지웠습니다. 기본 이미지가 보입니다." };
}
