"use client";

import { useList, type HttpError } from "@refinedev/core";
import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/native-select";
import { SemesterSelect } from "@/features/admin/components/semester-select";
import { useSemesterPicker, useSemesterStats } from "@/features/admin/components/semester-stats";
import { formatTime } from "@/lib/chat/answer-length";

type RoomRow = {
  id: number;
  last_message_at: string | null;
  mentor_id: string;
  mentee: { profile: { name: string; name_tag: string | null } | null; department: { name: string } | null } | null;
};

// 질의응답 현황 (6.6 /admin/chats): 학기·구역·멘토로 걸러 멘토별 건수와 전체 톡방을 보고, 톡방을 열어 내용을 확인합니다.
export default function AdminChatsPage() {
  const { semesters, semesterId, setSemesterId } = useSemesterPicker();
  const { rows, error } = useSemesterStats(semesterId);
  const [college, setCollege] = useState("");
  const [query, setQuery] = useState("");
  const [mentorId, setMentorId] = useState<string | null>(null);

  const rooms = useList<RoomRow, HttpError>({
    resource: "chat_rooms",
    pagination: { mode: "off" },
    filters: semesterId ? [{ field: "semester_id", operator: "eq", value: semesterId }] : [],
    sorters: [{ field: "last_message_at", order: "desc" }],
    meta: { select: "id, last_message_at, mentor_id, mentee:mentee_profiles(profile:profiles(name, name_tag), department:departments(name))" },
    queryOptions: { enabled: Boolean(semesterId) },
  });

  const colleges = [...new Set(rows.map((r) => r.collegeName).filter(Boolean))] as string[];
  const shown = rows.filter(
    (r) =>
      (!college || r.collegeName === college) &&
      (!query || `${r.name} ${r.company}`.toLowerCase().includes(query.toLowerCase())),
  );
  const shownIds = new Set(shown.map((r) => r.mentorId));
  const nameOf = new Map(rows.map((r) => [r.mentorId, r.name]));
  const roomList = rooms.result.data.filter((room) => (mentorId ? room.mentor_id === mentorId : shownIds.has(room.mentor_id)));
  const total = shown.reduce(
    (sum, r) => ({ rooms: sum.rooms + r.roomCount, q: sum.q + r.questionCount, a: sum.a + r.answerCount }),
    { rooms: 0, q: 0, a: 0 },
  );

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">질의응답 현황</h1>
      <div className="grid gap-2 sm:grid-cols-[auto_auto_1fr]">
        <SemesterSelect semesters={semesters} value={semesterId} onChange={(id) => { setSemesterId(id); setMentorId(null); }} />
        <Select value={college} onChange={(e) => setCollege(e.target.value)} aria-label="구역" className="sm:w-48">
          <option value="">모든 구역</option>
          {colleges.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="멘토 이름·기업 검색" aria-label="멘토 검색" />
      </div>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <p className="text-sm text-muted-foreground">
        톡방 {total.rooms}개 · 질문 {total.q}건 · 답변 {total.a}건 (관리자가 숨긴 메시지는 세지 않습니다)
      </p>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2">멘토</th><th className="p-2">구역</th>
              <th className="p-2 text-right">톡방</th><th className="p-2 text-right">질문</th>
              <th className="p-2 text-right">답변</th><th className="p-2">마지막 답변</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {shown.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">이 학기에 톡방이 없습니다.</td></tr>
            )}
            {shown.map((r) => (
              <tr key={r.mentorId} className={mentorId === r.mentorId ? "bg-accent" : undefined}>
                <td className="p-2">
                  <button type="button" onClick={() => setMentorId(mentorId === r.mentorId ? null : r.mentorId)} className="text-left underline-offset-4 hover:underline">
                    {r.name} <span className="text-xs text-muted-foreground">{r.company}</span>
                  </button>
                </td>
                <td className="p-2">{r.collegeName ?? "-"}</td>
                <td className="p-2 text-right">{r.roomCount}</td>
                <td className="p-2 text-right">{r.questionCount}</td>
                <td className="p-2 text-right">{r.answerCount}</td>
                <td className="p-2 text-xs">{r.lastAnswerAt ? formatTime(r.lastAnswerAt) : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="font-medium">
        톡방 {roomList.length}개{mentorId ? ` · ${nameOf.get(mentorId)} 멘토` : ""}
      </h2>
      <ul className="divide-y rounded-md border">
        {roomList.map((room) => (
          <li key={room.id}>
            <Link href={`/chats/${room.id}`} className="flex flex-wrap items-center gap-2 p-3 text-sm hover:bg-accent">
              <span className="font-medium">{nameOf.get(room.mentor_id) ?? "멘토"}</span>
              <span className="text-muted-foreground">↔</span>
              <span>
                {room.mentee?.profile ? room.mentee.profile.name + (room.mentee.profile.name_tag ?? "") : "멘티"}
              </span>
              <span className="text-xs text-muted-foreground">{room.mentee?.department?.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {room.last_message_at ? formatTime(room.last_message_at) : "메시지 없음"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
