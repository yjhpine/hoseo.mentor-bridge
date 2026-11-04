import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAnswerRule, getRoom } from "@/features/chats/api/chats";
import { ChatRoom } from "@/features/chats/components/chat-room";
import { MentorAvatar } from "@/features/mentors/components/mentor-card";
import { getCurrentUser } from "@/lib/auth/current-user";

type Params = Promise<{ roomId: string }>;

export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className="py-6 text-sm text-muted-foreground">불러오는 중…</p>}>
      <Room params={params} />
    </Suspense>
  );
}

// 1:1 톡방 (4.1 /chats/[roomId]): 해당 멘티·멘토, 관리자(읽기)
async function Room({ params }: { params: Params }) {
  const { roomId } = await params;
  const [user, data, rule] = await Promise.all([
    getCurrentUser(),
    getRoom(Number(roomId)),
    getAnswerRule(),
  ]);
  if (!user || !data) {
    notFound();
  }
  const { room, people, messages } = data;
  const isMentor = user.id === room.mentor.id;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 py-6">
      <header className="flex flex-col gap-1 border-b pb-3">
        <Link href="/chats" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          ← 톡방 목록
        </Link>
        <div className="flex items-center gap-3">
          <MentorAvatar
            src={isMentor ? people.mentee.photoUrl : people.mentor.photoUrl}
            name={isMentor ? people.mentee.name : people.mentor.name}
            size={44}
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            {isMentor ? (
              <h1 className="text-xl font-semibold">
                {room.mentee.name} <span className="text-sm font-normal text-muted-foreground">{room.mentee.department}</span>
              </h1>
            ) : (
              <h1 className="text-xl font-semibold">
                {room.mentor.id ? (
                  <Link href={`/mentors/${room.mentor.id}`} className="underline-offset-4 hover:underline">
                    {room.mentor.name}
                  </Link>
                ) : (
                  room.mentor.name
                )}{" "}
                <span className="text-sm font-normal text-muted-foreground">{room.mentor.company}</span>
                {user.role === "admin" && (
                  <span className="text-sm font-normal text-muted-foreground"> · 멘티 {room.mentee.name}</span>
                )}
              </h1>
            )}
            <p className="text-xs text-muted-foreground">{room.semesterName} 학기 톡방</p>
          </div>
        </div>
      </header>
      <ChatRoom
        roomId={room.id}
        myId={user.id}
        myRole={user.role}
        closed={room.closed}
        rule={rule}
        initialMessages={messages}
        people={people}
      />
    </div>
  );
}
