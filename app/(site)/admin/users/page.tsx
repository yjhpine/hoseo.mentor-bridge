import type { Metadata } from "next";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CreateAdminForm,
  ResetPinButton,
} from "@/features/admin/components/user-actions";
import { ROLE_LABELS, displayName, requireRole } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "사용자 관리" };

// 1단계의 최소 관리자 화면입니다. 2단계에서 refine 관리자 화면으로 옮기면서
// 이름·소속 변경(admin-users의 update_identity)도 붙입니다.
export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
      <AdminUsers />
    </Suspense>
  );
}

const MENTOR_STATUS_LABELS = {
  pending: "개설 대기",
  published: "공개",
  hidden: "비공개",
} as const;

async function AdminUsers() {
  const me = await requireRole("admin");

  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select(
      "id, role, name, name_tag, must_change_pin, created_at, mentee_profiles(departments(name)), mentor_profiles(company, status)",
    )
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6 py-6">
      <h1 className="text-2xl font-semibold">사용자 관리</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">관리자 계정 만들기</CardTitle>
          <CardDescription>
            임시 PIN이 정해지고, 새 관리자는 처음 로그인할 때 PIN을 바꿉니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateAdminForm />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">사용자 {users?.length ?? 0}명</h2>
        <p className="text-sm text-muted-foreground">
          PIN을 잊은 사용자는 여기서 임시 PIN으로 초기화합니다. 임시 PIN은 화면에 한 번만 보입니다.
        </p>
        <ul className="divide-y rounded-md border">
          {(users ?? []).map((user) => {
            const affiliation =
              user.role === "mentee"
                ? user.mentee_profiles?.departments?.name
                : user.role === "mentor"
                  ? user.mentor_profiles?.company
                  : null;
            return (
              <li
                key={user.id}
                className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {displayName({ name: user.name, nameTag: user.name_tag })}
                  </span>
                  <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
                  {affiliation && (
                    <span className="text-sm text-muted-foreground">{affiliation}</span>
                  )}
                  {user.mentor_profiles && (
                    <Badge variant="outline">
                      {MENTOR_STATUS_LABELS[user.mentor_profiles.status]}
                    </Badge>
                  )}
                  {user.must_change_pin && <Badge variant="outline">임시 PIN</Badge>}
                </div>
                {user.id !== me.id && (
                  <ResetPinButton
                    userId={user.id}
                    name={displayName({ name: user.name, nameTag: user.name_tag })}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
