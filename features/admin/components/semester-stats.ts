"use client";

import { useList, type HttpError } from "@refinedev/core";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";

// 관리자 운영 화면(질의응답 현황·강사료·만족도)이 함께 쓰는 학기 선택과 멘토별 통계 (6.6)

export type Semester = Tables<"semesters">;
export type MentorRow = Omit<Tables<"mentor_directory">, "id"> & { id: string };

export type MentorStats = {
  mentorId: string;
  name: string;
  company: string;
  collegeName: string | null;
  roomCount: number;
  questionCount: number;
  answerCount: number;
  lastAnswerAt: string | null;
};

/** 학기 목록과 고른 학기. 처음에는 현재 학기, 없으면 가장 최근 학기를 고릅니다. */
export function useSemesterPicker() {
  const list = useList<Semester, HttpError>({
    resource: "semesters",
    pagination: { mode: "off" },
    sorters: [{ field: "starts_on", order: "desc" }],
  });
  const semesters = list.result.data;
  const [picked, setPicked] = useState<number | null>(null);
  const fallback = semesters.find((s) => s.is_current)?.id ?? semesters[0]?.id ?? null;
  const semesterId = picked ?? fallback;
  return {
    semesters,
    semester: semesters.find((s) => s.id === semesterId) ?? null,
    semesterId,
    setSemesterId: setPicked,
    loading: list.query.isLoading,
  };
}

/** 고른 학기의 멘토별 톡방·질문·답변 수 (admin_semester_stats). 톡방이 없던 멘토는 빠집니다. */
export function useSemesterStats(semesterId: number | null) {
  const mentors = useList<MentorRow, HttpError>({
    resource: "mentor_directory",
    pagination: { mode: "off" },
    sorters: [{ field: "name", order: "asc" }],
  });
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchStats>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!semesterId) return;
    let cancelled = false;
    fetchStats(semesterId)
      .then((rows) => !cancelled && setStats(rows))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [semesterId, version]);

  const rows = useMemo<MentorStats[]>(() => {
    const byId = new Map(mentors.result.data.map((m) => [m.id, m]));
    return stats
      .map((s) => {
        const mentor = byId.get(s.mentor_id);
        return {
          mentorId: s.mentor_id,
          name: mentor ? (mentor.name ?? "") + (mentor.name_tag ?? "") : "(알 수 없음)",
          company: mentor?.company ?? "",
          collegeName: mentor?.college_name ?? null,
          roomCount: s.room_count,
          questionCount: s.question_count,
          answerCount: s.answer_count,
          lastAnswerAt: s.last_answer_at,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [stats, mentors.result.data]);

  return { rows, error, reload: () => setVersion((v) => v + 1) };
}

async function fetchStats(semesterId: number) {
  const { data, error } = await createClient().rpc("admin_semester_stats", { semester_id: semesterId });
  if (error) throw new Error(error.message);
  return data ?? [];
}
