import { Suspense } from "react";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { requireRole } from "@/lib/auth/current-user";

// 관리자가 아니면 "페이지를 찾을 수 없음". 데이터 권한은 RLS와 admin-users가 다시 확인합니다.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className="py-6 text-sm text-muted-foreground">불러오는 중…</p>}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}

async function AdminGate({ children }: { children: React.ReactNode }) {
  await requireRole("admin");
  return <AdminShell>{children}</AdminShell>;
}
