"use client";

import { useList, type HttpError } from "@refinedev/core";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CreateAdminForm,
  IdentityForm,
  ResetPinButton,
} from "@/features/admin/components/user-actions";
import { ROLE_LABELS, type UserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";

type UserRow = Tables<"profiles"> & {
  mentee_profiles: { department_id: number; departments: { name: string } | null } | null;
  mentor_profiles: { company: string; status: Tables<"mentor_profiles">["status"] } | null;
};

const MENTOR_STATUS_LABELS = { pending: "개설 대기", published: "공개", hidden: "비공개" } as const;
const ROLE_TABS: (UserRole | "all")[] = ["all", "mentee", "mentor", "admin"];

// 사용자 목록, PIN 초기화, 이름·소속 변경, 관리자 만들기 (4.1 /admin/users).
// 계정 작업은 서버 액션이 Edge Function admin-users를 부릅니다.
export default function AdminUsersPage() {
  const [role, setRole] = useState<UserRole | "all">("all");
  const [myId, setMyId] = useState<string | null>(null);
  useEffect(() => {
    createClient()
      .auth.getClaims()
      .then(({ data }) => setMyId(data?.claims?.sub ?? null));
  }, []);

  const users = useList<UserRow, HttpError>({
    resource: "profiles",
    pagination: { mode: "off" },
    sorters: [{ field: "created_at", order: "desc" }],
    meta: {
      select:
        "*, mentee_profiles(department_id, departments(name)), mentor_profiles(company, status)",
    },
  });
  const colleges = useList<Tables<"colleges">, HttpError>({
    resource: "colleges",
    pagination: { mode: "off" },
    sorters: [{ field: "position", order: "asc" }],
  });
  const departments = useList<Tables<"departments">, HttpError>({
    resource: "departments",
    pagination: { mode: "off" },
    filters: [{ field: "is_active", operator: "eq", value: true }],
    sorters: [{ field: "position", order: "asc" }],
  });

  const collegeName = new Map(colleges.result.data.map((c) => [c.id, c.name]));
  const departmentOptions = departments.result.data.map((d) => ({
    id: d.id,
    label: `${collegeName.get(d.college_id) ?? ""} · ${d.name}`,
  }));
  const refetch = () => users.query.refetch();
  const all = users.result.data;
  const shown = role === "all" ? all : all.filter((user) => user.role === role);

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">사용자</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">관리자 계정 만들기</CardTitle>
          <CardDescription>
            임시 PIN이 정해지고, 새 관리자는 처음 로그인할 때 PIN을 바꿉니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateAdminForm onDone={refetch} />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {ROLE_TABS.map((tab) => (
            <Button
              key={tab}
              size="sm"
              variant={role === tab ? "default" : "outline"}
              onClick={() => setRole(tab)}
            >
              {tab === "all" ? "전체" : ROLE_LABELS[tab]}{" "}
              {tab === "all" ? all.length : all.filter((user) => user.role === tab).length}
            </Button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          PIN을 잊은 사용자는 임시 PIN으로 초기화합니다. 임시 PIN은 화면에 한 번만 보입니다.
          이름·소속을 바꾸면 로그인할 때 쓰는 이름·소속도 바뀝니다.
        </p>
        {users.query.isLoading ? (
          <p className="text-sm text-muted-foreground">불러오는 중…</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {shown.map((user) => {
              const name = user.name + (user.name_tag ?? "");
              const affiliation =
                user.role === "mentee"
                  ? user.mentee_profiles?.departments?.name
                  : user.role === "mentor"
                    ? user.mentor_profiles?.company
                    : null;
              return (
                <li key={user.id} className="flex flex-col gap-2 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{name}</span>
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
                    {user.id !== myId && (
                      <ResetPinButton userId={user.id} name={name} onDone={refetch} />
                    )}
                  </div>
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground">이름·소속 바꾸기</summary>
                    <IdentityForm
                      user={{
                        id: user.id,
                        name: user.name,
                        nameTag: user.name_tag,
                        departmentId: user.mentee_profiles?.department_id ?? null,
                      }}
                      departments={user.role === "mentee" ? departmentOptions : undefined}
                      onDone={refetch}
                    />
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
