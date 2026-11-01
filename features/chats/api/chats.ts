import type { AnswerRule } from "@/lib/chat/answer-length";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

// 1:1 톡방 조회 (docs/architecture.md 4.1 /chats, 6.4). RLS가 참여자와 관리자만 보이게 합니다.

const ROOM_SELECT =
  "id, created_at, last_message_at, semester:semesters(name, closed_at), " +
  "mentor:mentor_profiles(id, company, profile:profiles(name, name_tag)), " +
  "mentee:mentee_profiles(id, department:departments(name), profile:profiles(name, name_tag))";

type RoomRow = {
  id: number;
  created_at: string;
  last_message_at: string | null;
  semester: { name: string; closed_at: string | null } | null;
  mentor: { id: string; company: string; profile: { name: string; name_tag: string | null } | null } | null;
  mentee: {
    id: string;
    department: { name: string } | null;
    profile: { name: string; name_tag: string | null } | null;
  } | null;
};

export type RoomSummary = {
  id: number;
  semesterName: string;
  closed: boolean;
  lastMessageAt: string | null;
  mentor: { id: string | null; name: string; company: string };
  mentee: { id: string | null; name: string; department: string };
  unread: number;
};

function nameOf(profile: { name: string; name_tag: string | null } | null | undefined) {
  return profile ? profile.name + (profile.name_tag ?? "") : "(알 수 없음)";
}

function toSummary(row: RoomRow, unread: number): RoomSummary {
  return {
    id: row.id,
    semesterName: row.semester?.name ?? "",
    closed: Boolean(row.semester?.closed_at),
    lastMessageAt: row.last_message_at,
    mentor: { id: row.mentor?.id ?? null, name: nameOf(row.mentor?.profile), company: row.mentor?.company ?? "" },
    mentee: {
      id: row.mentee?.id ?? null,
      name: nameOf(row.mentee?.profile),
      department: row.mentee?.department?.name ?? "",
    },
    unread,
  };
}

async function unreadByRoom() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_unread_counts");
  return new Map((data ?? []).map((row) => [row.room_id, row.unread]));
}

/** 내가 참여한 톡방. 최근 메시지가 있는 방이 위로 옵니다. */
export async function listMyRooms(userId: string): Promise<RoomSummary[]> {
  const supabase = await createClient();
  const [{ data }, unread] = await Promise.all([
    supabase
      .from("chat_rooms")
      .select(ROOM_SELECT)
      .or(`mentor_id.eq.${userId},mentee_id.eq.${userId}`)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .returns<RoomRow[]>(),
    unreadByRoom(),
  ]);
  return (data ?? []).map((row) => toSummary(row, unread.get(row.id) ?? 0));
}

/** 상단 메뉴 뱃지용 안 읽은 메시지 합계 */
export async function getUnreadTotal(): Promise<number> {
  const unread = await unreadByRoom();
  let total = 0;
  for (const count of unread.values()) total += count;
  return total;
}

export type ChatMessage = Pick<
  Tables<"messages">,
  "id" | "room_id" | "sender_id" | "sender_role" | "body" | "created_at"
>;

/** 톡방 하나와 메시지. 참여자나 관리자가 아니면 null. */
export async function getRoom(id: number) {
  if (!Number.isInteger(id) || id < 1) return null;
  const supabase = await createClient();
  const { data: room } = await supabase
    .from("chat_rooms")
    .select(ROOM_SELECT)
    .eq("id", id)
    .returns<RoomRow[]>()
    .maybeSingle();
  if (!room) return null;

  const { data: messages } = await supabase
    .from("messages")
    .select("id, room_id, sender_id, sender_role, body, created_at")
    .eq("room_id", id)
    .is("hidden_at", null)
    .order("created_at", { ascending: true })
    .limit(500);

  return { room: toSummary(room, 0), messages: messages ?? [] };
}

export async function getAnswerRule(): Promise<AnswerRule> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("answer_min_length, answer_count_spaces")
    .maybeSingle();
  return {
    minLength: data?.answer_min_length ?? 50,
    countSpaces: data?.answer_count_spaces ?? false,
  };
}

/** 지금 질문을 받는 학기가 있는지 (현재 학기이고 종료되지 않음) */
export async function hasOpenSemester(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("semesters")
    .select("id")
    .eq("is_current", true)
    .is("closed_at", null)
    .maybeSingle();
  return Boolean(data);
}
