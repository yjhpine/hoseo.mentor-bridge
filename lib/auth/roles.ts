import type { Enums } from "@/types/database.types";

export type UserRole = Enums<"user_role">;

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "관리자",
  mentor: "멘토",
  mentee: "멘티",
};
