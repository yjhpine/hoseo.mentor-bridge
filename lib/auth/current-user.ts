import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database.types";

export type UserRole = Enums<"user_role">;

export type CurrentUser = {
  id: string;
  role: UserRole;
  name: string;
  nameTag: string | null;
  mustChangePin: boolean;
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "관리자",
  mentor: "멘토",
  mentee: "멘티",
};

/** 로그인한 사용자의 프로필. 한 요청 안에서는 한 번만 조회합니다. 세션을 읽으므로 Suspense 안에서 부릅니다. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, name, name_tag, must_change_pin")
    .eq("id", id)
    .maybeSingle();
  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    role: profile.role,
    name: profile.name,
    nameTag: profile.name_tag,
    mustChangePin: profile.must_change_pin,
  };
});

/** 화면과 로그인에 쓰는 이름. 동명이인 구분 문자를 이름 뒤에 붙입니다 (예: 홍길동A). */
export function displayName(user: Pick<CurrentUser, "name" | "nameTag">) {
  return user.name + (user.nameTag ?? "");
}

/** 역할이 맞지 않으면 "페이지를 찾을 수 없음"을 보여 줍니다. 최종 판단은 RLS와 admin-users가 다시 합니다. */
export async function requireRole(role: UserRole): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (user?.role !== role) {
    notFound();
  }
  return user;
}
