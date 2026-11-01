import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { RoomSummary } from "@/features/chats/api/chats";
import { formatTime } from "@/lib/chat/answer-length";
import type { UserRole } from "@/lib/auth/roles";

/** 톡방 목록. 멘티에게는 멘토를, 멘토에게는 멘티를 보여 줍니다. */
export function RoomList({ rooms, viewer }: { rooms: RoomSummary[]; viewer: UserRole }) {
  if (rooms.length === 0) {
    return (
      <p className="rounded-lg border p-8 text-center text-muted-foreground">
        {viewer === "mentor"
          ? "아직 받은 질문이 없습니다."
          : "아직 톡방이 없습니다. 멘토 상세에서 \"질문하기\"를 누르면 톡방이 열립니다."}
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-md border">
      {rooms.map((room) => {
        const other =
          viewer === "mentor"
            ? { name: room.mentee.name, sub: room.mentee.department }
            : { name: room.mentor.name, sub: room.mentor.company };
        return (
          <li key={room.id}>
            <Link href={`/chats/${room.id}`} className="flex items-center gap-3 p-4 transition-colors hover:bg-accent">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{other.name}</span>
                  <span className="truncate text-sm text-muted-foreground">{other.sub}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {room.semesterName}
                  {room.closed && " · 종료"}
                  {room.lastMessageAt ? ` · ${formatTime(room.lastMessageAt)}` : " · 메시지 없음"}
                </p>
              </div>
              {room.unread > 0 && <Badge aria-label={`안 읽은 메시지 ${room.unread}개`}>{room.unread}</Badge>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
