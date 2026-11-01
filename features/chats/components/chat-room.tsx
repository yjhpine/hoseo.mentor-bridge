"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/features/chats/api/chats";
import { answerLength, formatTime, type AnswerRule } from "@/lib/chat/answer-length";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth/roles";

type Props = {
  roomId: number;
  myId: string;
  /** 관리자는 읽기만 합니다. */
  myRole: UserRole;
  closed: boolean;
  rule: AnswerRule;
  initialMessages: ChatMessage[];
};

// 1:1 톡방 (docs/architecture.md 3.3, 4.2, 8장).
// 새 메시지는 Supabase Realtime으로 받고, 보내기는 브라우저 클라이언트로 messages에 바로 넣습니다.
// 멘토 답변 길이는 여기서 먼저 막고, DB 트리거가 다시 검사합니다.
export function ChatRoom({ roomId, myId, myRole, closed, rule, initialMessages }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isMentor = myRole === "mentor";
  const canWrite = !closed && myRole !== "admin";
  const length = answerLength(body, rule.countSpaces);
  const tooShort = isMentor && length < rule.minLength;

  // 관리자: 부적절한 메시지를 숨기거나 되돌립니다 (6.4). 숨긴 메시지는 참여자에게 보이지 않고 건수에서도 빠집니다.
  async function toggleHidden(message: ChatMessage) {
    const hidden_at = message.hidden_at ? null : new Date().toISOString();
    const { error: updateError } = await supabase.from("messages").update({ hidden_at }).eq("id", message.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMessages((current) => current.map((m) => (m.id === message.id ? { ...m, hidden_at } : m)));
  }

  function addMessage(message: ChatMessage) {
    setMessages((current) =>
      current.some((m) => m.id === message.id) ? current : [...current, message],
    );
  }

  // 상대 메시지를 실시간으로 받습니다. Realtime도 RLS를 따라 참여자·관리자만 받습니다.
  useEffect(() => {
    // supabase-js 요청은 결과를 기다려야(then) 보내지므로 .then()을 붙입니다.
    const markRead = () => {
      if (myRole !== "admin") void supabase.rpc("mark_room_read", { room_id: roomId }).then();
    };
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          addMessage(payload.new as ChatMessage);
          markRead();
        },
      )
      .subscribe();
    markRead();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, roomId, myRole]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim() || tooShort || sending) return;
    setSending(true);
    setError(null);
    const { data, error: insertError } = await supabase
      .from("messages")
      .insert({ room_id: roomId, body: body.trim() })
      .select("id, room_id, sender_id, sender_role, body, created_at, hidden_at")
      .single();
    setSending(false);
    if (insertError) {
      setError(insertError.message || "보내지 못했습니다.");
      return;
    }
    addMessage(data);
    setBody("");
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-3" aria-live="polite">
        {messages.length === 0 && (
          <li className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {myRole === "mentee" ? "궁금한 것을 편하게 물어보세요." : "아직 메시지가 없습니다."}
          </li>
        )}
        {messages.map((message) => {
          const mine = message.sender_id === myId;
          return (
            <li key={message.id} className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
              <span className="text-xs text-muted-foreground">
                {message.sender_role === "mentor" ? "멘토" : "멘티"} · {formatTime(message.created_at)}
                {message.hidden_at && " · 숨김"}
              </span>
              <p
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm leading-relaxed",
                  mine ? "bg-primary text-primary-foreground" : "bg-muted",
                  message.hidden_at && "opacity-50 line-through",
                )}
              >
                {message.body}
              </p>
              {myRole === "admin" && (
                <button
                  type="button"
                  onClick={() => toggleHidden(message)}
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  {message.hidden_at ? "숨김 해제" : "숨기기"}
                </button>
              )}
            </li>
          );
        })}
      </ol>
      <div ref={bottomRef} />

      {closed ? (
        <p className="rounded-md border p-3 text-center text-sm text-muted-foreground">
          종료된 학기의 톡방입니다. 내용은 볼 수 있지만 새 메시지는 쓸 수 없습니다.
        </p>
      ) : !canWrite ? (
        <p className="rounded-md border p-3 text-center text-sm text-muted-foreground">
          관리자는 톡방 내용을 읽기만 합니다.
        </p>
      ) : (
        <form onSubmit={send} className="sticky bottom-0 flex flex-col gap-2 border-t bg-background py-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={5000}
            rows={isMentor ? 5 : 3}
            placeholder={isMentor ? `답변은 공백을 빼고 ${rule.minLength}자 이상 써 주세요.` : "질문을 입력하세요."}
            aria-label="메시지"
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
          />
          <div className="flex items-center justify-between gap-2">
            {isMentor ? (
              <span className={cn("text-sm", tooShort ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                {length} / {rule.minLength}자{!rule.countSpaces && " (공백 제외)"}
              </span>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={sending || !body.trim() || tooShort}>
              {sending ? "보내는 중…" : "보내기"}
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
