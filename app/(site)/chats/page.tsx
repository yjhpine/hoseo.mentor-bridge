import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { listMyRooms } from "@/features/chats/api/chats";
import { RoomList } from "@/features/chats/components/room-list";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "톡방" };

// 내 톡방 목록 (4.1 /chats, 멘티·멘토). 관리자의 전체 톡방 보기는 5단계 /admin/chats에서 만듭니다.
export default function Page() {
  return (
    <div className="flex flex-col gap-4 py-6">
      <h1 className="text-2xl font-semibold">톡방</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
        <MyRooms />
      </Suspense>
    </div>
  );
}

async function MyRooms() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  if (user.role === "admin") redirect("/admin");
  const rooms = await listMyRooms(user.id);
  return <RoomList rooms={rooms} viewer={user.role} />;
}
